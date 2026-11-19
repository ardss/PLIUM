/**
 * Auto-update for PLIUM.
 *
 * ## Channel
 * Only `github.com/ardss/PLIUM` is a valid feed (see updateChannel.ts). The
 * packaged `app-update.yml` is verified against that channel at startup; a
 * mismatch disables updating instead of trusting an unexpected feed.
 *
 * ## When updates install
 * PLIUM follows the platform norm (Chrome, Edge, electron-updater v27+): the
 * update is applied while the app is *not* running — on quit, or right away if
 * the user clicks "restart to install". We never wait for an idle desktop,
 * because that gate is unsatisfiable wherever input arrives continuously
 * (remote desktop, KVM switches, accessibility tools) and it turns "when can I
 * update?" into an external condition nobody controls.
 */
import { app, net } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as electronUpdater from 'electron-updater'
import { isStoreBuild, runtime } from './config'
import { pushState } from './state'
import { getSettings } from '../store/settings'
import { resolveUpdateMode, type UpdateMode } from '../../shared/types'
import {
  compareVersions,
  isTrustedUpdateChannel,
  parseUpdateChannelYml,
  releaseApiUrl,
  resolveInstallPolicy,
  type InstallPolicy,
  type UpdateChannelConfig
} from './updateChannel'

export interface CachedUpdateInfo {
  hasUpdate: boolean
  latestVersion: string
  downloaded: boolean
  downloadProgress?: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }
}

/** The subset of electron-updater's surface this module actually drives. */
interface AutoUpdaterLike {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  autoRunAppAfterInstall: boolean
  forceDevUpdateConfig: boolean
  logger: unknown
  on(event: string, listener: (...args: never[]) => void): void
  checkForUpdates(): Promise<{ updateInfo?: { version: string } } | null | undefined>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void
}

let _autoUpdater: AutoUpdaterLike | null = null
let _cachedUpdateInfo: CachedUpdateInfo | null = null
/** Set when the packaged feed is missing or points outside the trusted channel. */
let _channelError: string | null = null
let _channelChecked = false
let _backgroundTimer: ReturnType<typeof setTimeout> | null = null

function messageOf(err: unknown): string {
  if (typeof err === 'string') return err
  const maybe = (err as { message?: unknown })?.message
  return typeof maybe === 'string' ? maybe : String(err)
}

function getAutoUpdater(): AutoUpdaterLike | null {
  if (_autoUpdater) return _autoUpdater
  const mod = electronUpdater as unknown as {
    autoUpdater?: AutoUpdaterLike
    default?: { autoUpdater?: AutoUpdaterLike }
  }
  // ESM interop: the named export exists when Node's CJS lexer detects it,
  // otherwise the CJS module object arrives as `default`.
  _autoUpdater = mod.autoUpdater ?? mod.default?.autoUpdater ?? null
  return _autoUpdater
}

export function getCachedUpdateState(): CachedUpdateInfo | null {
  return _cachedUpdateInfo
}

export function clearCachedUpdateState(): void {
  _cachedUpdateInfo = null
}

/** Exposed for diagnostics and tests: null when the channel is trusted, else the reason. */
export function getUpdateChannelError(): string | null {
  return _channelError
}

/**
 * Read and verify the packaged feed. Unpackaged runs have no `app-update.yml`,
 * so they are treated as "no feed" unless a dev config is explicitly allowed.
 */
function verifyUpdateChannel(): UpdateChannelConfig | null {
  if (_channelChecked) {
    return _channelError ? null : { provider: 'github', owner: 'ardss', repo: 'PLIUM' }
  }
  _channelChecked = true
  const configPath = join(process.resourcesPath ?? '', 'app-update.yml')
  if (!existsSync(configPath)) {
    _channelError = 'update feed file app-update.yml is missing from the packaged resources'
    console.warn('[AutoUpdater] ' + _channelError)
    return null
  }
  let raw: string
  try {
    raw = readFileSync(configPath, 'utf8')
  } catch (err) {
    _channelError = 'cannot read app-update.yml: ' + messageOf(err)
    console.warn('[AutoUpdater] ' + _channelError)
    return null
  }
  const channel = parseUpdateChannelYml(raw)
  if (!isTrustedUpdateChannel(channel)) {
    _channelError =
      'update feed is not the PLIUM release channel (expected github ardss/PLIUM, got ' +
      (channel ? `${channel.provider} ${channel.owner}/${channel.repo}` : 'unparsable app-update.yml') +
      ')'
    console.error('[AutoUpdater] ' + _channelError + ' — updates disabled.')
    return null
  }
  return channel
}

/** True when this build may talk to the update feed at all. */
function updaterUsable(): boolean {
  if (isStoreBuild()) return false
  if (!app.isPackaged && !process.env.PLIUM_DEV_UPDATE_CONFIG) return false
  return verifyUpdateChannel() !== null
}

