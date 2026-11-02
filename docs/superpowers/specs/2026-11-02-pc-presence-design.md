# PC presence integration

Approved scope: rename the website Windows view to PC; combine that PC’s Windows and Intel macOS daily aggregates; deliver a replication kit based on the inspected Apple Silicon Mac, including NetEase / Apple Music sync; deploy only these changes. Keep layout and other local work unchanged.

Use distinct cumulative source slots `win` and `mac-intel`, leaving `mac` separate. Sum same-day keyboard totals; take per-key maximum 0–15 heat (approximate visual, never exact merged counts). Software sums names across same-day source snapshots. Website day is Asia/Shanghai (UTC+8); target OS clocks/timezones must agree. Never sum legacy aliases with their suffixed copy. Do not migrate/copy source databases between OS installations. This preserves the current privacy boundary.

Alternatives: writing both systems into `win` would overwrite cumulative data; adding a third visible computer misrepresents one physical PC. Separate storage with one PC view is the chosen approach. Heat levels cannot be losslessly added; the maximum preserves coarse activity without claiming exact counts.

Music is isolated per source in KV. Device-less legacy collectors map to `mac`; keep legacy `music_now` for compatibility. Readers prefer fresh playing, then fresh paused, then most recent history. This prevents an idle/paused Mac from overwriting playback from the PC. Keep the existing 90s expiry and track/artwork retention.

Kit includes Chinese agent instructions, audited baseline, source collectors, Intel build/run/autostart instructions, private config template, diagnosis/acceptance/rollback guidance. No credentials, raw database, title, URL, login state or arm64 binary. Target Intel hardware and real playback require acceptance on that target, and are not implied by local checks.

Storage constraint confirmed from Lanyard: KV keys use letters, digits and underscores only. Keep the external DEVICE slug `mac-intel`; adapt it to suffix `mac_intel` at both ingest boundaries and consume those keys in readers. No target configuration change or data migration is required.
