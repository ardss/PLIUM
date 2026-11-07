import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dockBladeHeight } from '../shared/types'

const root = join(__dirname, '..')
const read = (name: string) => readFileSync(join(root, name), 'utf8')
const pkg = JSON.parse(read('package.json'))

describe('PLIUM brand/upgrade safety gates', () => {
  it('uses a unique Windows app identity and NSIS preview target', () => {
    expect(pkg.name).toBe('plium')
    expect(pkg.build.appId).toBe('com.ardss.plium')
    expect(pkg.build.productName).toBe('PLIUM')
    expect(pkg.build.win.target.map((t: any) => t.target)).toEqual(['nsis'])
    expect(pkg.build.publish).toBeUndefined()
    expect(pkg.build.appx).toBeUndefined()
  })
  it('never checks or downloads an upstream Edge-Drop installer', () => {
    const updater = read('electron/main/updater.ts')
    expect(updater).not.toContain('api.github.com')
    expect(updater).not.toContain('checkForUpdates()')
    expect(updater).not.toContain('downloadUpdate()')
    expect(updater).toContain('preview updates are disabled')
  })
  it('does not reuse Edge-Drop startup Run keys', () => {
    const login = read('electron/main/loginItems.ts')
    expect(login).toContain("CANONICAL_LOGIN_ITEM_NAME = 'PLIUM'")
    expect(login).not.toContain("'electron.app.Edge-Drop'")
    expect(read('electron/main/index.ts')).toContain("setAppUserModelId('com.ardss.plium')")
  })
  it('contains approved metal-fold icon assets and source', () => {
    for (const name of ['src/assets/logo.svg', 'resources/icon.ico', 'resources/icon.png', 'resources/tray.png', 'resources/tray-dark.png']) {
      expect(existsSync(join(root, name))).toBe(true)
    }
  })
  it('preserves 1, 2 and 3-row geometry', () => {
    expect(dockBladeHeight(1)).toBeLessThan(dockBladeHeight(2))
    expect(dockBladeHeight(2)).toBeLessThan(dockBladeHeight(3))
    expect(read('electron/store/settings.ts')).toContain('Math.min(3, Math.max(1, Math.round(Number(out.dockRows) || 1)))')
    expect(read('src/components/Panel.tsx')).toContain('commitRows((settings.dockRows ?? 1) >= 3 ? 1')
  })
})
