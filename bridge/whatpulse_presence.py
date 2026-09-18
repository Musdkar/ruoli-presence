#!/usr/bin/env python3
"""Publish privacy-safe WhatPulse aggregates for ruoli-presence.

One local publisher handles both Home cards:
- Software / today: raw ActivityWatch foreground-window duration. AFK is intentionally
  NOT intersected, so reading, thinking, and watching video still count.
- Keyboard / today: coarse 0..15 per-key heat from WhatPulse, never exact counts.

ActivityWatch window titles/URLs never leave the machine; only app names and summed
durations are published. The WhatPulse SQLite database is opened read-only with
query_only enabled. No key order, hourly buckets, or raw rows leave the machine.
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import socket
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

API_URL = os.environ.get("WHATPULSE_API_URL", "").strip()
TOKEN = os.environ.get("INGEST_TOKEN", "").strip()
ACTIVITYWATCH_API_URL = os.environ.get(
    "ACTIVITYWATCH_API_URL", "http://127.0.0.1:5600/api/0"
).strip().rstrip("/")

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


def aw_get(path: str, params: dict[str, object] | None = None):
    url = ACTIVITYWATCH_API_URL + path
    if params:
        url += "?" + urlparse.urlencode(params)
    # Never send localhost ActivityWatch traffic through a configured proxy.
    opener = urlrequest.build_opener(urlrequest.ProxyHandler({}))
    req = urlrequest.Request(url, headers={"Accept": "application/json"})
    with opener.open(req, timeout=4) as response:
        return json.loads(response.read().decode("utf-8"))


def parse_aw_timestamp(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def read_software(target: str) -> dict | None:
    """Sum raw foreground-window duration by application.

    Deliberately does not query/intersect aw-watcher-afk: foreground reading,
    thinking, presentations, and video playback should continue to count.
    """
    day = date.fromisoformat(target)
    local_tz = datetime.now().astimezone().tzinfo
    start_local = datetime.combine(day, time.min, tzinfo=local_tz)
    end_local = start_local + timedelta(days=1)
    now = datetime.now().astimezone()
    if start_local <= now < end_local:
        end_local = now

    start_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc)

    buckets = aw_get("/buckets/")
    if not isinstance(buckets, dict):
        raise RuntimeError("ActivityWatch returned an invalid bucket list")

    hostname = socket.gethostname()
    candidates: list[tuple[str, dict]] = []
    for bucket_id, meta in buckets.items():
        if not isinstance(meta, dict):
            continue
        client = str(meta.get("client") or "")
        if client == "aw-watcher-window" or str(bucket_id).startswith("aw-watcher-window_"):
            candidates.append((str(bucket_id), meta))

    if not candidates:
        raise RuntimeError("No ActivityWatch aw-watcher-window bucket found")

    same_host = [
        item for item in candidates
        if str(item[1].get("hostname") or "") == hostname
    ]
    pool = same_host or candidates
    pool.sort(key=lambda item: str(item[1].get("created") or ""), reverse=True)
    bucket_id = pool[0][0]

    events = aw_get(
        "/buckets/" + urlparse.quote(bucket_id, safe="") + "/events",
        {
            "start": start_utc.isoformat().replace("+00:00", "Z"),
            "end": end_utc.isoformat().replace("+00:00", "Z"),
            "limit": -1,
        },
    )
    if not isinstance(events, list):
        raise RuntimeError("ActivityWatch returned invalid window events")

    seconds_by_app: dict[str, float] = defaultdict(float)
    for event in events:
        if not isinstance(event, dict):
            continue
        data = event.get("data")
        if not isinstance(data, dict):
            continue
        app = str(data.get("app") or "").strip()
        if not app or app.lower() in {"activitywatch", "aw-qt"}:
            continue
        try:
            duration = max(0.0, float(event.get("duration") or 0))
        except (TypeError, ValueError):
            continue
        event_start = parse_aw_timestamp(event.get("timestamp"))
        if event_start is None:
            continue
        if event_start.tzinfo is None:
            event_start = event_start.replace(tzinfo=timezone.utc)
        else:
            event_start = event_start.astimezone(timezone.utc)
        event_end = event_start + timedelta(seconds=duration)
        overlap = max(
            0.0,
            (min(event_end, end_utc) - max(event_start, start_utc)).total_seconds(),
        )
        if overlap > 0:
            seconds_by_app[app] += overlap

    apps = [
        {"name": name, "minutes": round(seconds / 60.0, 1)}
        for name, seconds in sorted(
            seconds_by_app.items(), key=lambda item: item[1], reverse=True
        )[:8]
        if seconds >= 6
    ]
    return {"date": target, "apps": apps} if apps else None


def read_keyboard(con: sqlite3.Connection, target: str) -> dict | None:
    freq_columns = {row[1] for row in con.execute("PRAGMA table_info(keypress_frequency)")}
    if not {"day", "key", "count"}.issubset(freq_columns):
        raise RuntimeError("Unsupported WhatPulse schema: keypress_frequency changed")

    total_columns = {row[1] for row in con.execute("PRAGMA table_info(keypresses)")}
    if not {"day", "count"}.issubset(total_columns):
        raise RuntimeError("Unsupported WhatPulse schema: keypresses changed")

    total_row = con.execute(
        "SELECT COALESCE(SUM(count), 0) FROM keypresses WHERE day = ?",
        (target,),
    ).fetchone()
    total = max(0, int((total_row or [0])[0] or 0))

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
    for raw_code, raw_count in rows:
        try:
            code = int(raw_code)
            count = max(0, int(raw_count or 0))
        except (TypeError, ValueError):
            continue
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

    try:
        TOKEN.encode("ascii")
    except UnicodeEncodeError as exc:
        raise SystemExit(
            "INGEST_TOKEN must be the real ASCII token value, not a placeholder such as '你的token'."
        ) from exc

    today = date.today()
    software_day = env_date("SOFTWARE_DATE", today)
    keyboard_day = env_date("KEYBOARD_DATE", today)

    software = None
    keyboard = None

    try:
        software = read_software(software_day)
    except Exception as exc:
        print(f"warning: ActivityWatch software aggregate unavailable: {exc}", file=sys.stderr)

    try:
        con = open_readonly(default_db_path())
        try:
            keyboard = read_keyboard(con, keyboard_day)
        finally:
            con.close()
    except Exception as exc:
        print(f"warning: WhatPulse keyboard aggregate unavailable: {exc}", file=sys.stderr)

    payload = {}
    if software:
        payload["software"] = software
    if keyboard:
        payload["keyboard"] = keyboard
    if not payload:
        raise SystemExit("No WhatPulse aggregate data found for the requested dates.")

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urlrequest.Request(
        API_URL,
        data=body,
        method="POST",
        headers={
            "X-Ingest-Token": TOKEN,
            "Content-Type": "application/json",
        },
    )
    try:
        with urlrequest.urlopen(req, timeout=15) as response:
            status = response.status
            response_text = response.read(2000).decode("utf-8", errors="replace")
    except urlerror.HTTPError as exc:
        response_text = exc.read(500).decode("utf-8", errors="replace")
        raise SystemExit(f"publish failed: {exc.code} {response_text}") from exc
    except urlerror.URLError as exc:
        raise SystemExit(f"publish failed: {exc.reason}") from exc

    if not 200 <= status < 300:
        raise SystemExit(f"publish failed: {status} {response_text}")

    preview = {
        "software": software,
        "keyboard": None if keyboard is None else {
            "date": keyboard["date"],
            "total": keyboard["total"],
            "heat": keyboard["heat"],
        },
    }
    print(json.dumps(preview, ensure_ascii=False, indent=2))
    try:
        server_result = json.loads(response_text) if response_text else {}
    except json.JSONDecodeError:
        server_result = {}
    print("published:", status, server_result.get("updated", server_result))


if __name__ == "__main__":
    main()
