# PLIUM／叠间 — 独立本地预览

PLIUM is an independent Windows clipboard shelf forked from Edge-Drop (Apache-2.0). It is not the official Edge-Drop distribution. The product name is **PLIUM／叠间**, AppID is `com.ardss.plium`, and Windows distribution uses NSIS x64.

## Installation and identity

- PLIUM and legacy Edge-Drop use distinct installed executable names, AppIDs and user-data directories. Never let both clipboard watchers run simultaneously.
- The original Edge-Drop program and data must be retained as rollback assets until the PLIUM release has passed on-device acceptance.
- Upstream auto-update, manual release downloads, Microsoft Store / MSIX distribution and the original Edge-Drop startup helper are disabled. No PLIUM-owned signed update feed exists for this preview.
- Users must upgrade only with a checksum-verified PLIUM NSIS installer. **Do not turn on old upstream update services to make a test pass.**
- Original Edge-Drop encrypted history does not automatically migrate. On Windows A, a separately tested same-user migration copied the encrypted index, its Chromium `Local State` key metadata, and supporting image/payload files; original data was not deleted.
- The `Local State` contents and clipboard history are private. Never include them in logs, tickets, or public source control.

## Accepted UI direction

The approved metallic folded logo, top-edge docking navigation, central scroll slider, quick actions near the end of the shelf, and **1 → 2 → 3 → 1 row** expansion remain included.

## Release gate

A releasable local build must pass TypeScript checks, full automated tests, NSIS packaging, app-identity/hash verification, same-user encrypted-history load, single-instance and startup checks. In a separate real desktop session, validate edge hover, cross-application text/image/file drag-out, paste focus restoration, grouping/splitting and multi-monitor behavior. Automated DOM/IPC tests or a blank screenshot from a noninteractive SSH session do **not** prove those GUI actions worked.

The project includes a standalone regression ensuring that an image file in a user's own `My Images` folder remains a file when split from a collection; only files within PLIUM-managed image/staging roots can be converted to an internal image card.

## Attribution

Original Edge-Drop authorship is preserved through upstream attribution, the `LICENSE` file, and Git history. The independent product name/logo do not imply upstream endorsement.
