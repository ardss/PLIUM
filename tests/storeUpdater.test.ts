import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const calls = vi.hoisted(() => ({
  netRequest: vi.fn(),
  updateAvailable: vi.fn(),
}))
vi.mock('electron', () => ({
  app: { getVersion: () => '0.4.0-plium.1', isPackaged: true },
  net: { request: (...args: unknown[]) => calls.netRequest(...args) }
}))
vi.mock('../electron/main/state', () => ({
  pushState: { updateAvailable: (...args: unknown[]) => calls.updateAvailable(...args) }
}))

import {
  checkForUpdatesManual,
  getCachedUpdateState,
  clearCachedUpdateState,
  quitAndInstallUpdate,
  initAutoUpdater,
  syncAutoUpdaterState,
  triggerBackgroundCheck,
  startUpdateDownload
} from '../electron/main/updater'

/** PLIUM preview deliberately has no signed/verified update feed. */
describe('PLIUM preview update isolation', () => {
  beforeEach(() => {
    calls.netRequest.mockReset()
    calls.updateAvailable.mockReset()
  })
  afterEach(() => delete process.env.APP_BUILD_TARGET)

  it.each(['github', 'store', ''] as const)(
    '%s build never downloads an Edge-Drop installer', async (target) => {
      process.env.APP_BUILD_TARGET = target
      expect(await checkForUpdatesManual()).toMatchObject({
        status: 'error',
        error: expect.stringContaining('PLIUM preview updates are disabled')
      })
      expect(calls.netRequest).not.toHaveBeenCalled()
      expect(calls.updateAvailable).not.toHaveBeenCalled()
    }
  )
  it('never initializes an auto-updater, even after background check', () => {
    initAutoUpdater()
    syncAutoUpdaterState()
    triggerBackgroundCheck(0)
    expect(calls.netRequest).not.toHaveBeenCalled()
    expect(calls.updateAvailable).not.toHaveBeenCalled()
  })
  it('never silently installs an unverified package', async () => {
    await expect(startUpdateDownload()).resolves.toBeUndefined()
    expect(quitAndInstallUpdate()).toBeUndefined()
    expect(calls.netRequest).not.toHaveBeenCalled()
  })
  it('exposes no previously downloaded upstream release', () => {
    expect(getCachedUpdateState()).toBeNull()
    clearCachedUpdateState()
    expect(getCachedUpdateState()).toBeNull()
  })
})