/**
 * dockFlipBus — one-function bridge for the row-change FLIP.
 *
 * Panel (which owns the toggle timing) must capture card positions BEFORE
 * the settings commit triggers the reflow; ItemList owns the cards and
 * applies the flight after the reflow. ItemList installs the capture hook
 * on mount; if it is not mounted (side docks), capture is a no-op.
 */

type Capture = () => void

let capture: Capture = () => {}

export const dockFlip = {
  /** Call immediately before changing settings.dockRows. */
  capture: () => capture(),
  /** Installed by ItemList; clears on unmount. */
  bind(fn: Capture): () => void {
    capture = fn
    return () => {
      if (capture === fn) capture = () => {}
    }
  }
}
