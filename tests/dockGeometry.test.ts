import { describe, expect, it } from 'vitest'
import { dockBladeHeight, DOCK_ANIMATION_DURATION_MS, DOCK_ROW_GAP } from '../shared/types'
import { DOCK_MOTION } from '../src/lib/dockMotion'

describe('Dock window/renderer geometry', () => {
  it('keeps the original one-row and three-row native heights', () => {
    expect(dockBladeHeight(1)).toBe(210)
    expect(dockBladeHeight(3)).toBe(522)
    expect(dockBladeHeight(2)).toBe(522) // migrate legacy 2-row layout to 3-row
  })

  it('shares row spacing and transition duration across window and renderer', () => {
    expect(DOCK_MOTION.gapPx).toBe(DOCK_ROW_GAP)
    expect(DOCK_MOTION.durationMs).toBe(DOCK_ANIMATION_DURATION_MS)
  })
})
