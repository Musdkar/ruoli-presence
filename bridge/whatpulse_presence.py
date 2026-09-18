#!/usr/bin/env python3
"""Publish privacy-safe WhatPulse aggregates for ruoli-presence.

One local collector handles both Home cards:
- Software / today: per-application foreground active time.
- Keyboard / yesterday: coarse 0..15 per-key heat, never exact per-key counts.

The WhatPulse SQLite database is opened read-only and with query_only enabled.
No window titles, URLs, key order, hourly buckets, or raw rows leave the Mac.
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

import requests

API_URL = os.environ.get("WHATPULSE_API_URL", "").strip()
TOKEN = os.environ.get("INGEST_TOKEN", "").strip()

SPECIAL = {
    16777216: "ESC",
    16777217: "TAB",
    16777219: "BACKSPACE",
    16777220: "RETURN",
    16777221: "RETURN",
    16777234: "LEFT",
    16777235: "UP",
    16777236: "RIGHT",
    16777237: "DOWN",
    16777248: "SHIFT",
    16777251: "OPTION",
    16777252: "CAPS",
}

# WhatPulse/Qt uses platform semantic modifier codes; label them as a Mac user sees them.
if sys.platform == "darwin":
    SPECIAL[16777249] = "COMMAND"
    SPECIAL[16777250] = "CONTROL"
else:
    SPECIAL[16777249] = "CONTROL"
    SPECIAL[16777250] = "COMMAND"

ALLOWED_PRINTABLE = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-= []\\;'\x60,./")


def default_db_path() -> Path:
    override = os.environ.get("WHATPULSE_DB", "").strip()
    if override:
        return Path(override).expanduser()

    if sys.platform == "darwin":
        return Path.home() / "Library/Application Support/WhatPulse/whatpulse.db"
    if os.name == "nt":
        return Path(os.environ.get("LOCALAPPDATA", "")) / "WhatPulse/whatpulse.db"
    return Path.home() / ".config/whatpulse/whatpulse.db"


def open_readonly(db_path: Path) -> sqlite3.Connection:
    if not db_path.is_file():
        raise RuntimeError(f"WhatPulse database not found: {db_path}")
    con = sqlite3.connect(db_path.resolve().as_uri() + "?mode=ro", uri=True, timeout=3)
    con.execute("PRAGMA query_only = ON")
    return con


def env_date(name: str, fallback: date) -> str:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return fallback.isoformat()
    try:
        return date.fromisoformat(raw).isoformat()
    except ValueError as exc:
        raise RuntimeError(f"{name} must be YYYY-MM-DD") from exc


def canonical_key(code: int) -> str | None:
    if code in SPECIAL:
        return SPECIAL[code]
    if 32 <= code <= 126:
        char = chr(code)
        if char == " ":
            return "SPACE"
        char = char.upper() if "a" <= char <= "z" else char
        return char if char in ALLOWED_PRINTABLE else None
    return None


def read_software(con: sqlite3.Connection, target: str) -> dict | None:
    columns = {row[1] for row in con.execute("PRAGMA table_info(application_active_hour)")}
    if not {"day", "path", "msec_active"}.issubset(columns):
        raise RuntimeError("Unsupported WhatPulse schema: application_active_hour changed")

    app_columns = {row[1] for row in con.execute("PRAGMA table_info(applications)")}
    if not {"path", "name"}.issubset(app_columns):
        raise RuntimeError("Unsupported WhatPulse schema: applications changed")

    rows = con.execute(
        """
        SELECT a.name, h.path, SUM(h.msec_active)
        FROM application_active_hour h
        JOIN applications a ON a.path = h.path
        WHERE h.day = ?
        GROUP BY a.name, h.path
        ORDER BY SUM(h.msec_active) DESC
        """,
        (target,),
    ).fetchall()

    # The same display name can appear under more than one executable path.
    minutes_by_name: dict[str, float] = defaultdict(float)
    for raw_name, _path, raw_msec in rows:
        name = str(raw_name or "").strip()
        try:
            minutes = float(raw_msec or 0) / 60000.0
        except (TypeError, ValueError):
            continue
        if not name or minutes < 0.1:
            continue
        minutes_by_name[name] += minutes

    apps = [
        {"name": name, "minutes": round(minutes, 1)}
        for name, minutes in sorted(minutes_by_name.items(), key=lambda item: item[1], reverse=True)[:8]
    ]
    return {"date": target, "apps": apps} if apps else None


def read_keyboard(con: sqlite3.Connection, target: str) -> dict | None:
    columns = {row[1] for row in con.execute("PRAGMA table_info(keypress_frequency)")}
    if not {"day", "key", "count"}.issubset(columns):
        raise RuntimeError("Unsupported WhatPulse schema: keypress_frequency changed")

    rows = con.execute(
        """
        SELECT key, SUM(count)
        FROM keypress_frequency
        WHERE day = ?
        GROUP BY key
        """,
        (target,),
    ).fetchall()

    exact: dict[str, int] = {}
    total = 0
    for raw_code, raw_count in rows:
        try:
            code = int(raw_code)
            count = max(0, int(raw_count or 0))
        except (TypeError, ValueError):
            continue
        total += count
        label = canonical_key(code)
        if label is not None:
            exact[label] = exact.get(label, 0) + count

    if total <= 0 or not exact:
        return None

    peak = max(exact.values())
    heat = {
        label: max(1, min(15, round(((count / peak) ** 0.5) * 15)))
        for label, count in exact.items()
        if count > 0
    }
    return {"date": target, "total": total, "heat": heat}


def main() -> None:
    if not API_URL or not TOKEN:
        raise SystemExit("Set WHATPULSE_API_URL and INGEST_TOKEN before running.")

    today = date.today()
    software_day = env_date("SOFTWARE_DATE", today)
    keyboard_day = env_date("KEYBOARD_DATE", today - timedelta(days=1))

    con = open_readonly(default_db_path())
    try:
        software = read_software(con, software_day)
        keyboard = read_keyboard(con, keyboard_day)
    finally:
        con.close()

    payload = {}
    if software:
        payload["software"] = software
    if keyboard:
        payload["keyboard"] = keyboard
    if not payload:
        raise SystemExit("No WhatPulse aggregate data found for the requested dates.")

    response = requests.post(
        API_URL,
        headers={"X-Ingest-Token": TOKEN, "Content-Type": "application/json"},
        json=payload,
        timeout=15,
    )
    if not response.ok:
        raise SystemExit(f"publish failed: {response.status_code} {response.text[:500]}")

    preview = {
        "software": software,
        "keyboard": None if keyboard is None else {
            "date": keyboard["date"],
            "total": keyboard["total"],
            "heat": keyboard["heat"],
        },
    }
    print(json.dumps(preview, ensure_ascii=False, indent=2))
    print("published:", response.status_code)


if __name__ == "__main__":
    main()
