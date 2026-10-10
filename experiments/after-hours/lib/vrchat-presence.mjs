// This signal belongs only to the VRChat tile, never to iPhone / Focus.
export const VRCHAT_MAX_AGE = 180000;
const parse = value => { try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return null; } };
export function selectVrchatPresence(presence, receivedAt, now = Date.now()) {
  const owner = parse(presence?.kv?.vrchat_presence);
  const seen = Date.parse(owner?.observedAt || '');
  const status = typeof owner?.status === 'string' ? owner.status.toLowerCase() : '';
  if (Number.isFinite(seen) && seen <= now + 60000 && now - seen < VRCHAT_MAX_AGE &&
      ['online', 'active', 'offline'].includes(status)) {
    const live = !['active', 'offline'].includes(status);
    const loc = live ? owner.location : null;
    if (loc?.kind === 'private') return {
      live, source: 'OWNER SYNC', state: 'ONLINE', title: 'Somewhere private.', detail: 'PRIVATE · Location hidden.',
    };
    if (loc?.kind === 'traveling') return {
      live, source: 'OWNER SYNC', state: 'TRAVELING', title: 'Between worlds.', detail: 'TRAVELING · Changing worlds.',
    };
    if (loc?.kind === 'world' && typeof loc.worldName === 'string' && loc.worldName.trim() &&
        ['public', 'friends', 'friends+', 'group public', 'group+'].includes(loc.access)) return {
      live, source: 'OWNER SYNC', state: 'ONLINE', title: loc.worldName.slice(0, 120), detail: `${loc.access.toUpperCase()} INSTANCE · In VRChat.`,
    };
    return {
      live, source: 'OWNER SYNC', state: status === 'active' ? 'ACCOUNT ACTIVE' : status.toUpperCase(),
      title: live ? 'Beyond the screen. ✳' : 'Between worlds.',
      detail: live ? 'VRChat game connection reported.' : status === 'active' ?
        'Active on VRChat; no game connection reported.' : 'VRChat reports the account offline.',
    };
  }
  const freshRead = Number.isFinite(receivedAt) && receivedAt <= now + 60000 && now - receivedAt < VRCHAT_MAX_AGE;
  const activities = freshRead && Array.isArray(presence?.activities) ? presence.activities : [];
  const activity = activities.find(a => a && typeof a.name === 'string' && /^VRChat$/i.test(a.name));
  return activity ? {
    live: true, source: 'DISCORD ACTIVITY', state: 'ACTIVITY DETECTED', title: 'Beyond the screen. ✳',
    detail: String(activity.details || activity.state || 'VRChat activity detected').slice(0, 120),
  } : {
    live: false, source: 'DISCORD ACTIVITY', state: 'NO PUBLIC SIGNAL', title: 'The portal is quiet.',
    detail: 'No verified VRChat activity in the public signal.',
  };
}
