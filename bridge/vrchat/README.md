# Optional AFTER HOURS owner presence hook

The VPS collector owns the VRChat session. This module never reads config.ini,
passwords or Cookie files. It reuses that session on the existing serial loop.
Only account kai and the fixed website owner can publish; the other account is
untouched. Without presence-private.json, it makes no requests.

`GET /users/{owner}` supplies connection state (`online`, `active`, `offline`).
Only while online, `GET /auth/user` supplies the authenticated owner's current
presence, as in VRCX. Its `state` is ignored. Social `status` cannot prove game
presence; `ask me` and `busy` suppress public location. The approved social
preference is displayed separately as Online, Join Me, Ask Me or Busy; account
activity uses a hollow dot and never implies a game connection.

The fixed Lanyard `vrchat_presence` key contains `status`, `observedAt`, optional
`availability` and the approved `profile` (displayName, max 80 characters, and
avatarUrl). Only while online may it contain a filtered `location`. A visible
public-release world may publish `kind: world`, `worldName` (max 120 characters),
an optional `thumbnailUrl` and an access label
(public, friends, friends+, group public, group+). Invite, Invite+, group members,
non-public worlds and hidden social states publish `kind: private` without a
name. Traveling publishes only `kind: traveling`; unrecognized data publishes
only `kind: unknown`. Ambiguous access fails closed. No instance or world IDs,
join URLs, nonce, group or friend details enter public KV. Names render as text.
Image URLs must match credential-free official VRChat file/image endpoints;
query strings, signed URLs, userinfo, fragments and other hosts are rejected.
The large animated portal keeps its original floral photograph as the default;
the profile avatar appears only below it. Only a visible world's thumbnail
replaces its centre; private, traveling, missing, failed or expired images restore
the default. The profile row remains below the portal.

Current location is checked on every 60–90 second randomized observation.
World metadata is cached in memory (max 32 entries, one-hour TTL); the previous
location is never retained by that cache. HTTP errors and 2FA stop publication,
respect retry/backoff, and never retimestamp old data. The browser expires a
record after 180 seconds. A short traveling phase can fall between observations.

Phone, music and other keys are untouched. Source observations and publication
use separate HTTP sessions. No raw profile, location, response body, credential
or game history is logged. Cookie authentication and 2FA stay with the existing
collector; this module never logs in or opens a listener.

For a first install, upload the three Python files to a private staging directory,
then run install_hook.py. It checks exact anchors, compiles the new source and
backs up collector.py before installing; it does not restart the service. For
an existing hook, back up and replace only presence_publisher.py, run the fixture
tests, compile it and restart the existing collector. Preserve private config.

Run configure_presence.py on the VPS to privately enter the existing Lanyard
API key when needed. The resulting file is mode 0600 and excluded from Git.
After restart, verify real KV timestamps and the preview browser. Fixture tests
alone do not prove real in-game location transitions.

Tests: python3 -m unittest discover -s bridge/vrchat -p 'test_*.py'
