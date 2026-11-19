# PLIUM · Privacy and local data

**Updated 2026-11-19 — PLIUM 1.0.0**

PLIUM is a local Windows clipboard shelf derived from Edge-Drop. Clipboard text, URLs, files, images and screenshots can contain sensitive information. Only use PLIUM on devices where you are comfortable retaining clipboard history locally.

## Local data

PLIUM stores settings, clipboard history, pinned items and notes within its own user profile (typically `%APPDATA%\plium`). History and long-text payloads are encrypted with Windows DPAPI, which binds the ciphertext to your Windows user account. Image and native drag staging may use local temporary files. Core clipboard use does not require an account, cloud synchronization or a PLIUM analytics service.

## Network activity

PLIUM makes outbound requests in exactly two situations.

1. **Update checks.** Unless you switch updates off, PLIUM asks the public GitHub Releases API for the newest PLIUM version:

   `https://api.github.com/repos/ardss/PLIUM/releases/latest`

   That request carries no clipboard content, no history, no account identifier, no telemetry and no device fingerprint — only the HTTPS request itself, which GitHub sees like any other download of a public file. If a newer version exists and your mode allows it, PLIUM downloads the installer from `https://github.com/ardss/PLIUM/releases`.

2. **Links you open.** Opening an external link from the app hands the URL to your default browser, which then makes its own request.

### What your update setting changes

| Mode | Check the feed | Download an update | Install |
|---|---|---|---|
| Automatic (default) | Yes, at startup | Yes, in the background | On PLIUM exit, or when you click "restart to install" |
| Notify me | Yes, at startup | Only after you click Download | Only when you click "restart to install" |
| Off | Never | Never | Never |

An update is installed while PLIUM is not running. PLIUM does not watch your keyboard or mouse to decide when to update, and it never restarts itself without an explicit action from you.

The update channel is PLIUM's own repository and nothing else. PLIUM does not connect to the upstream Edge-Drop release feed, and it will not install an upstream package over itself: a packaged build whose update feed points anywhere else disables updating rather than trusting it.

We do not claim Windows, Electron or other software on the device makes zero outbound requests.

## Removal and migration

Individual deletion and batch clear are available; batch clear requires explicit confirmation of the selected scope and protects pinned/noted history entries. Deleting history may not erase copies retained by other apps or Windows itself. Back up before reinstalling or uninstalling. The public release does not automatically migrate an original Edge-Drop encrypted profile; on-device migration requires explicit consent, backup and rollback verification.

## Contact

Report bugs via [PLIUM Issues](https://github.com/ardss/PLIUM/issues), without including actual clipboard contents, passwords, API keys or private screenshots. PLIUM is independent from [the upstream Edge-Drop project](https://github.com/Deepender25/Edge-Drop).
