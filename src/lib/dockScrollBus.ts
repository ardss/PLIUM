/**
 * DockScrollBus — a tiny out-of-React channel between the ItemList scroll
 * container and the header's scroll slider.
 *
 * Scroll events fire every frame; routing them through the Zustand store
 * would re-render the whole panel per frame. This bus keeps the two ends
 * decoupled: the list publishes its scroll ratio (0..1), the slider
 * subscribes; the slider publishes drag ratios back, the list subscribes.
 */

type RatioListener = (ratio: number) => void

const scrollListeners = new Set<RatioListener>()
const dragListeners = new Set<RatioListener>()
let latestRatio = 0

/** ItemList calls this on every scroll frame with its scroll ratio (0..1). */
export function publishListScroll(ratio: number): void {
  latestRatio = Math.min(1, Math.max(0, ratio))
  for (const l of scrollListeners) l(latestRatio)
}

/** The slider subscribes to mirror the list's scroll position. */
export function subscribeListScroll(l: RatioListener): () => void {
  scrollListeners.add(l)
  l(latestRatio) // Recreated header sliders must match the current list immediately.
  return () => scrollListeners.delete(l)
}

/** The slider calls this while it is dragged; the list scrolls to match. */
export function publishSliderDrag(ratio: number): void {
  for (const l of dragListeners) l(ratio)
}

/** ItemList subscribes to receive slider drags as scroll commands. */
export function subscribeSliderDrag(l: RatioListener): () => void {
  dragListeners.add(l)
  return () => dragListeners.delete(l)
}
