#!/usr/bin/env python3
"""Render Intel Mac launch agents; --apply installs only the two named jobs."""
import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import platform
import plistlib
import subprocess
import sys


def create_jobs(root, config, python):
    logs = Path.home() / 'Library/Logs'
    jobs = {}
    for kind in ('whatpulse', 'music'):
        label = 'com.ruoli.' + kind + 'bridge'
        log = str(logs / ('ruoli-' + kind + '-bridge.log'))
        job = {
            'Label': label,
            'ProgramArguments': [python, str(root / 'bridge/pc-kit/run_bridge.py'), str(config), kind],
            'WorkingDirectory': str(root), 'RunAtLoad': True,
            'StandardOutPath': log, 'StandardErrorPath': log,
        }
        if kind == 'whatpulse':
            job['StartInterval'] = 900
        else:
            job['KeepAlive'] = True
            job['ThrottleInterval'] = 30
        jobs[label] = job
    return jobs


def write_jobs(jobs, home):
    directory = home / 'Library/LaunchAgents'
    directory.mkdir(parents=True, exist_ok=True)
    (home / 'Library/Logs').mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    paths = []
    for label, job in jobs.items():
        path = directory / (label + '.plist')
        if path.exists():
            path.rename(path.with_name(path.name + '.backup-' + stamp))
        # Create private from the first write, not after exposing content.
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as stream:
            plistlib.dump(job, stream)
        paths.append(path)
    return paths


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--apply', action='store_true', help='Install and start jobs; otherwise only validate/render summary')
    args = parser.parse_args()
    root, config = args.root.expanduser().resolve(), args.config.expanduser().resolve()
    values = json.loads(config.read_text())
    if values.get('DEVICE') != 'mac-intel':
        raise SystemExit('For the Hackintosh set DEVICE=mac-intel. Never reuse mac or win here.')
    if not (root / 'bridge/pc-kit/run_bridge.py').is_file():
        raise SystemExit('Root must contain bridge/pc-kit/run_bridge.py.')
    jobs = create_jobs(root, config, sys.executable)
    if not args.apply:
        print('Validated: mac-intel; two jobs; stats every 900s; music KeepAlive. No changes made.')
        return
    if sys.platform != 'darwin' or platform.machine() != 'x86_64':
        raise SystemExit('--apply is only for the target Intel macOS, not the source ARM Mac.')
    if sys.version_info < (3, 10):
        raise SystemExit('Use Python 3.10+ (recommended 3.12), not the system Python.')
    token = values.get('INGEST_TOKEN', '')
    if not isinstance(token, str) or not token or token.startswith('REPLACE') or not token.isascii():
        raise SystemExit('Configure the real ingest token locally before applying.')
    if config.stat().st_mode & 0o077:
        raise SystemExit('Run chmod 600 on the private config first.')
    for name in ('WHATPULSE_API_URL', 'MUSIC_API_URL'):
        if not str(values.get(name, '')).startswith('https://'):
            raise SystemExit('Configure HTTPS ingest URLs first.')
    if not values.get('NODE') or not Path(values['NODE']).is_file():
        raise SystemExit('Set NODE to the target Node.js executable.')
    np = values.get('NP_CLI')
    if not np or not Path(np).is_file():
        raise SystemExit('Build/install the Intel nowplaying-cli and set NP_CLI first.')
    paths = write_jobs(jobs, Path.home())
    domain = 'gui/' + str(os.getuid())
    for path in paths:
        subprocess.run(['launchctl', 'bootout', domain + '/' + path.stem], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['launchctl', 'bootstrap', domain, str(path)], check=True)
    print('Installed and started only com.ruoli.whatpulsebridge and com.ruoli.musicbridge; old plists backed up.')


if __name__ == '__main__':
    main()
