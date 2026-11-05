# CV Brand Foundation V1 — productization concept

Date: 2026-11-05
Status: **Design proposal / NOT approved as final product name, art, installer identity, or public release**
Project: clipvault-next (our fork of Deepender25/Edge-Drop)
Branch: design/cv-brand-foundation-v1
User acceptance environment: Windows A; development: Windows B.

## 1. Brand idea

**Silent until useful**: a small, precise shelf that hides at the screen edge; when needed it opens instantly, allows people to recognize what they copied, drag it out, and return to work.

We sell a behavior and a feeling, not a list of features:
- Copy → quietly collect
- Reach edge → reveal
- Drag → use
- Fold → disappear

Use compact verbs and show real interaction before feature claims. Avoid treating the clipboard manager as a dashboard, web app, AI agent, cloud storage, or giant file explorer.

Provisional Chinese message: **收好每一次复制，伸手就能用。**
Provisional English: **Keep what you copy. Use it in a flick.**
Neither is a registered slogan or finalized marketing copy.

## 2. Naming / clearance gate

- Working code name stays **CV**.
- Visual exploration name: **PLIUM / 叠间**, NOT an approved final name.
- A public search has already surfaced a **PLIUM** name used in technology/cybersecurity as well as other fields; do not assume distinctiveness or trademark rights.
- Before assigning permanent app identity, perform CN trademark search (software category 9, online software/services category 42 and relevant related classes), global registry search for intended distribution markets, domain, GitHub, Microsoft Store and social handles. Obtain appropriate professional advice for high-stakes clearance.
- Name should be 4–8 readable letters, internationally pronounceable, visually compatible with one simple geometric mark, and not include `Edge-Drop` or a lookalike of the upstream brand.

## 3. Identity concept: the edge fold

Design the mark as **one sheet/edge folding out**, not a copy/paste clipboard symbol:
- One continuous structural shape + one controlled exposed fold.
- Recognizable in a monochrome 16px tray icon; contrast at 16/20/24px before finalizing full-color art.
- The fold can turn ~90 degrees in a short transform, echoing the real collapsed/expanded behavior.
- Avoid document-corner cliché, overlapping-cards pile, 3D mockup-only identity, gradients and glossy volumetric effects.
- The brand mark is intentionally monochrome in all shipping variants. Use positive/negative space, the folded edge and restrained animation for recognition. Do NOT add a brand accent color.
- Have four exports based on ONE master vector: full brand lockup, compact app icon, single-color tray icon, installer/Store icon set. Add dark/light variants and a "preview/beta" marker visually distinct from stable.
- Do not use or trace the upstream project's logo, mark, illustration, onboarding assets, or screenshots as our own brand originals.

## 4. Visual system and constraints (provisional)

- Match the existing black/white visual identity: near-black canvas #151515; elevated neutral #242424; off-white text #F2F2F0; muted neutral #969696; dividers #353535. These are candidates, not a forced UI re-theme.
- No new green, lime, purple, or other brand accent color. Active/focus/drag states rely on white/grey contrast, opacity, shape and motion; preserve any color inherent in the user's copied content instead of tinting it.
- Rounded geometry: 8–12px for item surfaces; 12–16px for floating panel; circles only for icon-only controls.
- Thin separation and clear spatial hierarchy; remove decorative borders where grouping can be conveyed with spacing.
- Minimal type hierarchy: UI text remains small/compact; larger expressive typography belongs only on website/launch assets, not inside always-on panel.
- Motion: 160–240ms for gentle states, existing FLIP/window geometry path for fold, follow prefers-reduced-motion. No animated glow, bounce or constant attention-grabbing effects.
- Preserve content priority: the clipboard cards are the hero, not the logo. The mark appears in tray, About, installer and optional initial tour, not repeated on every shelf row.
- Colors and values are **design candidates**, not a mandate to restyle the user's already accepted panel.

## 5. Product surfaces — what the user will see

### Daily shelf
- Collapsed (semantic label **折叠** when action will collapse; **展开** when action will expand) and expanded are the only public terms. Internally row counts may persist.
- Header has search, contextual item count, lightweight icon-only folding chevron, useful actions. No large product wordmark in the header.
- Every item retains native content identity; images remain images, no gratuitous branded cards.
- Quiet neutral idle UI; active tab, focus and drag targets use grayscale luminance, shape and restrained motion, never a new accent hue.
- Empty state: one useful sentence + short action, no enormous illustration.

### System entry points
- Windows EXE icon, installer, Add/Remove Programs, desktop/start-menu shortcut, taskbar/tray icon, startup app entry, Windows notification/app name: OUR approved product name only.
- Distinct appId/AUMID, registry Run value and profile directory; no collision with original Edge-Drop or legacy ClipVault.
- Error/report links point to our channel; upstream references only in licenses/acknowledgements as required.

### Settings / About
- First-level sections: Appearance, Behavior, Data & Privacy, Updates, Help & Feedback.
- A compact About footer: product mark, our version, channel (Preview/Stable), origin attribution link.
- Separate **Open source licenses & acknowledgements** view retains Apache-2.0, notices and modification information (not a branded endorsement).
- Remove direct Ko-fi/UPI solicitation and upstream issue/release calls from our user-facing product. Upstream project remains cited in legal/credits and source history.

