#!/usr/bin/env python3
"""Run on the VPS to enter the existing Lanyard write key privately."""
import getpass
import json
import os
from pathlib import Path

folder = Path('/home/azureuser/vrcx-collector')
key = getpass.getpass('Lanyard API key (hidden; never VRChat Cookie): ').strip()
if not key or 'HERE' in key or '\n' in key or '\r' in key:
    raise SystemExit('No valid key entered; nothing changed.')
path = folder / 'presence-private.json'
temp = folder / '.presence-private.json.tmp'
fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w', encoding='utf-8') as handle:
    json.dump({'enabled': True, 'lanyard_api_key': key}, handle)
    handle.flush()
    os.fsync(handle.fileno())
os.replace(temp, path)
print('Private config saved. Restart vrcx-collector.service to activate.')
