import { sanitizeVrchatImageUrl } from './presence-sanitize.mjs';
// This signal belongs only to the VRChat tile, never to iPhone.
export const VRCHAT_MAX_AGE = 180000;
const parse = value => { try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return null; } };
export function selectVrchatPresence(presence, receivedAt, now = Date.now()) {
  const owner = parse(presence?.kv?.vrchat_presence);
  const seen = Date.parse(owner?.observedAt || '');
  const status = typeof owner?.status === 'string' ? owner.status.toLowerCase() : '';
  if (Number.isFinite(seen) && seen <= now + 60000 && now - seen < VRCHAT_MAX_AGE &&
      ['online', 'active', 'offline'].includes(status)) {
    const live = !['active', 'offline'].includes(status);
    const moods = { active: ['Online', 'online'], 'join me': ['Join Me', 'joinme'], 'ask me': ['Ask Me', 'askme'], busy: ['Busy', 'busy'] };
    const mood = Object.hasOwn(moods, owner.availability) ? moods[owner.availability] : moods.active;
    const identity = {
      name: typeof owner.profile?.displayName === 'string' && owner.profile.displayName.trim() ? owner.profile.displayName.trim().slice(0, 80) : 'Kalieri',
      avatarUrl: sanitizeVrchatImageUrl(owner.profile?.avatarUrl),
      availabilityLabel: status === 'offline' ? 'Offline' : status === 'active' ? `Active${mood[0] === 'Online' ? '' : ' · ' + mood[0]}` : mood[0],
      availabilityTone: status === 'offline' ? 'offline' : mood[1],
      availabilityHollow: status === 'active', worldImageUrl: null,
    };
    const loc = live ? ['ask me', 'busy'].includes(owner.availability) ? { kind: 'private' } : owner.location : null;
    if (loc?.kind === 'private') return {
      ...identity, live, source: 'OWNER SYNC', state: 'ONLINE', title: 'PRIVATE', detail: 'Location hidden.',
    };
    if (loc?.kind === 'traveling') return {
      ...identity, live, source: 'OWNER SYNC', state: 'TRAVELING', title: 'TRAVELING', detail: 'Changing worlds.',
    };
    if (loc?.kind === 'world' && typeof loc.worldName === 'string' && loc.worldName.trim() &&
        ['public', 'friends', 'friends+', 'group public', 'group+'].includes(loc.access)) return {
      ...identity, worldImageUrl: sanitizeVrchatImageUrl(loc.thumbnailUrl), live, source: 'OWNER SYNC', state: 'ONLINE', title: loc.worldName.slice(0, 120), detail: `${loc.access.toUpperCase()} INSTANCE · In VRChat.`,
    };
    return {
      ...identity, live, source: 'OWNER SYNC', state: status === 'active' ? 'ACCOUNT ACTIVE' : status.toUpperCase(),
      title: live ? 'World unavailable.' : 'Not in a world.',
      detail: live ? 'VRChat game connection reported.' : status === 'active' ?
        'Active on VRChat; no game connection reported.' : 'VRChat reports the account offline.',
    };
  }
  const freshRead = Number.isFinite(receivedAt) && receivedAt <= now + 60000 && now - receivedAt < VRCHAT_MAX_AGE;
  const activities = freshRead && Array.isArray(presence?.activities) ? presence.activities : [];
  const activity = activities.find(a => a && typeof a.name === 'string' && /^VRChat$/i.test(a.name));
  const identity = { name: 'Kalieri', avatarUrl: null, availabilityLabel: activity ? 'Activity detected' : 'No signal', availabilityTone: activity ? 'online' : 'unknown', availabilityHollow: false, worldImageUrl: null };
  return activity ? {
    ...identity, live: true, source: 'DISCORD ACTIVITY', state: 'ACTIVITY DETECTED', title: 'World unavailable.',
    detail: String(activity.details || activity.state || 'VRChat activity detected').slice(0, 120),
  } : {
    ...identity, live: false, source: 'DISCORD ACTIVITY', state: 'NO PUBLIC SIGNAL', title: 'No current world.',
    detail: 'No verified VRChat activity in the public signal.',
  };
}
