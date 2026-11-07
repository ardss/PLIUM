import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  events: new Map<string, () => void>(),
  menuTemplate: [] as Array<{ label?: string; click?: () => void }>,
  setContextMenu: vi.fn(),
  popup: vi.fn(),
  show: vi.fn(),
  focus: vi.fn(),
  toggle: vi.fn(),
  openSettings: vi.fn(),
  quit: vi.fn()
}))

vi.mock('node:child_process', () => ({ execFileSync: vi.fn().mockReturnValue('') }))
vi.mock('electron', () => {
  const image = { resize: vi.fn().mockReturnThis() }
  return {
    app: {
      getAppPath: () => process.cwd(),
      getPath: () => process.cwd(),
      getPreferredSystemLanguages: () => ['en-US'],
      quit: mocks.quit
    },
    nativeTheme: { shouldUseDarkColors: true, on: vi.fn() },
    nativeImage: { createFromPath: () => image, createFromBuffer: () => image },
    Tray: class {
      on(event: string, cb: () => void) { mocks.events.set(event, cb) }
      setImage = vi.fn()
      setToolTip = vi.fn()
      setContextMenu = mocks.setContextMenu
      popUpContextMenu = mocks.popup
      isDestroyed = () => false
    },
    Menu: {
      buildFromTemplate: (template: typeof mocks.menuTemplate) => {
        mocks.menuTemplate = template
        return { items: template }
      }
    },
    Notification: { isSupported: () => false },
    screen: { on: vi.fn() }
  }
})
vi.mock('../electron/store/settings', () => ({
  loadSettings: () => ({ language: 'en', stickPosition: 'top', incognito: false, hoverActivation: true }),
  saveSettings: vi.fn()
}))
vi.mock('../electron/main/window', () => ({
  getMainWindow: () => ({ focus: mocks.focus, isDestroyed: () => false }),
  setVisible: mocks.show,
  repositionWindow: vi.fn(),
  getDisplayListOptions: () => [],
  registerWindowRepositionListener: vi.fn(),
  popUpAndRetract: vi.fn()
}))
vi.mock('../electron/main/state', () => ({
  pushState: { togglePanel: mocks.toggle, openSettings: mocks.openSettings, settings: vi.fn() }
}))
vi.mock('../electron/main/onboardingWindow', () => ({ createOnboardingWindow: vi.fn() }))

import { createTray } from '../electron/main/tray'

describe('PLIUM system tray interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.events.clear()
    mocks.menuTemplate = []
    createTray()
  })

  it('opens idempotently on single click and double click instead of toggling twice', () => {
    expect(mocks.events.has('click')).toBe(true)
    expect(mocks.events.has('double-click')).toBe(true)
    mocks.events.get('click')!()
    mocks.events.get('click')!()
    mocks.events.get('double-click')!()
    expect(mocks.show).toHaveBeenCalledTimes(3)
    expect(mocks.show).toHaveBeenCalledWith(true)
    expect(mocks.focus).toHaveBeenCalledTimes(3)
    expect(mocks.toggle).toHaveBeenCalledTimes(3)
    expect(mocks.toggle).toHaveBeenNthCalledWith(1, true)
    expect(mocks.toggle).toHaveBeenNthCalledWith(2, true)
    expect(mocks.toggle).toHaveBeenNthCalledWith(3, true)
  })

  it('uses only the native right-click context menu, with Show, Settings and Quit', () => {
    expect(mocks.setContextMenu).toHaveBeenCalledOnce()
    expect(mocks.events.has('right-click')).toBe(false)
    expect(mocks.popup).not.toHaveBeenCalled()
    const labels = mocks.menuTemplate.map((item) => item.label)
    expect(labels).toContain('Show Clipboard')
    expect(labels).toContain('Settings')
    expect(labels).toContain('Quit PLIUM')
    mocks.menuTemplate.find((item) => item.label === 'Show Clipboard')!.click!()
    expect(mocks.toggle).toHaveBeenCalledWith(true)
    mocks.menuTemplate.find((item) => item.label === 'Settings')!.click!()
    expect(mocks.openSettings).toHaveBeenCalledOnce()
    mocks.menuTemplate.find((item) => item.label === 'Quit PLIUM')!.click!()
    expect(mocks.quit).toHaveBeenCalledOnce()
  })
})
