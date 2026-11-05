import { DOCK_ANIMATION_DURATION_MS, DOCK_ROW_GAP } from '../../shared/types'

/** One static source for the top Dock's animation timing and handle size. */
export const DOCK_MOTION = {
  durationMs: DOCK_ANIMATION_DURATION_MS,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  gapPx: DOCK_ROW_GAP,
  barW: 44,
  barH: 4,
  foldMs: 200,
  foldDeg: 26
} as const

export function dockMotionVars(): Record<string, string> {
  const p = DOCK_MOTION
  return {
    '--dock-ms': p.durationMs + 'ms',
    '--dock-ease': p.easing,
    '--dock-gap': p.gapPx + 'px',
    '--dock-bar-w': p.barW + 'px',
    '--dock-bar-h': p.barH + 'px',
    '--dock-fold-ms': p.foldMs + 'ms'
  }
}

export function chevronPoints(degrees: number): string {
  const armY = (16 - 6 * Math.tan((degrees * Math.PI) / 180)).toFixed(2)
  return '6 ' + armY + ' 12 16 18 ' + armY
}

export function chevronStroke(barHeight: number): number {
  return Math.round((barHeight * 24) / 16 * 10) / 10
}

export const easingWaapi = (): string => DOCK_MOTION.easing
