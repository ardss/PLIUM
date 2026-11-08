# PLIUM · Privacy and local data

**Updated 2026-11-08 — Independent Windows preview**

PLIUM is a local Windows clipboard shelf derived from Edge-Drop. Clipboard text, URLs, files, images and screenshots can contain sensitive information. Only use PLIUM on devices where you are comfortable retaining clipboard history locally.

## Local data

PLIUM stores settings, clipboard history, pinned items and notes within its separate user profile (typically `%APPDATA%\plium`). Image and native drag staging may use local temporary files. Core clipboard use does not require an account, cloud synchronization or a PLIUM analytics service.

## Network activity

Online update checking is **disabled** in this preview: it never connects to the original Edge-Drop release feed for installation. Opening an external GitHub link or URL from the app initiates an ordinary browser request to that destination. We do not claim Windows, Electron or other software on the device makes zero outbound requests.

## Removal and migration

Individual deletion and batch clear are available; batch clear requires explicit confirmation of the selected scope and protects pinned/noted history entries. Deleting history may not erase copies retained by other apps or Windows itself. Back up before reinstalling or uninstalling. The public preview does not automatically migrate the original Edge-Drop encrypted profile; on-device migration requires explicit consent, backup and rollback verification.

## Contact

Report bugs via [PLIUM Issues](https://github.com/ardss/PLIUM/issues), without including actual clipboard contents, passwords, API keys or private screenshots. PLIUM is independent from [the upstream Edge-Drop project](https://github.com/Deepender25/Edge-Drop).
