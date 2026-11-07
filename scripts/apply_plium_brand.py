# -*- coding: utf-8 -*-
"""PLIUM (ClipVault Next) branding; never modifies Kynoptic/KY."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]

def edit(rel, old, new):
    p = root / rel
    s = p.read_text(encoding="utf-8")
    if old in s:
        p.write_text(s.replace(old, new), encoding="utf-8")
    elif new not in s:
        raise RuntimeError("Unexpected source: " + rel + " / " + old[:50])

edit("electron/main/config.ts", "appName: 'Edge-Drop'", "appName: 'PLIUM'")
edit("electron/main/index.ts", "app.setAppUserModelId('com.edgedrop.app')",
     "app.setAppUserModelId('com.ardss.plium')")
edit("electron/main/tray.ts", "tray.setToolTip('Edge-Drop')", "tray.setToolTip('PLIUM · 叠间')")
edit("electron/main/loginItems.ts",
     "  'Edge-Drop',\n  'com.edgedrop.app',\n  'electron.app.Edge-Drop'",
     "  'PLIUM',\n  'com.ardss.plium',\n  'electron.app.PLIUM'")
edit("electron/main/loginItems.ts",
     "CANONICAL_LOGIN_ITEM_NAME = 'Edge-Drop'",
     "CANONICAL_LOGIN_ITEM_NAME = 'PLIUM'")
edit("electron/store/paths.ts", "'Temp', 'Edge-Drop'", "'Temp', 'PLIUM'")
edit("src/components/Settings.tsx",
     "Edge-Drop {currentVersion", "PLIUM · 叠间 {currentVersion")
edit("src/components/Settings.tsx",
     "'ABOUT EDGE-DROP'", "'ABOUT PLIUM'")
edit("src/components/Settings.tsx",
     "https://www.edgedrop.app/supportedgedrop", "https://github.com/ardss/Edge-Drop")
edit("src/components/Settings.tsx",
     "https://github.com/Deepender25/Edge-Drop/issues/new/choose",
     "https://github.com/ardss/Edge-Drop/issues")
edit("src/components/Settings.tsx",
     "https://github.com/Deepender25/Edge-Drop", "https://github.com/ardss/Edge-Drop")
edit("src/components/Settings.tsx",
     "<span>{t('footer.supportOnKofi')}</span>", "<span>PLIUM 开源代码</span>")
for rel in ("src/components/Header.tsx", "src/i18n/translations.ts"):
    p = root / rel
    s = p.read_text(encoding="utf-8").replace("Deepender25/Edge-Drop", "ardss/Edge-Drop")
    if rel.endswith("translations.ts"):
        s = s.replace("Edge-Drop", "PLIUM").replace("Edge Drop", "PLIUM")
    p.write_text(s, encoding="utf-8")
(root/"src/assets/wordmark.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 160" role="img" aria-label="PLIUM 叠间">'
    '<text x="16" y="112" fill="currentColor" font-family="Segoe UI,Arial,sans-serif" font-size="112" font-weight="650" letter-spacing="13">PLIUM</text>'
    '<text x="608" y="103" fill="currentColor" font-family="Microsoft YaHei UI,Noto Sans CJK SC,sans-serif" font-size="40">叠间</text>'
    '</svg>\n', encoding="utf-8")

# No owned release feed exists. Disable ALL updater entry points, including manual and
# fast GitHub API checks, so this fork cannot fetch an upstream Edge-Drop installer.
updater = """// PLIUM preview: updates disabled until our own verified release feed exists.
// Upstream update implementation remains accessible in Git history.
export interface CachedUpdateInfo {
  hasUpdate: boolean
  latestVersion: string
  downloaded: boolean
  downloadProgress?: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }
}
export function getCachedUpdateState(): CachedUpdateInfo | null { return null }
export function clearCachedUpdateState(): void {}
export function quitAndInstallUpdate(): void {}
export function syncAutoUpdaterState(): void {}
export function triggerBackgroundCheck(delayMs = 3000): void { void delayMs }
export async function checkForUpdatesManual(): Promise<{ status: string; version?: string; error?: string }> {
  return { status: 'error', error: 'PLIUM preview updates are disabled until a verified release channel exists.' }
}
export async function startUpdateDownload(): Promise<void> {}
export function initAutoUpdater(): void {}
"""
(root/"electron/main/updater.ts").write_text(updater, encoding="utf-8")

pkg_path = root/"package.json"
pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
pkg["name"] = "plium"
pkg["version"] = "0.4.0-plium.1"
pkg["description"] = "PLIUM / 叠间 - an edge clipboard shelf for Windows"
pkg["author"] = "PLIUM contributors"
build = pkg["build"]
build["appId"] = "com.ardss.plium"
build["productName"] = "PLIUM"
build["win"]["target"] = [{"target": "nsis", "arch": ["x64"]}]
build["nsis"]["shortcutName"] = "PLIUM 叠间"
build["nsis"]["artifactName"] = "PLIUM-Setup-" + '$' + "{version}." + '$' + "{ext}"
build.pop("publish", None)
build.pop("appx", None)
build["extraResources"] = [x for x in build.get("extraResources", []) if "EdgeDropStartup" not in x.get("from", "")]
disabled = "node -e \"console.error('PLIUM MSIX preview distribution is disabled');process.exit(1)\""
pkg["scripts"]["build:store"] = disabled
pkg["scripts"]["build:msix"] = disabled
pkg_path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
lock_path = root/"package-lock.json"
lock = json.loads(lock_path.read_text(encoding="utf-8"))
lock["name"] = "plium"
lock["version"] = pkg["version"]
lock["packages"][""]["name"] = "plium"
lock["packages"][""]["version"] = pkg["version"]
lock_path.write_text(json.dumps(lock, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
landing = root/"index.html"
landing.write_text(landing.read_text(encoding="utf-8").replace("Edge-Drop", "PLIUM").replace("Edge Drop", "PLIUM"), encoding="utf-8")
for required in ("src/assets/logo.svg", "resources/icon.ico", "resources/icon.png", "resources/tray.png", "resources/tray-dark.png"):
    if not (root/required).is_file():
        raise RuntimeError("Missing icon asset: " + required)
(root/"PLIUM-PREVIEW.md").write_text("""# PLIUM / 叠间 — local preview

Independent fork of Edge-Drop, licensed under Apache-2.0. Not the original Edge-Drop.
Selected product name: PLIUM / 叠间; Windows AppID: com.ardss.plium; NSIS preview.
Upstream auto-updates and manual release download are both intentionally disabled.
No MS Store package, original updater feed, or original Edge-Drop startup helper is distributed.
Existing ClipVault/Edge-Drop profile databases are deliberately NOT modified or auto-migrated.
The 3 previously accepted interactions are based on the integrated shelf branch:
top docking navigation, end-of-scroll quick actions and compact/expanded row controls.
Real clipboard text/images/files, drag-out and focus tests are required before daily rollout.
Original Edge-Drop authorship is attributed in LICENSE and project source history.
""", encoding="utf-8")
print("PLIUM_BRAND_APPLIED",pkg["version"],build["appId"])
