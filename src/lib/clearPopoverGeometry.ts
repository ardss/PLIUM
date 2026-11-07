/** Position the Clear popover inside Electron's (sometimes only 218px tall) viewport. */
export interface PopoverRect {
  left: number
  right: number
  top: number
  bottom: number
}
export interface PopoverSize {
  width: number
  height: number
}
export interface PopoverViewport {
  width: number
  height: number
}
export interface PopoverPosition {
  left: number
  top: number
  maxHeight: number
}

const EDGE_GAP = 8
const ANCHOR_GAP = 6

export function positionClearPopover(
  anchor: PopoverRect,
  popover: PopoverSize,
  viewport: PopoverViewport,
  preferUp: boolean
): PopoverPosition {
  const maxWidth = Math.max(0, viewport.width - EDGE_GAP * 2)
  const effectiveWidth = Math.min(popover.width, maxWidth)
  const maxHeight = Math.max(0, viewport.height - EDGE_GAP * 2)
  const effectiveHeight = Math.min(popover.height, maxHeight)

  const left = Math.max(
    EDGE_GAP,
    Math.min(anchor.right - effectiveWidth, viewport.width - effectiveWidth - EDGE_GAP)
  )
  const idealTop = preferUp
    ? anchor.top - ANCHOR_GAP - effectiveHeight
    : anchor.bottom + ANCHOR_GAP
  const top = Math.max(
    EDGE_GAP,
    Math.min(idealTop, viewport.height - effectiveHeight - EDGE_GAP)
  )
  return { left, top, maxHeight }
}
