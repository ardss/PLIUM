# PLIUM · 叠间 — preview release notes

PLIUM is an independent Windows clipboard shelf forked from [Edge-Drop](https://github.com/Deepender25/Edge-Drop) (Apache-2.0), not the official upstream edition. Identity: `PLIUM.exe`, AppID `com.ardss.plium`, Windows profile `%APPDATA%\plium`.

## Release and migration policy

- Current verified Windows A local preview: `0.4.0-plium.9`. No public signed build, official auto-update channel or Microsoft Store/MSIX package is offered.
- Preserve original Edge-Drop program/data and a previous PLIUM installer as rollback assets. Never run two clipboard watchers concurrently.
- Do not install upstream Edge-Drop packages as PLIUM upgrades; use only independently built and checksum-verified PLIUM NSIS installers.
- The original encrypted clipboard index, Chromium `Local State` and image payloads are private, and must never appear in Git, debug logs or issues.
- Windows A migration was explicitly backed up and tested; it is not an automatic operation performed by every new PLIUM installation.

## Accepted design behavior

- Independent monochrome metallic folded logo, distinct product identity and attribution.
- Top Dock has **two** accepted states: **one row ↔ three rows**, with no intermediate two-row state.
- Retained slider, start/end navigation, text drag-to-input, card motion and native file/image drag-out.
- Batch clear shows a second confirmation and count. Filtered scope is disclosed, exact reviewed IDs are deleted, and Esc closes confirmation → menu in order.

## Known release gates

Windows B source/unit and isolated desktop GUI tests have passed. Windows A received `0.4.0-plium.9`, with installer hash, backup, history preservation, running instance and autostart checked. Public signing, full real dual-monitor QA and reboot/cold-start release checks remain outstanding.

## Upstream

The product is released from the fork's default `main` branch. The separate `upstream-sync` branch remains available for selecting beneficial upstream changes. The Apache-2.0 `LICENSE`, Git commit history and upstream link retain proper original authorship.
