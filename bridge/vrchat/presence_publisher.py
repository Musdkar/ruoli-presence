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


def public_image_url(value):
    """Credential-free VRChat file/image endpoints only; never signed URLs."""
    if not isinstance(value, str) or len(value) > 1024:
        return None
    return value if re.fullmatch(r'https://api\.vrchat\.cloud/api/1/(?:image|file)/file_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/\d+/(?:file|\d+)', value) else None


def location_descriptor(user):
    """Parse VRCX-style owner presence; identifiers stay inside the collector."""
    presence = user.get('presence')
    if user.get('status') in ('ask me', 'busy') or (isinstance(presence, dict) and presence.get('status') in ('ask me', 'busy')):
        return {'kind': 'private'}
    instance_type = None
    if isinstance(presence, dict):
        instance_type = presence.get('instanceType')
        if instance_type == 'private':
            return {'kind': 'private'}
        if instance_type not in (None, '', 'public', 'friends', 'hidden', 'group'):
            return {'kind': 'unknown'}
        world = presence.get('world')
        instance = presence.get('instance')
        tag = f'{world}:{instance}' if isinstance(world, str) and world.startswith('wrld_') and isinstance(instance, str) else world
    else:
        tag = user.get('location')
    if tag in ('private', 'private:private'):
        return {'kind': 'private'}
    if tag in ('traveling', 'traveling:traveling'):
        return {'kind': 'traveling'}
    if not isinstance(tag, str) or len(tag) > 2048:
        return {'kind': 'unknown'}
    match = re.fullmatch(r'(wrld_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}):([A-Za-z0-9_-]{1,128})(.*)', tag)
    if not match:
        return {'kind': 'unknown'}
    wid, _, suffix = match.groups()
    qualifiers = {}
    for part in suffix.split('~')[1:]:
        q = re.fullmatch(r'([A-Za-z]+)(?:\(([^()]*)\))?', part)
        if not q or q[1] not in ('private', 'hidden', 'friends', 'group', 'groupAccessType', 'canRequestInvite', 'region', 'nonce', 'strict', 'ageGate') or q[1] in qualifiers:
            return {'kind': 'unknown'}
        qualifiers[q[1]] = q[2]
    if suffix and not suffix.startswith('~'):
        return {'kind': 'unknown'}
    if 'private' in qualifiers or qualifiers.get('groupAccessType') == 'members':
        return {'kind': 'private'}
    if sum(key in qualifiers for key in ('friends', 'hidden', 'group')) > 1:
        return {'kind': 'unknown'}
    access = 'public'
    if 'friends' in qualifiers:
        access = 'friends'
    elif 'hidden' in qualifiers:
        access = 'friends+'
    elif 'group' in qualifiers:
        access = {'public': 'group public', 'plus': 'group+'}.get(qualifiers.get('groupAccessType'))
        if not access:
            return {'kind': 'private'}
    elif 'groupAccessType' in qualifiers or 'canRequestInvite' in qualifiers:
        return {'kind': 'unknown'}
    if instance_type == 'group' and 'group' not in qualifiers:
        return {'kind': 'private'}
    if instance_type in ('friends', 'hidden') and access == 'public':
        access = 'friends' if instance_type == 'friends' else 'friends+'
    return {'kind': 'world', 'worldId': wid, 'access': access}


def public_record(user, owner_id, observed_at, *, world=None):
    if not isinstance(user, dict) or user.get('id') != owner_id or user.get('requiresTwoFactorAuth'):
        return None
    # state proves connection; social status is a display preference, not proof.
    state = user.get('state')
    if state not in ('online', 'active', 'offline'):
        return None
    record = {'status': state, 'observedAt': observed_at.isoformat(timespec='milliseconds').replace('+00:00', 'Z')}
    presence = user.get('presence') if isinstance(user.get('presence'), dict) else {}
    availability = presence.get('status') or user.get('status')
    if state in ('online', 'active') and availability in ('active', 'join me', 'ask me', 'busy'):
        record['availability'] = availability
    name = presence.get('displayName') or user.get('displayName')
    name = re.sub(r'[\x00-\x1f\x7f]', '', name).strip()[:80] if isinstance(name, str) else ''
    if name:
        profile = {'displayName': name}
        candidates = (presence.get('userIcon'), user.get('iconUrl'), user.get('userIcon'), presence.get('profilePicOverride'), user.get('profilePicOverrideThumbnail'), user.get('profilePicOverride'), presence.get('avatarThumbnail'), user.get('currentAvatarThumbnailImageUrl'))
        avatar = next((url for item in candidates if (url := public_image_url(item))), None)
        if avatar:
            profile['avatarUrl'] = avatar
        record['profile'] = profile
    if state == 'online':
        loc = location_descriptor(user)
        if loc['kind'] == 'world':
            if not isinstance(world, dict) or world.get('id') != loc['worldId']:
                loc = {'kind': 'unknown'}
            elif world.get('releaseStatus') != 'public':
                loc = {'kind': 'private'}
            else:
                name = world.get('name')
                name = re.sub(r'[\x00-\x1f\x7f]', '', name).strip()[:120] if isinstance(name, str) else ''
                loc = {'kind': 'world', 'worldName': name, 'access': loc['access']} if name else {'kind': 'unknown'}
                image = public_image_url(world.get('thumbnailImageUrl'))
                if name and image:
                    loc['thumbnailUrl'] = image
        record['location'] = loc
    return record


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
        self.world_cache = {}

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
            user = response.json()
            observed_at = self.clock()
            record = public_record(user, self.owner_id, observed_at)
            if record is None:
                self._backoff()
                log.warning('AFTER HOURS source unavailable: unrecognized owner presence')
                return
            if record['status'] == 'online':
                # Like VRCX, use authenticated CurrentUser.presence for own location.
                # /auth/user.state is intentionally ignored: it always says offline.
                current = source_session.get(
                    'https://api.vrchat.cloud/api/1/auth/user',
                    headers={'User-Agent': USER_AGENT}, timeout=8, allow_redirects=False)
                if current.status_code != 200:
                    self._backoff(current)
                    log.warning('AFTER HOURS owner location unavailable: HTTP %s', current.status_code)
                    return
                snapshot = current.json()
                if not isinstance(snapshot, dict) or snapshot.get('id') != self.owner_id or snapshot.get('requiresTwoFactorAuth'):
                    self._backoff()
                    log.warning('AFTER HOURS owner location unavailable: authentication required')
                    return
                user = {**snapshot, 'state': 'online'}
                desc = location_descriptor(user)
                world = None
                if desc['kind'] == 'world':
                    wid = desc['worldId']
                    cached = self.world_cache.get(wid)
                    if cached and self.monotonic() - cached[0] < 3600:
                        world = cached[1]
                    else:
                        meta = source_session.get(
                            'https://api.vrchat.cloud/api/1/worlds/' + wid,
                            headers={'User-Agent': USER_AGENT}, timeout=8, allow_redirects=False)
                        if meta.status_code != 200:
                            self._backoff(meta)
                            log.warning('AFTER HOURS world metadata unavailable: HTTP %s', meta.status_code)
                            return
                        data = meta.json()
                        if isinstance(data, dict):
                            world = {k: data.get(k) for k in ('id', 'name', 'releaseStatus', 'thumbnailImageUrl')}
                            if len(self.world_cache) >= 32:
                                self.world_cache.pop(next(iter(self.world_cache)))
                            if world['id'] == wid:
                                self.world_cache[wid] = (self.monotonic(), world)
                record = public_record(user, self.owner_id, observed_at, world=world)
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
