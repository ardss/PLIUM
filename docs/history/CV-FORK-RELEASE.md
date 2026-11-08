> **HISTORICAL PROJECT PLANNING RECORD.** May contain outdated releases, links and TODO statuses. Refer to current README, PLIUM-PREVIEW and source code for actual behavior.

# CV Fork: Development, Upstream Sync, and Release Gates

Last verified: 2026-11-05

## Source and current consolidation

- Official upstream: `Deepender25/Edge-Drop` (`upstream`).
- Our fork: `ardss/Edge-Drop` (`origin`).
- Verified common base: upstream `main` at `253a90a`; verified upstream `main` and our fork `main` matched at inspection time.
- Feature history: `feat/cv-header-layout-toggle` contains 10 local commits; preserve it as an audit/rollback branch.
- Review-ready consolidated branch: `integration/cv-shelf-20261105` (single squash of the 10 commits).
- Scope: upper dock compact/expanded interaction, center scroll slider and jump, text drag-out, drag ghost/navigation, icon-only fold toggle; 27 source/test files before this policy document.
- No code has been pushed, no PR created and no CV public release made by this consolidation.

## Ongoing branch workflow

1. Keep `upstream/main` read-only. Fetch upstream without automatically merging it.
2. Maintain our product's `main` via PRs against our fork; work in small feature branches and merge tested changes through an integration branch.
3. Create a dedicated upstream-sync branch from our latest product main when official upstream changes merit adoption. Merge or cherry-pick upstream improvements there, resolve conflicts there, and test. Never fast-forward our custom main to upstream blindly.
4. Keep upstream-derived fixes and CV-only features distinguishable in PRs and changelogs; link upstream hashes/issue numbers.
5. Ship a CV release only from a tested release commit. Tag independently and keep a rollback artifact and migration notes.

## Important blockers before a PUBLIC CV release

1. **Update feed isolation (P0):** Current `package.json` build.publish still targets `Deepender25/Edge-Drop`; `electron/main/updater.ts` directly queries GitHub's official release API. The existing default mode can auto-download and install. Change *all* updater paths to our feed or safely disable updater pending a real release channel. Test automatic and manual paths, and the packaged `app-update.yml`.
2. **App identity/data migration (P0):** Current `appId` is `com.edgedrop.app`, product name `Edge-Drop`, and Windows profile stores data in its edge-drop userData. Choose distinct CV app identity/name and decide whether co-installation is supported. If changed, implement an explicit one-time backup/migration for settings, items and payloads. Preserve historical data and rollback. Do not assume the data directory changes safely by itself.
3. **Version isolation (P0):** Own CV version numbers/tags; record the upstream base version and commit separately. Never assume version comparisons across official vs CV releases imply compatible update packages.
4. **Packaging & release (P1):** Audit Windows NSIS install directory, shortcuts, autostart entry, protocol handlers, app update feed, GitHub Actions, update signatures/hashes and installer upgrades. Keep MS Store configuration separate unless independently verified.
5. **License/attribution (P1):** Retain Apache-2.0 LICENSE and any existing notices; distinguish official name/branding from independent CV builds.
6. **Validation (P0):** Run complete automated suite, typecheck and production build; explain any pre-existing test failures, verify native drag/drop, clipboard data and window geometry on Windows A, test *upgrade* and *rollback* against a backed-up real profile.

## Policy when upstream publishes a new version

- Inspect upstream release notes and diff; classify as security/data-integrity fix, necessary bug fix, desirable feature, or out of scope.
- Prefer rapid verified security/data-integrity fixes. Defer cosmetic/UI changes that conflict with CV design.
- Apply selected changes on a new sync branch. Inspect conflict hotspots (especially `src/components/Panel.tsx`, `Header.tsx`, `ItemList.tsx`, `electron/main/updater.ts` and stored-data formats).
- Test data migrations and all changed interactions on Windows B, then run a staged Windows A acceptance build. Preserve the old executable and user data until acceptance.
- Merge with a CV PR, tag a new CV release and publish *only* to our isolated update feed after validation.
- If we do not choose to adopt a new upstream release, CV keeps running and its version does not change.

## Current delivery state

- Windows A runs a local preview built from `6ce5f2c`; this is **not** a publicly published CV installer.
- Integration consolidation changes commit history **only in the new local branch**, not the already-running executable.
- No upstream-sync conflict exists at the inspected upstream commit. Future upstream changes may conflict.
- No release is authorized by this document.
