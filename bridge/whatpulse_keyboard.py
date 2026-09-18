#!/usr/bin/env python3
"""Publish yesterday's privacy-safe WhatPulse keyboard aggregate.

Reads WhatPulse's local SQLite database in read-only mode, collapses all hourly
per-key counters for *yesterday* into one daily total, and sends only
{date, total, keys} to /api/keyboard. No key order, window titles, application
names, hourly buckets, URLs, or raw database rows leave the Mac.
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
from datetime import date, timedelta
from pathlib import Path

import requests

API_URL = os.environ.get("KEYBOARD_API_URL", "").strip()
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

# Qt swaps the semantic Control/Meta names on Apple platforms so that standard
# shortcuts remain portable. Map them back to the labels a Mac user sees.
if sys.platform == "darwin":
    SPECIAL[16777249] = "COMMAND"
    SPECIAL[16777250] = "CONTROL"
else:
    SPECIAL[16777249] = "CONTROL"
    SPECIAL[16777250] = "COMMAND"

ALLOWED_PRINTABLE = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-= []\\;'\x60,./")


def default_db_path() -> Path:
    override = os.environ.get("WHATPULSE_DB")
    if override:
        return Path(override).expanduser()

    if sys.platform == "darwin":
        return Path.home() / "Library/Application Support/WhatPulse/whatpulse.db"
    if os.name == "nt":
        local = os.environ.get("LOCALAPPDATA", "")
        return Path(local) / "WhatPulse/whatpulse.db"
    return Path.home() / ".config/whatpulse/whatpulse.db"


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


def read_yesterday(db_path: Path) -> dict:
    if not db_path.is_file():
        raise RuntimeError(f"WhatPulse database not found: {db_path}")

    # Path.as_uri() plus mode=ro prevents accidental writes/journals.
    uri = db_path.resolve().as_uri() + "?mode=ro"
    con = sqlite3.connect(uri, uri=True, timeout=3)
    try:
        con.execute("PRAGMA query_only = ON")
        columns = {row[1] for row in con.execute("PRAGMA table_info(keypress_frequency)")}
        required = {"day", "key", "count"}
        if not required.issubset(columns):
            raise RuntimeError(
                "Unsupported WhatPulse schema: keypress_frequency is missing "
                + ", ".join(sorted(required - columns))
            )

        target = (date.today() - timedelta(days=1)).isoformat()
        rows = con.execute(
            """
            SELECT key, SUM(count)
            FROM keypress_frequency
            WHERE day = ?
            GROUP BY key
            """,
            (target,),
        ).fetchall()

        keys: dict[str, int] = {}
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
                keys[label] = keys.get(label, 0) + count

        if total <= 0 or not keys:
            raise RuntimeError(f"No keyboard data found for {target}")

        return {"date": target, "total": total, "keys": keys}
    finally:
        con.close()


def main() -> None:
    if not API_URL or not TOKEN:
        raise SystemExit("Set KEYBOARD_API_URL and INGEST_TOKEN before running.")

    payload = read_yesterday(default_db_path())
    response = requests.post(
        API_URL,
        headers={"X-Ingest-Token": TOKEN, "Content-Type": "application/json"},
        json=payload,
        timeout=15,
    )
    if not response.ok:
        raise SystemExit(f"publish failed: {response.status_code} {response.text[:500]}")

    print(json.dumps(payload, ensure_ascii=False, indent=2))
    print("published:", response.status_code)


if __name__ == "__main__":
    main()
