# PLIUM upstream history and compatibility

PLIUM is an independent Windows fork of [Deepender25/Edge-Drop](https://github.com/Deepender25/Edge-Drop). The original project is credited under Apache-2.0; its historical Git commits remain part of this repository.

## Version and branch namespaces

- **`main`** — PLIUM's supported product source. Do not assume a package built from an upstream commit is compatible with the PLIUM profile.
- **`upstream-sync`** — upstream baseline used for selecting positive upstream improvements. It must never silently replace PLIUM's `main`.
- **`upstream-legacy/v0.x` tags** — the original Edge-Drop release tags were copied byte-for-byte by commit SHA into this explicitly labeled namespace on 2026-11-08. **They are not PLIUM releases.**
- **`upstream-legacy-media`, `upstream-legacy-stats`** — snapshots of original upstream support branches. No PLIUM downloads or publication statistics are sourced from these.
- **`docs/upstream-reference/`** — retained original architecture/translation notes, not the current UI or release documentation.

For a PLIUM update, never install an older Edge-Drop package over PLIUM. The app identity, installation directory, encrypted user-data profile and update channel are independent.

The original version tags' SHA mapping was verified before the old unprefixed tag references were retired. Git lineage remains available; unprefixed Edge-Drop version-tag links may no longer resolve on this fork. For those original releases, consult the [upstream project's releases](https://github.com/Deepender25/Edge-Drop/releases) instead.

PLIUM's official public binaries are not yet released or signed. Local NSIS builds are for controlled testing until the signing and on-device verification gates pass.