/**
 * Apply the user's mode to electron-updater. Called at startup and whenever the
 * setting changes. Only 'auto' downloads and installs unattended; the install
 * always lands on app quit, never mid-session.
 */
function applyPolicy(updater: AutoUpdaterLike, policy: InstallPolicy): void {
  updater.autoDownload = policy.autoDownload
  updater.autoInstallOnAppQuit = policy.installOnAppQuit
  updater.autoRunAppAfterInstall = true
  if (!app.isPackaged && process.env.PLIUM_DEV_UPDATE_CONFIG) {
    updater.forceDevUpdateConfig = true
  }
}

/**
 * Called from ipc.ts when the renderer clicks "Restart to install". This is the
 * only path that stops a running session, and the user asked for it.
 */
export function quitAndInstallUpdate(): void {
  if (isStoreBuild()) return
  const updater = getAutoUpdater()
  if (!updater) {
    console.error('[AutoUpdater] quitAndInstall requested but autoUpdater is not initialized.')
    return
  }
  if (!app.isPackaged && !process.env.PLIUM_DEV_UPDATE_CONFIG) {
    console.log('[AutoUpdater] Dev mode — quitAndInstall is a no-op. Works in packaged builds.')
    return
  }
  if (!_cachedUpdateInfo?.downloaded) {
    console.warn('[AutoUpdater] quitAndInstall requested but no update has been downloaded yet.')
    return
  }
  console.log('[AutoUpdater] quitAndInstall triggered by renderer button.')
  runtime.quitting = true
  updater.quitAndInstall(false, true)
}

/** Re-apply the mode after the user changes it in Settings. */
export function syncAutoUpdaterState(): void {
  if (isStoreBuild()) return
  const updater = getAutoUpdater()
  if (!updater) return
  let mode: UpdateMode
  try {
    mode = resolveUpdateMode(getSettings())
  } catch {
    return
  }
  applyPolicy(updater, resolveInstallPolicy(mode))
  console.log('[AutoUpdater] Policy synced for mode =', mode)
}

/**
 * Run a check outside startup — e.g. right after the user switches into 'auto'
 * or 'notify'. Debounced; switching to 'off' cancels a pending check so 'off'
 * stays fully network-silent.
 */
export function triggerBackgroundCheck(delayMs = 3000): void {
  if (isStoreBuild()) return
  if (_backgroundTimer !== null) {
    clearTimeout(_backgroundTimer)
    _backgroundTimer = null
  }
  let mode: UpdateMode
  try {
    mode = resolveUpdateMode(getSettings())
  } catch {
    return
  }
  if (!resolveInstallPolicy(mode).checkAtStartup) return
  const updater = getAutoUpdater()
  if (!updater) return
  console.log('[AutoUpdater] Background check scheduled (mode switch).')
  _backgroundTimer = setTimeout(() => {
    _backgroundTimer = null
    try {
      const result = updater.checkForUpdates()
      if (result && typeof result.catch === 'function') {
        result.catch((err: unknown) => console.warn('[AutoUpdater] triggered check failed:', messageOf(err)))
      }
    } catch (err) {
      console.warn('[AutoUpdater] triggered check threw:', messageOf(err))
    }
  }, Math.max(0, delayMs))
}

/**
 * Fast direct check against the PLIUM GitHub Releases API. Resolves in well
 * under a second and never throws; `null` means "could not tell".
 */
function checkReleaseApi(): Promise<{ tag_name?: string } | null> {
  return new Promise((resolve) => {
    try {
      const request = net.request({ method: 'GET', url: releaseApiUrl() })
      request.setHeader('User-Agent', 'PLIUM-App')
      request.setHeader('Accept', 'application/vnd.github.v3+json')

      const timer = setTimeout(() => {
        try {
          request.abort()
        } catch {
          /* ignore */
        }
        resolve(null)
      }, 4000)

      request.on('response', (response) => {
        let body = ''
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => {
          clearTimeout(timer)
          try {
            resolve(response.statusCode === 200 ? (JSON.parse(body) as { tag_name?: string }) : null)
          } catch {
            resolve(null)
          }
        })
      })

      request.on('error', () => {
        clearTimeout(timer)
        resolve(null)
      })

      request.end()
    } catch {
      resolve(null)
    }
  })
}

/**
 * Manual "check now". Tries the fast release API first so the UI answers
 * immediately, then falls back to electron-updater so a download remains
 * possible from the same code path.
 */
