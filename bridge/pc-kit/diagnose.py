#!/usr/bin/env python3
"""Read-only baseline checks. Never uploads data or reads credentials."""
import json
import platform
from pathlib import Path
import sqlite3
import subprocess
import urllib.request

print('OS:', platform.system(), platform.release(), 'CPU:', platform.machine())
print('Python:', platform.python_version())
for label, command in [('Node', ['node', '--version'])]:
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=5)
        print(label + ':', result.stdout.strip() or 'not available')
    except OSError:
        print(label + ': not found; use absolute path in config')
try:
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    buckets = json.load(opener.open('http://127.0.0.1:5600/api/0/buckets/', timeout=5))
    windows = [v for k, v in buckets.items() if v.get('client') == 'aw-watcher-window' or k.startswith('aw-watcher-window_')]
    print('ActivityWatch: reachable; window buckets:', len(windows))
except Exception as exc:
    print('ActivityWatch: unavailable:', type(exc).__name__, '(start the app and check port 5600)')
root = Path(__file__).resolve().parents[2]
np = root / 'bridge/nowplaying/nowplaying-cli'
if np.is_file():
    result = subprocess.run(['file', str(np)], capture_output=True, text=True)
    print('Now Playing architecture:', result.stdout.strip())
else:
    print('Now Playing: not bundled; build on target, then test both music apps')
if platform.system() == 'Darwin':
    db = Path.home() / 'Library/Application Support/WhatPulse/whatpulse.db'
else:
    import os
    db = Path(os.environ.get('LOCALAPPDATA', '')) / 'WhatPulse/whatpulse.db'
try:
    with sqlite3.connect(db.resolve().as_uri() + '?mode=ro', uri=True) as con:
        con.execute('PRAGMA query_only=ON')
        for table, expected in [('keypresses', {'day', 'count'}), ('keypress_frequency', {'day', 'key', 'count'})]:
            columns = {row[1] for row in con.execute('PRAGMA table_info(' + table + ')')}
            print('WhatPulse', table + ':', 'OK' if expected <= columns else 'schema mismatch')
except sqlite3.Error:
    print('WhatPulse: database unavailable; install/start and check permissions')
