# PC Presence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy only the requested PC aggregation and provide an Intel replication kit.
**Architecture:** Shared pure selectors feed both the standalone homepage and React route. Source snapshots remain distinct; music ingest writes per-source keys. Package source and target-side configuration without private data.
**Tech Stack:** JavaScript, Python standard library, launchd, Azure SWA existing CI.
**Spec:** docs/superpowers/specs/2026-11-02-pc-presence-design.md

## Global Constraints

- `mac` separate; PC = `win` + `mac-intel`.
- Daily totals sum, heat takes max 0–15; Asia/Shanghai date.
- Preserve unrelated local changes; deploy from isolated origin/main baseline.
- No credentials, databases or arm64 binaries in kit.

## Review Focus

- Source replacement is cumulative, not an increment; repeated snapshots never double count.
- Day boundaries and stale/malformed inputs never inflate today.
- Legacy aliases do not count twice.
- Paused/stale collectors never override fresh playback.
- The standalone published homepage must ship its shared module.

### Task 1: Source aggregation and views

**Files:** api/lib/computer-presence.mjs; experiments/after-hours/lib/computer-presence.mjs (symlink); experiments/after-hours/main.js, index.html; src/pages/HomePage.jsx; scripts/build-artifacts.mjs; scripts/publish-after-hours.mjs; test/computer-presence.test.js
**Interfaces:** selectComputerUsage(kv, now) -> {apps, keyboardMac, keyboardPC}; selectMusicValue(kv, now) -> music value or null.

- [ ] Add behavior tests for both PC sources, legacy fallback, source replacement, day boundary and heat merge. Observe failure, implement, pass.
- [ ] Wire both pages, rename Windows view to PC, keep layout; ship shared module.

### Task 2: Music source isolation

**Files:** api/music/index.js; api/lib/presence-sanitize.mjs; bridge/music_presence.mjs; test/music-function.test.js
**Interfaces:** POST /api/music accepts optional device mac|mac-intel|win, omitted = mac; stores music_now_<source>; mac also stores legacy music_now.

- [ ] Test isolation, default legacy compatibility, validation and playback precedence. Observe failure, implement, pass.

### Task 3: Intel handoff and release

**Files:** bridge/pc-kit/*; docs/pc-presence-baseline.md; bridge/README.md

- [ ] Produce read-only diagnostic and private config/autostart installer; dry-run using temporary home; package collectors with checksum manifest, agent runbook and source patch.
- [ ] Run npm check, format checks, Python checks and package privacy/hash validation. Review requested-only diff, commit and deploy via existing main CI. Check public files/API and package integrity.

## Execution notes

User requested direct completion and deployment with no extra changes. Worktree isolates prior local changes. No broad cleanup or environment repair. One final independent review is permitted by executing-plans if needed.