export async function checkForUpdatesManual(): Promise<{ status: string; version?: string; error?: string }> {
  if (isStoreBuild()) {
    return { status: 'up-to-date', version: app.getVersion() }
  }
  if (!updaterUsable()) {
    return { status: 'error', error: _channelError ?? 'updates are unavailable for this build' }
  }

  const currentVersion = app.getVersion()

  const fast = await checkReleaseApi()
  if (fast?.tag_name) {
    const latestVersion = fast.tag_name.replace(/^v/i, '')
    if (compareVersions(latestVersion, currentVersion) > 0) {
      console.log(`[AutoUpdater] Release API reports v${latestVersion} (current v${currentVersion})`)
      _cachedUpdateInfo = { hasUpdate: true, latestVersion, downloaded: false }
      pushState.updateAvailable({ version: latestVersion })
      return { status: 'available', version: latestVersion }
    }
    console.log(`[AutoUpdater] Release API confirms v${currentVersion} is current`)
    return { status: 'up-to-date', version: currentVersion }
  }

  const updater = getAutoUpdater()
  if (!updater) {
    return { status: 'error', error: 'update component is unavailable in this build' }
  }
  try {
    const result = await updater.checkForUpdates()
    const latest = result?.updateInfo?.version
    if (latest && compareVersions(latest, currentVersion) > 0) {
      _cachedUpdateInfo = { hasUpdate: true, latestVersion: latest, downloaded: false }
      pushState.updateAvailable({ version: latest })
      return { status: 'available', version: latest }
    }
    return { status: 'up-to-date', version: currentVersion }
  } catch (err) {
    return { status: 'error', error: messageOf(err) }
  }
}

/** Download the pending update in manual/notify mode. */
export async function startUpdateDownload(): Promise<void> {
  if (isStoreBuild() || !updaterUsable()) return
  const updater = getAutoUpdater()
  if (!updater) return
  try {
    await updater.downloadUpdate()
  } catch (err) {
    console.warn('[AutoUpdater] downloadUpdate failed, retrying after a fresh check:', messageOf(err))
    try {
      await updater.checkForUpdates()
      await updater.downloadUpdate()
    } catch (retryErr) {
      console.error('[AutoUpdater] downloadUpdate retry failed:', messageOf(retryErr))
    }
  }
}

/**
 * Wire electron-updater once at startup. Store/MSIX builds stay disabled to
 * comply with Store policy; builds without a trusted feed stay disabled too.
 */
export function initAutoUpdater(): void {
  if (isStoreBuild()) {
    console.log('[AutoUpdater] Store build detected — auto-updater disabled.')
    return
  }
  if (!updaterUsable()) {
    console.log('[AutoUpdater] No trusted update feed for this build — staying offline.')
    return
  }

  const updater = getAutoUpdater()
  if (!updater) {
    console.error('[AutoUpdater] electron-updater could not be loaded.')
    return
  }

  let mode: UpdateMode
  try {
    mode = resolveUpdateMode(getSettings())
  } catch {
    mode = 'auto'
  }
  const policy = resolveInstallPolicy(mode)
  applyPolicy(updater, policy)

  updater.logger = {
    info: (m: string) => console.log('[AutoUpdater]', m),
    warn: (m: string) => console.warn('[AutoUpdater]', m),
    error: (m: string) => console.error('[AutoUpdater]', m),
    debug: () => {}
  }

  updater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for update. Current version:', app.getVersion())
  })

  updater.on('update-available', ((info: { version: string }) => {
    console.log('[AutoUpdater] New version available:', info.version)
    _cachedUpdateInfo = { hasUpdate: true, latestVersion: info.version, downloaded: false }
    pushState.updateAvailable({ version: info.version })
  }) as never)

  updater.on('update-not-available', ((info: { version: string }) => {
    console.log('[AutoUpdater] Up to date. Latest:', info.version, 'Current:', app.getVersion())
  }) as never)

  updater.on(
    'download-progress',
    ((progress: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }) => {
      const percent = Math.min(100, Math.max(0, Math.round(progress.percent || 0)))
      if (_cachedUpdateInfo) {
        _cachedUpdateInfo.downloadProgress = {
          percent,
          bytesPerSecond: progress.bytesPerSecond,
          transferred: progress.transferred,
          total: progress.total
        }
      }
      pushState.updateProgress({
        percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      })
    }) as never
  )

  updater.on('update-downloaded', ((info: { version: string }) => {
    // Staged only. The swap happens on quit (autoInstallOnAppQuit) or when the
    // user clicks "Restart to install" — never in the middle of a session.
    console.log('[AutoUpdater] Update staged, will install when PLIUM exits:', info.version)
    _cachedUpdateInfo = { hasUpdate: true, latestVersion: info.version, downloaded: true }
    pushState.updateDownloaded({ version: info.version })
  }) as never)

  updater.on('error', ((err: Error | string) => {
    console.warn('[AutoUpdater] Update error:', messageOf(err))
  }) as never)

  if (policy.checkAtStartup) {
    setTimeout(() => {
      try {
        const result = updater.checkForUpdates()
        if (result && typeof result.catch === 'function') {
          result.catch((err: unknown) => console.warn('[AutoUpdater] startup check failed:', messageOf(err)))
        }
      } catch (err) {
        console.warn('[AutoUpdater] startup check threw:', messageOf(err))
      }
    }, 3000)
  } else {
    console.log('[AutoUpdater] Updates disabled by user setting. Staying network-silent.')
  }
}
