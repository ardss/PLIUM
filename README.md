<p align="center"><img src="resources/plium-logo.svg" width="120" alt="PLIUM logo"></p>
<h1 align="center">PLIUM · 叠间</h1>
<p align="center"><b>A compact clipboard shelf at the edge of your Windows desktop.</b><br>在屏幕边缘呼出、检索、整理、拖出，而不打断当前工作。</p>

> **Independent open-source fork.** PLIUM is developed from [Edge-Drop](https://github.com/Deepender25/Edge-Drop) (Apache-2.0). It is **not** Edge-Drop's official application, Microsoft Store edition, website or update channel. See [Attribution](#attribution).

## Actual PLIUM interface

<p align="center">
  <img src="docs/media/plium-top-expanded.png" width="960" alt="Real PLIUM 0.4.0-plium.9 desktop screenshot: top Dock expanded to three rows with synthetic example clipboard entries." />
</p>

<p align="center"><em>Expanded top Dock ? three rows</em></p>

<p align="center">
  <img src="docs/media/plium-top-compact.png" width="730" alt="Real PLIUM desktop screenshot: compact single-row top Dock." />
  <img src="docs/media/plium-side.png" width="215" alt="Real PLIUM desktop screenshot: vertical side Dock with search and clipboard cards." />
</p>

<sub>All three images were captured from the actual PLIUM 0.4.0-plium.9 Electron application running on Windows B with an isolated profile and synthetic demo clipboard data. They are not upstream Edge-Drop images, renders or mockups, and contain no real user clipboard history.</sub>

## Features

- **Edge shelf** that appears at the screen edge and gets out of your way.
- **Two-state top Dock:** one compact row ↔ three expanded rows; scroll slider and start/end navigation.
- **Clipboard history** for text, URLs, images and files; pinned and noted records are protected from bulk clearing.
- **Drag-out** text into supported external inputs and file/image objects through native Windows drag-and-drop.
- **Search, filter and safe clear:** filtered scopes are shown explicitly before a second confirmation, with a precise deletion count.
- **Tray and keyboard** access, subtle card reflow, shared context-menu design, 31 interface languages.

PLIUM runs on Windows 10/11 x64. Not every third-party app accepts every drop format, and multi-monitor behavior depends on Windows display configuration.

## Preview status and downloads

Current locally verified preview: **`0.4.0-plium.9`**, tested on Windows B and installed with history-preservation checks on Windows A in November 2026. Source and native-interaction automated checks have passed; **public release checks are still incomplete** (publisher signing, cold reboot, every supported monitor/display scenario). **There is no official public PLIUM installer or online updater yet.**

When a verified PLIUM release is published, it will appear on [PLIUM Releases](https://github.com/ardss/PLIUM/releases). **Do not use upstream Edge-Drop installers to update PLIUM.**

## Build from source

Requires Windows x64, Node.js 22+ and npm.

```powershell
git clone https://github.com/ardss/PLIUM.git
cd PLIUM
npm ci
npm run typecheck
npm test
npm run build:win
```

The unsigned local installer is built under `dist/`. For development use `npm run dev`. Verify downloaded or locally built binaries and back up your data before installation; do not run PLIUM and another clipboard watcher side by side on a production session.

## Identity, privacy and migrations

PLIUM uses `PLIUM.exe`, AppID `com.ardss.plium` and a separate profile under `%APPDATA%\plium`. It never uses the upstream's online updater, store listing or installer identity. Historical Edge-Drop clipboard profiles are not silently replaced; migrating from an original installation requires explicit backup and verification.

See [Privacy](PRIVACY.md), [Security reporting](SECURITY.md), [Upstream history](UPSTREAM-HISTORY.md) and [Preview release / migration notes](PLIUM-PREVIEW.md).

## Feedback and contribution

Open an [issue](https://github.com/ardss/PLIUM/issues) with the app version, Windows version, layout, reproduction steps and non-sensitive logs. **Never share real clipboard contents, credentials, private images or personal data in public issues.**

Source lives in `src/` (React UI), `electron/` (desktop/native), `shared/` (contracts) and `tests/` (automated QA). This fork's default `main` branch is the PLIUM product; `upstream-sync` preserves the original project's sync baseline.

## Attribution

PLIUM is an independent derivative of [Deepender25/Edge-Drop](https://github.com/Deepender25/Edge-Drop) and retains the original authors' copyright, history and the [Apache-2.0 license](LICENSE). PLIUM branding, features and maintenance are independent and do not imply upstream endorsement.

**PLIUM · 叠间** — keep useful things within reach.