### First-run experience
- Three high-signal gestures only: copy something → it appears; drag out → paste; fold/unfold → disappear/return.
- Use the actual live UI/verified media; don't make up product capabilities.
- Privacy line must be proved against actual code and telemetry. Do not claim offline/privacy features without verification.

### Marketing
- First impression shows the real Windows desktop and a *single* discoverable interaction, not abstract animation.
- Short page: one-line proposition, ~6–12s genuine screen recording, download CTA, 3 concise capability proofs, platform/requirements and release note.
- Real tool screenshots and a copy/paste demo are preferred over generative UI composites.
- Open-source attribution and license access live in footer/credits, not omitted.

## 6. Code ownership boundaries for future upstream merges

Create a small brand source of truth to power UI copy, links and colors; **do not pretend a TS config alone changes Windows installer metadata**:
- Product constants (approved name, support URLs, feedback, docs, license route) in a brand module consumed by frontend/main process.
- Build metadata (package name, appId, productName, artifactName, NSIS identity, tray icons, Store identity) generated from a reviewed build-time brand manifest; test generated output and actual packed EXE.
- Channel-specific update feed (Preview disabled until owned feed exists; Stable points ONLY to our release endpoint). Both electron-updater source and fast-path GitHub Releases request must follow the same policy.
- Translation keys should separate brand tokens from language sentences; audit all 31 locales without deleting needed translation keys indiscriminately.
- Own data migration code separate from brand/UI; leave upstream storage format unchanged when possible, migrate with backup + explicit rollback safety.
- Keep `upstream/main` unchanged. Implement brand on its own feature branch/PR, merge in our fork after tests. Upstream sync is a separate branch that reconciles upstream commit ranges.

## 7. Implementation sequence (no public release before gates)

**B0 Brand review (current):** choose concept, typography and icon constraints; brand-name clearance not yet passed. Design document only.

**B1 Visual skin preview:** vector logomark and needed dark/light/monochrome assets; About and settings prototype in Windows B test profile. Do not touch Windows A acceptance installation or user data.

**B2 Identity & system package:** after name approval, replace app/product IDs, startup helpers, registry names, packaging icons, source URLs, readme, donation/feedback, update URLs and brand text; generate 31 locale substitutions safely.

**B3 Migration & release protection:** separate userData roots and official auto-updates; one-way migration from old preview only after explicit backup, restore if failure. Test co-installation with official, legacy ClipVault, and prior preview.

**B4 Release validation:** typecheck; complete relevant test suite; native Windows B & A installation, clipboard images/text/files, drag-out, fold/expand, launch at login, uninstall and rollback; accurate SHA hashes, changelog, version number and provenance.

**B5 Launch:** first publish a clearly named preview/beta to our own release location, then stable only after real-user feedback and reliability gates.

## 8. Definition of done

- [ ] Approved brand name passed relevant marketplace/mark checks and naming decision recorded.
- [ ] Final 16px, 24px, 64px and 256px icon assets and light/dark/tray cases reviewed on real Windows UI.
- [ ] No upstream logo or support/download links in primary product surfaces.
- [ ] Apache-2.0 and third-party license/attribution requirements retained and documented; no false affiliation.
- [ ] Installer/AppID/AUMID/registry startup and userData locations unique to us; upstream can coexist.
- [ ] Neither automatic nor manual updater can install the upstream Edge-Drop official package.
- [ ] Legacy user profile migrated or explicitly left untouched; backups and rollback verified with actual data.
- [ ] Full test failures triaged; independently verified packaged app on Windows B and A.
- [ ] Accurate version, download, documentation, issue reporting and update logs available.
- [ ] All remote release actions remain explicit and auditable.

## 9. Current source audit anchors (2026-11-05)

- `package.json`: `name`, `productName`, `appId`, `build.publish`, `win`, `nsis`, `appx`, artwork.
- `src/components/Settings.tsx`: upstream community, about, support and issue links.
- `src/components/Header.tsx`: upstream changelog link.
- `src/i18n/translations.ts`: brand phrasing in 31 locales.
- `electron/main/updater.ts`: separate upstream GitHub fast-check + electron-updater.
- `electron/main/loginItems.ts`, `electron/main/index.ts`: Windows app/Run identity.
- `electron/store/paths.ts`: userData and MSIX external temp path.
- `resources/icon.*`, `resources/tray*.png`, `resources/appx/*`, `src/assets/logo.svg`, `src/assets/wordmark.svg`: asset families.
- `README.md`, `.github/FUNDING.yml`: public links, upstream sponsorship and downloads.
- Rough source-scan count: 28 files referencing upstream markers; not all should be replaced (license/historical references matter).

## 10. Decisions and non-decisions

Chosen for V1 concept: monochrome geometry-based fold (black / white / gray only); brand recognition via silhouette and interaction rather than hue; branding kept out of primary clipboard content; separate fork release channel; no large UI redesign required.

Not chosen: final product name, legal app ID, website domain, contact address, logo art export, public release tag, pricing, analytics. These must not be invented or committed as final.

Safety: This proposal commits no runtime/packaging changes. Windows A continues running the accepted preview, untouched.
