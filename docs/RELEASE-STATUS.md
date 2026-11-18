# PLIUM / 叠间 — release status and public distribution gates

Last reviewed: 2026-11-18 (Asia/Taipei). This is the **single, living release readiness file**. Older dated QA evidence remains archived; do not interpret an old candidate's PASS as a newer build's PASS.

## Current candidate
- **Product:** independent PLIUM, AppID `com.ardss.plium`, profile `%APPDATA%\plium`. Original Edge-Drop is an attributed Apache-2.0 upstream dependency, **not** PLIUM's distribution or update channel.
- **Internal tested candidate:** `1.0.0-beta.3`, local fix commit `0885fab`; Windows A runs one installation. No public GitHub Release or signed installer. The existing `0.4.0-plium.N` series is historical and shall not continue.
- **Next public release:** `v1.0.0` only after all applicable gates below are independently verified. Do not advance version numbers for unrelated commits.
- **Update mechanism:** disabled by design until a trusted PLIUM release feed and signature verification exist. For now any user-approved upgrade is a manual installation after a full profile backup.

## Gate evidence (do not infer completion)
| Gate | Evidence / current status |
|---|---|
| Windows B static + tests | TypeScript PASS, 93 files / 966 automated tests PASS on `0885fab` (2026-11-18). |
| Build | Electron/Vite source build PASS; packaging of the previously installed `beta.3` passed. Rebuild new integration SHA and compare exact package hashes before public distribution. |
| Production packages | Official `npm audit --omit=dev` reported 0 advisories. |
| Build/development advisory | Eleven npm advisory **entries** cascade from a **single known** `picomatch` ReDoS advisory `GHSA-fc5q-39xc-vjpf`; current available version 4.0.7 is still affected as of 2026-11-18. `scripts/audit-dependencies.mjs` accepts **only** this specifically traced dev-only root while still blocking all production or unexpected vulnerabilities. It is a narrow *risk review*, **not a software patch or zero-risk declaration**. No picomatch/vite/vitest in Windows app.asar, verified independently. Build CI must never process untrusted arbitrary user-provided glob expressions. Revisit the exception as soon as a patched upstream is available. |
| Windows A real desktop | Native/Electron window placement and renderer load PASS; **real edge hover/retract, cold restart, tray hotkeys, external text/image/file drag-drop, one-to-three rows, focus, clear confirmation and full data rollback remain pending same-build native acceptance**. Do not drive a user's mouse when input is active or mutate their clipboard to generate tests. |
| Data integrity | Windows A full pre-beta.3 backup exists; installed executable/hash and backup path verified. Any rollback from new DPAPI v3 to old .10 requires restoring the **entire older profile**, including `Local State`, `payloads`, and `images`, not downgrading the EXE alone. Keep a copy of the newer profile first. |
| Signing and reputation | `Get-AuthenticodeSignature` returned **NotSigned** on NSIS and installed EXE; no local eligible code-signing certificate found. **Public trusted stable distribution blocked.** Never claim SmartScreen trust from unsigned/synthetic/self-signed signatures. |
| GitHub source | Candidate fix `0885fab` was not yet integrated into remote main at last audit; old draft PR #29 head `ac60ecc` is *not* a current CI run. Latest candidate needs a verified PR and green Windows CI, plus final immutable source SHA and package hash. |
| History secret review | Local repo is a `blob:none` partial clone (1,458 missing objects across all refs during 2026-11-18 audit). The current HEAD keyword scan found no matches but **full history has not been scanned**. Obtain full objects or run an independently complete audit before asserting history is clean. |
| Visual and docs | Screenshot evidence is synthetic clipboard data (safe for public), not every language tested. A claim of 31 languages means strings exist, not that all RTL/language layouts have been human-validated. Document real supported surface, limitations and recovery paths. |

## Public Windows signing path (external identity required)
1. **Preferred low-cost open-source route:** review free [SignPath Foundation](https://signpath.org/) conditions and eligibility, then apply with the public PLIUM repository and responsible release maintainer identity. Microsoft documents this path in its [Windows code signing options](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options). The Foundation may require review and manual approval for every signing request. **No application or approval is claimed here.**
2. Alternative: obtain a legitimate CA-issued code-signing identity or configured cloud signing service; hold secrets outside git. Do not self-sign and present it as public trust.
3. Once approved, configure the **exact** immutable GitHub Actions release artifact to be signed via a documented signer, and verify both `PLIUM.exe` and the NSIS installer with `Get-AuthenticodeSignature` (valid chain/publisher). Verify on clean Windows 10/11 with SmartScreen. Never rely on a local SHA from a different build.
4. Only publish when source SHA, signed binary SHA, tag, release notes, provenance and release approval are all consistent.

## Required Windows A acceptance for GO
Run on *the same* release-candidate executable and isolated synthetic data where appropriate:
- one installation and main instance; saved history and backup preserved; cold restart and proper login autostart.
- right/left monitors, top and side edges, changed DPI/workArea; **real cursor contact** unfolds/retracts; one vs three rows remain stable; no WER hangs.
- Alt+C, tray double click and context menu, proper focus, no accidental window activation.
- text/image/file drag-out to supported external inputs, image previews, safe clear confirmations, search and filters.
- no sensitive clipboard contents or user profile backups uploaded to GitHub, reports, telemetry or public artifacts.
- run signed installer verification, initial install and upgrade from old profile using a disposable fixture; record source and installation hashes, rollback rehearsals.

## Release state machine
DEV -> one INTEGRATION main -> QA candidate -> Windows A native acceptance -> signed trustworthy artifact -> **explicit GO** -> immutable GitHub Release. Fail any blocking gate: remain NO-GO; do not publish, auto-update or create a stable `v1.0.0` tag. See `docs/RELEASE-POLICY.md` and [tracking issue #18](https://github.com/ardss/PLIUM/issues/18).
