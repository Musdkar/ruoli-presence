# Optional AFTER HOURS owner presence hook

The VPS collector owns the VRChat session. This module never reads config.ini,
passwords or Cookie files. It reuses that session on the existing serial loop.
Only account kai and the fixed website owner can publish; the other account is
untouched. Without presence-private.json, it makes no requests.

The collector's API `state` determines connection presence; `status` is a social
preference and is ignored. Only state and observation time enter public Lanyard
KV, under the fixed vrchat_presence key. Phone, music and other keys are untouched.
The source observations and writer use separate HTTP sessions. No raw profile,
location, friends, response body or authentication value is logged or published.

Upload the three Python files to a private staging directory on the VPS, then
run install_hook.py. It checks exact anchors, compiles the new source and backs
up collector.py before installing. It does not restart the service.

Run configure_presence.py on the VPS to privately enter the existing Lanyard
API key. The resulting file is mode 0600 and excluded from Git. Restart the
collector only after configuring, then verify a real KV record and browser.
Authentication and 2FA remain handled by the existing collector; this module
never calls login. Missing/failed observations expire instead of emitting offline.

Tests: python3 -m unittest discover -s bridge/vrchat -p 'test_*.py'
