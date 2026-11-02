#!/usr/bin/env python3
"""Run one collector with credentials from an owner-only JSON file."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    if len(sys.argv) != 3 or sys.argv[2] not in ('whatpulse', 'music'):
        raise SystemExit('Usage: run_bridge.py /private/bridge.json whatpulse|music')
    config_path = Path(sys.argv[1]).expanduser().resolve()
    if os.name != 'nt' and config_path.stat().st_mode & 0o077:
        raise SystemExit('Private config must have mode 0600 (chmod 600).')
    config = json.loads(config_path.read_text())
    token = config.get('INGEST_TOKEN', '')
    if not isinstance(token, str) or not token or token.startswith('REPLACE') or not token.isascii():
        raise SystemExit('Set the real INGEST_TOKEN in the private JSON file.')
    device = config.get('DEVICE')
    if device not in ('mac-intel', 'win', 'mac'):
        raise SystemExit('DEVICE must be mac-intel, win, or mac.')
    root = Path(config.get('REPO_ROOT') or Path(__file__).resolve().parents[2]).expanduser().resolve()
    env = os.environ.copy()
    for key, value in config.items():
        if key not in ('REPO_ROOT', 'NODE') and isinstance(value, str):
            env[key] = value
    if sys.argv[2] == 'whatpulse':
        command = [sys.executable, str(root / 'bridge/whatpulse_presence.py')]
    else:
        if sys.platform != 'darwin':
            raise SystemExit('This music collector requires macOS. Windows music is not implemented.')
        node = config.get('NODE') or shutil.which('node')
        if not node:
            raise SystemExit('Set NODE to the absolute Node.js path in private config.')
        command = [node, str(root / 'bridge/music_presence.mjs')]
    raise SystemExit(subprocess.call(command, cwd=root, env=env))


if __name__ == '__main__':
    main()
