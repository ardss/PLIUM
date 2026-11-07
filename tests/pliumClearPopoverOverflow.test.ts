import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { positionClearPopover } from '../src/lib/clearPopoverGeometry'

const root = join(__dirname, '..')
const src = readFileSync(join(root, 'src/components/ClearMenu.tsx'), 'utf8')
const assertInside = (result: ReturnType<typeof positionClearPopover>, w: number, h: number, menuW: number, menuH: number) => {
  expect(result.left).toBeGreaterThanOrEqual(8)
  expect(result.top).toBeGreaterThanOrEqual(8)
  expect(result.left + Math.min(menuW, w - 16)).toBeLessThanOrEqual(w - 8)
  expect(result.top + Math.min(menuH, h - 16)).toBeLessThanOrEqual(h - 8)
  expect(result.maxHeight).toBe(h - 16)
}

describe('PLIUM Clear confirmation never overflows the native window', () => {
  it('fits the full confirm panel in the 218px single-row Dock', () => {
    const menu = { width: 320, height: 242 }
    const result = positionClearPopover(
      { left: 720, right: 790, top: 6, bottom: 42 },
      menu, { width: 1140, height: 218 }, false)
    assertInside(result, 1140, 218, menu.width, menu.height)
    expect(result.top).toBe(8)
    expect(result.maxHeight).toBe(202)
  })

  it('uses available space below the top bar in the 522px three-row Dock', () => {
    const menu = { width: 320, height: 188 }
    const result = positionClearPopover(
      { left: 1000, right: 1050, top: 4, bottom: 43 },
      menu, { width: 1140, height: 522 }, false)
    assertInside(result, 1140, 522, menu.width, menu.height)
    expect(result.top).toBe(49)
  })

  it('positions a right/left side tray footer popup inside a narrow native window', () => {
    const menu = { width: 320, height: 245 }
    const result = positionClearPopover(
      { left: 24, right: 97, top: 635, bottom: 667 },
      menu, { width: 360, height: 720 }, true)
    assertInside(result, 360, 720, menu.width, menu.height)
    expect(result.top).toBe(384)
  })

  it('clamps x when dock aligns right and window is narrower than the popup', () => {
    const result = positionClearPopover(
      { left: 140, right: 172, top: 40, bottom: 72 },
      { width: 320, height: 195 }, { width: 190, height: 218 }, false)
    assertInside(result, 190, 218, 320, 195)
    expect(result.left).toBe(8)
  })

  it('uses a body portal, measures popover size and avoids immediate close for inner clicks', () => {
    expect(src).toContain('createPortal(')
    expect(src).toContain('document.body')
    expect(src).toContain('popoverRef.current?.contains(e.target as Node)')
    expect(src).toContain('menu.scrollHeight')
    expect(src).toContain('window.innerHeight')
    expect(src).toContain("overflowY: 'auto'")
    expect(src).toContain("position: 'fixed'")
    expect(src).toContain('maxHeight: placement?.maxHeight')
    expect(src).toContain('onClick={confirmClear}')
    expect(src).toContain('setPending(null)')
  })
})
