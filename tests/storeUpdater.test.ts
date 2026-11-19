import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * Behavior tests for the updater.
 *
 * The contract under test:
 *  - only the PLIUM GitHub feed may be used (an upstream feed disables updates);
 *  - updates install while the app is not running, never mid-session;
 *  - 'off' stays fully network-silent, 'notify' never auto-downloads.
 */
const state = vi.hoisted(() => ({
  isPackaged: true,
  isStore: false,
  mode: 'auto' as 'auto' | 'notify' | 'off',
  handlers: {} as Record<string, (...args: unknown[]) => void>,
  netRequest: vi.fn(),
  push: {
    updateAvailable: vi.fn(),
    updateProgress: vi.fn(),
    updateDownloaded: vi.fn()
  },
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0',
    get isPackaged() {
      return state.isPackaged
    }
  },
  net: { request: (...args: unknown[]) => state.netRequest(...args) }
}))

vi.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    autoRunAppAfterInstall: false,
    forceDevUpdateConfig: false,
    logger: null,
    on(event: string, fn: (...args: unknown[]) => void) {
      state.handlers[event] = fn
    },
    checkForUpdates: (...args: unknown[]) => state.checkForUpdates(...args),
    downloadUpdate: (...args: unknown[]) => state.downloadUpdate(...args),
    quitAndInstall: (...args: unknown[]) => state.quitAndInstall(...args)
  }
}))

vi.mock('../electron/main/config', () => ({
  isStoreBuild: () => state.isStore,
  runtime: { quitting: false }
}))

vi.mock('../electron/main/state', () => ({ pushState: state.push }))

vi.mock('../electron/store/settings', () => ({
  getSettings: () => ({ updateMode: state.mode, autoUpdates: state.mode !== 'off' })
}))

let resourcesDir = ''

function writeFeed(contents: string | null): void {
  if (contents === null) return
  writeFileSync(join(resourcesDir, 'app-update.yml'), contents, 'utf8')
}

const PLIUM_FEED = ['provider: github', 'owner: ardss', 'repo: PLIUM', 'releaseType: release', ''].join('\n')
const UPSTREAM_FEED = ['provider: github', 'owner: Deepender25', 'repo: Edge-Drop', ''].join('\n')

/** Load a fresh updater module so its one-shot feed check runs again. */
async function loadUpdater() {
  vi.resetModules()
  return import('../electron/main/updater')
}

beforeEach(() => {
  resourcesDir = mkdtempSync(join(tmpdir(), 'plium-update-'))
  ;(process as unknown as { resourcesPath: string }).resourcesPath = resourcesDir
  state.isPackaged = true
  state.isStore = false
  state.mode = 'auto'
  state.handlers = {}
  state.netRequest.mockReset()
  state.push.updateAvailable.mockReset()
  state.push.updateProgress.mockReset()
  state.push.updateDownloaded.mockReset()
  state.checkForUpdates.mockReset().mockResolvedValue(null)
  state.downloadUpdate.mockReset().mockResolvedValue(undefined)
  state.quitAndInstall.mockReset()
  // Force the fast release API to fail so the electron-updater path is used.
  state.netRequest.mockImplementation(() => ({
    setHeader: () => {},
    abort: () => {},
    end: () => {},
    on: (event: string, fn: () => void) => {
      if (event === 'error') setTimeout(fn, 0)
    }
  }))
})

afterEach(() => {
  rmSync(resourcesDir, { recursive: true, force: true })
  delete (process as unknown as { resourcesPath?: string }).resourcesPath
})

describe('update feed approval', () => {
  it('accepts the packaged PLIUM feed', async () => {
    writeFeed(PLIUM_FEED)
    const updater = await loadUpdater()
    expect(await updater.checkForUpdatesManual()).toMatchObject({ status: 'up-to-date' })
    expect(updater.getUpdateChannelError()).toBeNull()
  })

  it('refuses an upstream Edge-Drop feed and never calls the updater', async () => {
    writeFeed(UPSTREAM_FEED)
    const updater = await loadUpdater()
    const result = await updater.checkForUpdatesManual()
    expect(result.status).toBe('error')
    expect(result.error).toContain('not the PLIUM release channel')
    expect(state.checkForUpdates).not.toHaveBeenCalled()
    expect(state.netRequest).not.toHaveBeenCalled()
    expect(updater.getUpdateChannelError()).toContain('Deepender25/Edge-Drop')
  })

  it('refuses a build with no feed file at all', async () => {
    const updater = await loadUpdater()
    const result = await updater.checkForUpdatesManual()
    expect(result.status).toBe('error')
    expect(result.error).toContain('app-update.yml')
  })

  it('stays disabled for Microsoft Store builds', async () => {
    writeFeed(PLIUM_FEED)
    state.isStore = true
    const updater = await loadUpdater()
    updater.initAutoUpdater()
    await expect(updater.checkForUpdatesManual()).resolves.toMatchObject({ status: 'up-to-date' })
    expect(state.checkForUpdates).not.toHaveBeenCalled()
  })
})

describe('install timing', () => {
  it('auto mode downloads in the background and installs on quit', async () => {
    writeFeed(PLIUM_FEED)
    state.mode = 'auto'
    vi.useFakeTimers()
    try {
      const updater = await loadUpdater()
      updater.initAutoUpdater()
      const mod = await import('electron-updater')
      const autoUpdater = mod.autoUpdater as unknown as { autoDownload: boolean; autoInstallOnAppQuit: boolean }
      expect(autoUpdater.autoDownload).toBe(true)
      // The swap waits for the app to stop running — never mid-session.
      expect(autoUpdater.autoInstallOnAppQuit).toBe(true)
      state.handlers['update-downloaded']?.({ version: '1.0.1' })
      expect(state.push.updateDownloaded).toHaveBeenCalledWith({ version: '1.0.1' })
      vi.advanceTimersByTime(3100)
      expect(state.checkForUpdates).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('notify mode checks but never auto-downloads or auto-installs', async () => {
    writeFeed(PLIUM_FEED)
    state.mode = 'notify'
    const updater = await loadUpdater()
    updater.initAutoUpdater()
    const mod = await import('electron-updater')
    const autoUpdater = mod.autoUpdater as unknown as { autoDownload: boolean; autoInstallOnAppQuit: boolean }
    expect(autoUpdater.autoDownload).toBe(false)
    expect(autoUpdater.autoInstallOnAppQuit).toBe(false)
  })

  it('off mode stays network-silent', async () => {
    writeFeed(PLIUM_FEED)
    state.mode = 'off'
    vi.useFakeTimers()
    try {
      const updater = await loadUpdater()
      updater.initAutoUpdater()
      vi.advanceTimersByTime(10_000)
      expect(state.checkForUpdates).not.toHaveBeenCalled()
      expect(state.netRequest).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not restart the app for an update nobody downloaded', async () => {
    writeFeed(PLIUM_FEED)
    const updater = await loadUpdater()
    updater.initAutoUpdater()
    updater.quitAndInstallUpdate()
    expect(state.quitAndInstall).not.toHaveBeenCalled()
  })

  it('installs only after the user asks, once an update is staged', async () => {
    writeFeed(PLIUM_FEED)
    const updater = await loadUpdater()
    updater.initAutoUpdater()
    state.handlers['update-downloaded']?.({ version: '1.0.1' })
    updater.quitAndInstallUpdate()
    expect(state.quitAndInstall).toHaveBeenCalledWith(false, true)
  })
})
