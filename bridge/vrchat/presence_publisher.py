"""Optional owner-only hook for the existing collector. No login or Cookie I/O."""
import json
import logging
import os
import random
import re
import stat
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

OWNER_ID = 'usr_6fa4b433-cb17-4570-b425-f15bb5f178b7'
DISCORD_ID = '860859306156490762'
USER_AGENT = 'AFTER-HOURS/1.0 (+https://kalieri.com)'
log = logging.getLogger('after-hours-presence')


def public_record(user, owner_id, observed_at):
    if not isinstance(user, dict) or user.get('id') != owner_id or user.get('requiresTwoFactorAuth'):
        return None
    # state is connection presence; status is a social preference and is ignored.
    state = user.get('state')
    if state not in ('online', 'active', 'offline'):
        return None
    return {'status': state, 'observedAt': observed_at.isoformat(timespec='milliseconds').replace('+00:00', 'Z')}


class PresencePublisher:
    def __init__(self, owner_id, api_key, *, writer=None, clock=None, monotonic=None, jitter=None):
        self.owner_id = owner_id
        self.api_key = api_key
        self.enabled = bool(api_key and re.fullmatch(r'usr_[A-Za-z0-9_-]+', owner_id))
        self.writer = writer
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self.monotonic = monotonic or time.monotonic
        self.jitter = jitter or random.uniform
        self.next_due = 0
        self.failures = 0

    @classmethod
    def from_private_config(cls, account, path='presence-private.json'):
        if account != 'kai' or not os.path.isfile(path):
            return cls(OWNER_ID, '')
        try:
            info = os.stat(path)
            if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
                log.warning('AFTER HOURS publication disabled: private config permissions')
                return cls(OWNER_ID, '')
            with open(path, encoding='utf-8') as handle:
                config = json.load(handle)
            if not isinstance(config, dict):
                return cls(OWNER_ID, '')
            key = config.get('lanyard_api_key', '')
            if config.get('enabled') is not True or not isinstance(key, str) or not key or 'HERE' in key:
                return cls(OWNER_ID, '')
            return cls(OWNER_ID, key)
        except (OSError, ValueError, TypeError):
            log.warning('AFTER HOURS publication disabled: invalid private config')
            return cls(OWNER_ID, '')

    def _backoff(self, response=None):
        self.failures += 1
        delay = min(900, 60 * 2 ** min(self.failures - 1, 4))
        if response is not None:
            if response.status_code in (401, 403):
                delay = 900
            raw = response.headers.get('Retry-After', '')
            try:
                retry = float(raw)
            except (ValueError, TypeError):
                try:
                    retry = (parsedate_to_datetime(raw) - self.clock()).total_seconds()
                except (ValueError, TypeError, OverflowError):
                    retry = 0
            # Honor server Retry-After, including delays longer than our normal cap.
            delay = max(delay, retry)
        self.next_due = self.monotonic() + delay + self.jitter(0, 15)

    def tick(self, source_session, current_owner_id):
        if not self.enabled or current_owner_id != self.owner_id or self.monotonic() < self.next_due:
            return
        self.next_due = self.monotonic() + self.jitter(60, 90)
        try:
            response = source_session.get(
                'https://api.vrchat.cloud/api/1/users/' + self.owner_id,
                headers={'User-Agent': USER_AGENT}, timeout=8, allow_redirects=False)
            if response.status_code != 200:
                self._backoff(response)
                log.warning('AFTER HOURS source unavailable: HTTP %s', response.status_code)
                return
            record = public_record(response.json(), self.owner_id, self.clock())
            if record is None:
                self._backoff()
                log.warning('AFTER HOURS source unavailable: unrecognized owner presence')
                return
            if self.writer is None:
                import requests
                # A separate session must never inherit VRChat authentication.
                self.writer = requests.Session()
            result = self.writer.patch(
                'https://api.lanyard.rest/v1/users/' + DISCORD_ID + '/kv',
                headers={'Authorization': self.api_key, 'User-Agent': USER_AGENT},
                json={'vrchat_presence': json.dumps(record, separators=(',', ':'))},
                timeout=8, allow_redirects=False)
            if not 200 <= result.status_code < 300:
                if result.status_code in (401, 403):
                    self.enabled = False
                    log.warning('AFTER HOURS publication paused: check Lanyard write key')
                else:
                    self._backoff(result)
                    log.warning('AFTER HOURS publication failed: HTTP %s', result.status_code)
                return
            self.failures = 0
            log.info('AFTER HOURS owner presence published')
        except Exception:
            # The website hook must never stop friend collection or log secrets.
            self._backoff()
            log.warning('AFTER HOURS source/publication unavailable: request failed')
