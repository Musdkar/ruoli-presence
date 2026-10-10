#!/usr/bin/env python3
"""Install the optional hook beside collector.py; never read config or Cookies.
Run this script on the VPS from a folder containing presence_publisher.py.
The hook stays disabled until a mode-0600 private config is supplied.
"""
import hashlib
from pathlib import Path
import py_compile
import shutil
from datetime import datetime, timezone

folder = Path('/home/azureuser/vrcx-collector')
collector = folder / 'collector.py'
source = collector.read_text()
if 'self.presence_publisher' in source:
    raise SystemExit('Hook already exists; inspect before replacing.')
anchors = [
    ('        self.self_id = None', '        self.self_id = None'),
    ('            self.process_pending()\n', '            self.process_pending()\n'),
]
# Exact anchors prevent patching an unexpected collector version.
for before, _after in anchors:
    if source.count(before) != 1:
        raise SystemExit('Collector version differs; no files changed.')
module = Path(__file__).with_name('presence_publisher.py')
py_compile.compile(str(module), doraise=True)
source = source.replace('        self.self_id = None',
    '        from presence_publisher import PresencePublisher\n'
    '        self.presence_publisher = PresencePublisher.from_private_config(self.name)\n'
    '        self.self_id = None', 1)
source = source.replace('            self.process_pending()\n',
    '            self.process_pending()\n'
    '            if not self.needs_login.is_set():\n'
    '                self.presence_publisher.tick(self.session, self.self_id)\n', 1)
compile(source, str(collector), 'exec')
backup = folder / ('after-hours-backup-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
backup.mkdir(mode=0o700)
shutil.copy2(collector, backup / 'collector.py')
shutil.copy2(module, folder / 'presence_publisher.py')
collector.write_text(source)
print('Installed disabled-by-default hook. Backup:', backup)
print('Collector SHA256:', hashlib.sha256(source.encode()).hexdigest())
print('The running service has not been restarted.')
