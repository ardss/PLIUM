import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  EXPLICIT_OPEN_EVENT, EXPLICIT_OPEN_GRACE_MS, remainingExplicitOpenGrace
} from '../src/hooks/useEdgeHover'

const root = join(__dirname, '..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('PLIUM tray/menu explicit open grace', () => {
  it('holds for five seconds after a deliberate reveal, without extending normal hover opens', () => {
    expect(EXPLICIT_OPEN_EVENT).toBe('panel:explicit-open')
    expect(EXPLICIT_OPEN_GRACE_MS).toBe(5000)
    expect(remainingExplicitOpenGrace(6000, 1000)).toBe(5000)
    expect(remainingExplicitOpenGrace(6000, 4000)).toBe(2000)
    expect(remainingExplicitOpenGrace(6000, 7000)).toBe(0)
  })

  it('wires main-process tray menu open into the renderer-only wake event', () => {
    const app = read('src/App.tsx')
    expect(app).toContain('if (forceOpen === true) window.dispatchEvent(new Event(EXPLICIT_OPEN_EVENT))')
    expect(app).toContain('const offOpenSettings = edge.onOpenSettings(() => {')
    expect(app).toContain('window.dispatchEvent(new Event(EXPLICIT_OPEN_EVENT))')
    const tray = read('electron/main/tray.ts')
    expect(tray).toContain('tray.on(\'double-click\', showFromTray)')
    expect(tray).toContain('pushState.togglePanel(true)')
  })

  it('delays auto-close while the mouse travels and cancels the hold after entry', () => {
    const hover = read('src/hooks/useEdgeHover.ts')
    expect(hover).toContain('explicitOpenUntil = Date.now() + EXPLICIT_OPEN_GRACE_MS')
    expect(hover).toContain('remainingExplicitOpenGrace(explicitOpenUntil, Date.now())')
    expect(hover).toContain('const onPanelEnter = () => {')
    expect(hover).toContain('explicitOpenUntil = 0')
    expect(hover).toContain('window.addEventListener(EXPLICIT_OPEN_EVENT, onExplicitOpen)')
    expect(hover).toContain('window.removeEventListener(EXPLICIT_OPEN_EVENT, onExplicitOpen)')
    expect(hover).toContain('explicitOpenUntil = 0 // explicit dismissal must not wait out the tray grace')
  })
})
