/**
 * ItemList — the scrollable body of the blade.
 *
 * Renders Pinned (if any) and Recent sections, handles OS drag-in of files &
 * images onto the shelf, and shows the empty state when there's nothing.
 * AnimatePresence popLayout keeps pin/delete from height-collapsing the list.
 *
 * Drag-in awareness: sets `dragActive` on the store while OS files are being
 * dragged over the panel so the edge-hover hook knows not to close mid-drag.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import { useStore } from '../store/appStore'
import { useFilteredItems } from '../hooks/useFilteredItems'
import { ClipboardItemCard } from './ClipboardItem'
import { EmptyState } from './EmptyState'
import { ChevronDownIcon, PinFillIcon } from './icons'
import { playExpandSound, playButtonClickSound } from '../lib/soundEffects'

import { useTranslation } from '../i18n'
import { publishListScroll, subscribeSliderDrag } from '../lib/dockScrollBus'
import { dockFlip } from '../lib/dockFlipBus'
import { DOCK_MOTION, easingWaapi } from '../lib/dockMotion'

/**
 * Reopening the shelf after this long (or after something new was copied)
 * starts it at the top, newest first; the back button offers the way back.
 */
const REOPEN_AT_TOP_AFTER_MS = 60_000
/** How long the back button offers the way back (paused while the pointer is on it). */
const BACK_BUTTON_MS = 6000

/** Where the list was when the shelf closed: the card at its leading edge. */
interface BackSpot {
  filter: string
  pos: number
  id?: string
  offset: number
}


export function ItemList() {
  const { t } = useTranslation()
  const { pinned, recent } = useFilteredItems()
  const query = useStore((s) => s.query)
  const listRef = useRef<HTMLDivElement>(null)

  const total = pinned.length + recent.length
  
  const isDraggingAny = useStore((s) => !!s.dragActive || !!s.internalDragReq)
  const isDraggingCard = useStore((s) => !!s.internalDragReq)
  const stickPosition = useStore((s) => s.settings.stickPosition)
  const reduceMotion = useStore((s) => !!s.settings.reduceMotion)
  const expandedStackId = useStore((s) => s.expandedStackId)
  const isHorizontal = stickPosition === 'top'
  // Two Dock states: one row compact, three rows expanded.
  const dockRows = useStore((s) => s.settings.dockRows) || 1
  const multiRow = isHorizontal && dockRows > 1
  // The axis the list actually scrolls on: horizontal only for the classic
  // single-row dock (side docks and multi-row docks scroll vertically).
  const axisIsHorizontal = isHorizontal && !multiRow
  
  const typeFilter = useStore((s) => s.typeFilter) || 'all'
  const filterScrollMap = useRef<Record<string, { top: number; left: number }>>({})
  const prevFilterRef = useRef(typeFilter)

  const [showScrollTop, setShowScrollTop] = useState(false)
  // Pointer resting where the nav controls live also reveals them (even at
  // the very start/end, so the opposite way is always offered). Multi-row
  // anchors its overlay buttons beside the card-adjacent scrubber; otherwise
  // it uses the original bottom-right corner cluster.
  const [cornerHover, setCornerHover] = useState(false)
  const handleCornerHover = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = getListRect()
    if (!r) return
    const hover = e.clientX > r.right - 150 && e.clientY > r.bottom - 70
    setCornerHover(prev => prev === hover ? prev : hover)
  }
  // The way back to where the list was, offered for a moment after a reopen
  // started it at the top (null when there is nothing to go back to).
  const [backSpot, setBackSpot] = useState<BackSpot | null>(null)
  const closedSpot = useRef<BackSpot | null>(null)
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('edge_drop_pinned_collapsed_map')
      if (saved) return JSON.parse(saved)
    } catch {}
    return { all: true, text: true, image: true, file: true, link: true }
  })

  const pinnedCollapsed = collapsedMap[typeFilter] ?? true

  // Keep complete card columns centered; avoid per-card rail measurements.
  useLayoutEffect(() => {
    const list = listRef.current
    if (!multiRow || !list || total === 0) return
    const update = () => {
      const card = list.querySelector<HTMLElement>('.recent-section > .item, .pinned-accordion-inner > .item')
      if (!card || list.clientWidth < 100) return
      const usable = list.clientWidth -
        parseFloat(getComputedStyle(list).paddingLeft) -
        parseFloat(getComputedStyle(list).paddingRight)
      const gap = DOCK_MOTION.gapPx
      const pinTab = pinned.length ? 34 : 0
      const columns = Math.max(1, Math.min(total,
        Math.floor((usable - pinTab + gap) / (card.offsetWidth + gap))))
      const width = Math.min(usable, pinTab + columns * card.offsetWidth + (columns - 1) * gap)
      list.style.setProperty('--dock-content-width', String(width) + 'px')
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(list)
    return () => {
      observer.disconnect()
      list.style.removeProperty('--dock-content-width')
    }
  }, [multiRow, total, typeFilter, query, pinnedCollapsed, pinned.length])

  const setPinnedCollapsed = (val: boolean) => {
    setCollapsedMap((prev) => {
      const next = { ...prev, [typeFilter]: val }
      localStorage.setItem('edge_drop_pinned_collapsed_map', JSON.stringify(next))
      return next
    })
  }
  
  const topRecentId = recent[0]?.id
  const topRecentTime = recent[0]?.capturedAt
  const topPinnedTime = pinned[0]?.capturedAt

  const prevTopRecentId = useRef(topRecentId)
  const prevTopRecentTime = useRef(topRecentTime)
  const prevTopPinnedTime = useRef(topPinnedTime)

  const scrollRaf = useRef<number | null>(null)
  const scrollVelocity = useRef<number>(0)
  // Eased auto-scroll target (signed px/frame). The rAF loop chases this
  // instead of jumping straight to each dragover event's intensity.
  const scrollTarget = useRef<number>(0)

  // Cache the list box across dragover events: getBoundingClientRect()
  // forces a synchronous reflow, and dragover fires dozens of times per
  // second while stacking — reading it every event janks the whole gesture.
  // The box only moves on window/panel resize (scrolling content doesn't
  // move the container), so a 200ms refresh is plenty fresh.
  const listRectRef = useRef<{ rect: DOMRect; at: number } | null>(null)
  const getListRect = () => {
    const el = listRef.current
    if (!el) return null
    const now = performance.now()
    const cached = listRectRef.current
    if (cached && now - cached.at < 200) return cached.rect
    const rect = el.getBoundingClientRect()
    listRectRef.current = { rect, at: now }
    return rect
  }

  useEffect(() => {
    return () => {
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current)
    }
  }, [])

  // The card at the list's leading edge and how far into the list it sits, so
  // the way back lands on the same card even after new copies pushed it down.
  // Nothing to go back to when the list is within half a view of the top.
  const captureSpot = (): BackSpot | null => {
    const el = listRef.current
    if (!el) return null
    const pos = axisIsHorizontal ? el.scrollLeft : el.scrollTop
    if (pos < (axisIsHorizontal ? el.clientWidth : el.clientHeight) / 2) return null
    const box = el.getBoundingClientRect()
    const hit = axisIsHorizontal
      ? document.elementFromPoint(box.left + 24, box.top + box.height / 2)
      : document.elementFromPoint(box.left + box.width / 2, box.top + 24)
    const card = hit?.closest('.list .item-main') as HTMLElement | null
    const at = card?.getBoundingClientRect()
    return {
      filter: useStore.getState().typeFilter || 'all',
      pos,
      id: card?.dataset.id,
      offset: at ? (axisIsHorizontal ? at.left - box.left : at.top - box.top) : 0
    }
  }

  const goBack = () => {
    const spot = backSpot
    const el = listRef.current
    setBackSpot(null)
    if (!spot || !el) return
    playButtonClickSound()
    let target = spot.pos
    const card = spot.id ? (el.querySelector(`.item-main[data-id="${CSS.escape(spot.id)}"]`) as HTMLElement | null) : null
    if (card && !card.closest('.pinned-accordion:not(.is-expanded)')) {
      const box = el.getBoundingClientRect()
      const at = card.getBoundingClientRect()
      target = (axisIsHorizontal ? el.scrollLeft + at.left - box.left : el.scrollTop + at.top - box.top) - spot.offset
    }
    el.scrollTo({ [axisIsHorizontal ? 'left' : 'top']: Math.max(0, target), behavior: 'auto' })
  }

  const lastClosedAt = useRef<number>(Date.now())
  const lastClosedTopId = useRef<string | undefined>(topRecentId)
  const lastClosedTopTime = useRef<number | undefined>(topRecentTime)
  const lastClosedTopPinnedTime = useRef<number | undefined>(topPinnedTime)

  // Decoupled open state tracking: subscribe to store changes without triggering full list re-renders
  useEffect(() => {
    let lastOpen = useStore.getState().open
    const unsub = useStore.subscribe((state) => {
      const isNowOpen = !!state.open
      if (isNowOpen !== lastOpen) {
        if (!isNowOpen && lastOpen) {
          // Panel just closed: record timestamps and top item ids
          lastClosedAt.current = Date.now()
          lastClosedTopId.current = prevTopRecentId.current
          lastClosedTopTime.current = prevTopRecentTime.current
          lastClosedTopPinnedTime.current = prevTopPinnedTime.current
          // and where the list is (the shape is still open here, so the card
          // at the list's leading edge can be found by hit testing)
          closedSpot.current = captureSpot()
          setBackSpot(null)
        } else if (isNowOpen && !lastOpen) {
          // Panel just opened: check if closed long enough OR if a new copy happened while closed
          const timeSinceClosed = Date.now() - lastClosedAt.current
          const hasNewCopyWhileClosed =
            prevTopRecentId.current !== lastClosedTopId.current ||
            prevTopRecentTime.current !== lastClosedTopTime.current ||
            prevTopPinnedTime.current !== lastClosedTopPinnedTime.current

          if (timeSinceClosed >= REOPEN_AT_TOP_AFTER_MS || hasNewCopyWhileClosed) {
            filterScrollMap.current = {}
            if (listRef.current) {
              if (axisIsHorizontal) listRef.current.scrollLeft = 0
              else listRef.current.scrollTop = 0
            }
            // Never silently: offer the way back for a moment.
            const spot = closedSpot.current
            if (spot && spot.filter === (state.typeFilter || 'all')) setBackSpot(spot)
          }
          closedSpot.current = null
        }
        lastOpen = isNowOpen
      }
    })
    return unsub
  }, [isHorizontal, axisIsHorizontal])

  useLayoutEffect(() => {
    // If a brand new or freshly updated item was added while panel is open, jump to top
    if (useStore.getState().open) {
      const isNewRecent = !!topRecentTime && (!prevTopRecentTime.current || topRecentTime > prevTopRecentTime.current)
      const isNewPinned = !!topPinnedTime && (!prevTopPinnedTime.current || topPinnedTime > prevTopPinnedTime.current)

      if (isNewRecent || isNewPinned) {
        filterScrollMap.current[typeFilter] = { top: 0, left: 0 }
        if (listRef.current) {
          if (axisIsHorizontal) listRef.current.scrollLeft = 0
          else listRef.current.scrollTop = 0
        }
      }
    }

    prevTopRecentId.current = topRecentId
    prevTopRecentTime.current = topRecentTime
    prevTopPinnedTime.current = topPinnedTime
  }, [topRecentId, topRecentTime, topPinnedTime, isHorizontal, typeFilter])

  // Independent scroll position per filter page (unsynchronized across tabs)
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return

    if (prevFilterRef.current !== typeFilter) {
      setBackSpot(null)
      // Save outgoing filter's scroll position before applying new filter's position
      filterScrollMap.current[prevFilterRef.current] = {
        top: el.scrollTop,
        left: el.scrollLeft
      }
      prevFilterRef.current = typeFilter

      // Restore incoming filter's saved scroll position (defaulting to 0)
      const saved = filterScrollMap.current[typeFilter]
      if (axisIsHorizontal) {
        el.scrollLeft = saved?.left ?? 0
      } else {
        el.scrollTop = saved?.top ?? 0
      }
    }
  }, [typeFilter, isHorizontal])

  // Reset scroll on search query change
  const prevQueryRef = useRef(query)
  useLayoutEffect(() => {
    if (prevQueryRef.current !== query) {
      prevQueryRef.current = query
      setBackSpot(null)
      if (listRef.current) {
        if (axisIsHorizontal) listRef.current.scrollLeft = 0
        else listRef.current.scrollTop = 0
      }
    }
  }, [query, isHorizontal])

  // Reset scroll map when switching dock position
  const prevStickPos = useRef(stickPosition)
  useLayoutEffect(() => {
    if (prevStickPos.current !== stickPosition) {
      prevStickPos.current = stickPosition
      setBackSpot(null)
      filterScrollMap.current = {}
      if (listRef.current) {
        listRef.current.scrollTop = 0
        listRef.current.scrollLeft = 0
      }
    }
  }, [stickPosition])

  useEffect(() => {
    if (!isDraggingAny) {
      stopScrolling()
    }
  }, [isDraggingAny])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    filterScrollMap.current[typeFilter] = {
      top: el.scrollTop,
      left: el.scrollLeft
    }
    const scrollPos = axisIsHorizontal ? el.scrollLeft : el.scrollTop
    const next = scrollPos > 50
    setShowScrollTop((prev) => (prev === next ? prev : next))
    // Scrolling on your own: the offer is no longer needed.
    if (next) setBackSpot((prev) => (prev ? null : prev))
    // Keep the header slider in sync (0..1 along the active scroll axis).
    if (isHorizontal) {
      const max = axisIsHorizontal
        ? el.scrollWidth - el.clientWidth
        : el.scrollHeight - el.clientHeight
      publishListScroll(max > 0 ? Math.min(1, Math.max(0, scrollPos / max)) : 0)
    }
  }

  // Slider drags scroll the list; only meaningful for the top dock.
  useEffect(() => {
    if (!isHorizontal) return
    return subscribeSliderDrag((ratio) => {
      const el = listRef.current
      if (!el) return
      if (axisIsHorizontal) {
        el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth)
      } else {
        el.scrollTop = ratio * (el.scrollHeight - el.clientHeight)
      }
    })
  }, [isHorizontal, axisIsHorizontal])

  // The browser owns scroll timing/interruption. No custom easing clock or RAF.
  // Respect the app's reduced-motion setting; both dock axes behave alike.
  const scrollToTop = () => {
    playButtonClickSound()
    const el = listRef.current
    if (!el) return
    filterScrollMap.current[typeFilter] = { top: 0, left: 0 }
    if (axisIsHorizontal) el.scrollTo({ left: 0, behavior: reduceMotion ? 'instant' : 'smooth' })
    else el.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' })
  }
  const scrollToEnd = () => {
    playButtonClickSound()
    const el = listRef.current
    if (!el) return
    if (axisIsHorizontal) el.scrollTo({ left: el.scrollWidth - el.clientWidth, behavior: reduceMotion ? 'instant' : 'smooth' })
    else el.scrollTo({ top: el.scrollHeight - el.clientHeight, behavior: reduceMotion ? 'instant' : 'smooth' })
  }

  useEffect(() => {
    const el = listRef.current
    if (!el || !axisIsHorizontal) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [axisIsHorizontal])

  const startScrolling = () => {
    if (scrollRaf.current !== null) return

    let lastTime = performance.now()
    const loop = (time: number) => {
      // Clamp dt so a single hitched frame can't cause a huge jump —
      // big steps after hitches are what make the scroll feel juddery.
      const dt = Math.min(64, time - lastTime)
      lastTime = time

      // Ease actual velocity toward the target so intensity changes between
      // dragover events (or zone exits) ramp smoothly instead of stepping.
      const target = scrollTarget.current
      const cur = scrollVelocity.current + (target - scrollVelocity.current) * Math.min(1, dt / 120)
      if (Math.abs(cur) < 0.05 && target === 0) {
        scrollVelocity.current = 0
        scrollRaf.current = null
        return
      }
      scrollVelocity.current = cur

      if (listRef.current) {
        const step = cur * (dt / 16)
        if (axisIsHorizontal) {
          listRef.current.scrollLeft += step
        } else {
          listRef.current.scrollTop += step
        }
        scrollRaf.current = requestAnimationFrame(loop)
      } else {
        scrollRaf.current = null
      }
    }
    scrollRaf.current = requestAnimationFrame(loop)
  }

  const stopScrolling = () => {
    scrollTarget.current = 0
    scrollVelocity.current = 0
    if (scrollRaf.current !== null) {
      cancelAnimationFrame(scrollRaf.current)
      scrollRaf.current = null
    }
  }

  // Edge auto-scroll tuning: separate enter/exit thresholds (hysteresis) so
  // cursor jitter at the boundary can't start/stop the loop every event —
  // that start/stop flicker is what made edge scrolling feel stuttery.
  const EDGE_ENTER = 80
  const EDGE_EXIT = 110
  const MAX_SCROLL_PX = 20 // px per 60fps frame at full intensity

  const setScrollTarget = (v: number) => {
    scrollTarget.current = v
    if (v !== 0) startScrolling()
  }

  const handleDragOver = (e: React.DragEvent) => {
    const rect = getListRect()
    if (!rect) return

    const pos = axisIsHorizontal ? e.clientX - rect.left : e.clientY - rect.top
    const len = axisIsHorizontal ? rect.width : rect.height
    // Base 5px/frame so the scroll feels alive the moment the zone is
    // entered (the old +2 crawled at ~120px/s across most of the zone).
    const speedFor = (d: number) => Math.max(0, 1 - d / EDGE_ENTER) * MAX_SCROLL_PX + 5
    const active = scrollTarget.current

    if (active < 0) {
      // Scrolling toward the start edge: stay until clearly out, else ease
      // out — or flip if the cursor dove straight to the opposite edge.
      setScrollTarget(pos > EDGE_EXIT ? (pos > len - EDGE_ENTER ? speedFor(len - pos) : 0) : -speedFor(pos))
    } else if (active > 0) {
      setScrollTarget(len - pos > EDGE_EXIT ? (pos < EDGE_ENTER ? -speedFor(pos) : 0) : speedFor(len - pos))
    } else if (pos < EDGE_ENTER) {
      setScrollTarget(-speedFor(pos))
    } else if (pos > len - EDGE_ENTER) {
      setScrollTarget(speedFor(len - pos))
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // dragleave BUBBLES from every card crossed mid-gesture — without a
    // containment check, crossing any card boundary hard-stops the scroll
    // loop, and the next dragover restarts it. That stop/start cycle on
    // every card crossed is the stops-and-jitters. Only stop when actually
    // leaving the list (same pattern as the blade's onDragLeave).
    const related = e.relatedTarget as Node | null
    if (related && listRef.current?.contains(related)) return
    stopScrolling()
  }

  const handleDragLeaveOrDrop = () => {
    stopScrolling()
  }

  // In-app drag: mark the card a drop would stack the dragged card into.
  // One listener for the whole window instead of enter/leave pairs on every
  // card: dragover fires on whatever is under the drag (also while it rests),
  // so the mark follows the drag exactly and clears off any card, outside the
  // list, or when the drag leaves the window. Text cards never stack.
  useEffect(() => {
    if (!isDraggingCard) return
    const onOver = (e: DragEvent) => {
      const s = useStore.getState()
      const card = (e.target as Element | null)?.closest?.('.list .item-main') as HTMLElement | null
      const id = card?.dataset.id
      const target = id && s.internalDragReq && id !== s.internalDragReq.id ? s.items.find((it) => it.id === id) : undefined
      s.setDropTargetId(target && target.data.kind !== 'text' ? target.id : null)
    }
    const onLeave = (e: DragEvent) => {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        useStore.getState().setDropTargetId(null)
      }
    }
    document.addEventListener('dragover', onOver, true)
    document.addEventListener('dragleave', onLeave, true)
    return () => {
      document.removeEventListener('dragover', onOver, true)
      document.removeEventListener('dragleave', onLeave, true)
      useStore.getState().setDropTargetId(null)
    }
  }, [isDraggingCard])

  // A filter or search change replays the list's short fade-in. The list used
  // to be keyed on this for that, which destroyed and rebuilt every card on
  // each keystroke; keeping it lets unchanged cards stay and replays the same
  // fade (started before paint, so the first frame is already at 0.45).
  const filterKey = `${typeFilter}:${query}`
  const stackRef = useRef<HTMLDivElement>(null)
  const hasStack = total > 0
  useLayoutEffect(() => {
    const el = stackRef.current
    if (!el || typeof el.animate !== 'function') return
    el.animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 120, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
  }, [filterKey, hasStack])

  // ── Row-change FLIP ─────────────────────────────────────────────────────
  // Cards keep their identity and fly from their old position to the new
  // layout (the half-visible 5th card in 1-row glides into row 2's start;
  // cards beyond it follow). Positions are measured in CONTENT space (rect
  // Preserve actual painted screen coordinates. Switching multi-row ->
  // single-row clamps scrollTop to zero DURING the same React commit; the
  // former content-relative FLIP mistakenly added the old scrollTop back
  // to the start position, making all visible cards jump by that distance.
  // Viewport rects also survive a live mid-flight reversal.
  const flipSnap = useRef<Map<string, { x: number; y: number; w: number; h: number }> | null>(null)
  const flipAnchor = useRef<{ id: string; x: number; y: number; wasHorizontal: boolean; wasScrolled: boolean } | null>(null)
  const cardVisualPos = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  }
  useEffect(() => {
    return dockFlip.bind(() => {
      const list = listRef.current
      if (!list) return
      const snap = new Map<string, { x: number; y: number; w: number; h: number }>()
      list.querySelectorAll<HTMLElement>('.list-stack .item').forEach((el) => {
        const id = el.querySelector<HTMLElement>('.item-main')?.dataset.id
        if (id) snap.set(id, cardVisualPos(el))
      })
      flipSnap.current = snap

      // When a scrolled multi-row list becomes a single horizontal strip,
      // retain the card the user is actually viewing. Without this anchor,
      // visible cards can fly thousands of pixels to an off-screen target in
      // 420ms; their first frame is continuous, but the gesture looks jumpy.
      const wasHorizontal = !list.classList.contains('multi-row') && list.classList.contains('horizontal')
      const wasScrolled = wasHorizontal ? list.scrollLeft > 60 : list.scrollTop > 60
      const visibleCards: Array<{ id: string; x: number; y: number }> = []
      if (wasScrolled) {
        const lr = list.getBoundingClientRect()
        list.querySelectorAll<HTMLElement>('.recent-section > .item').forEach((el) => {
          const id = el.querySelector<HTMLElement>('.item-main')?.dataset.id
          if (!id) return
          const r = el.getBoundingClientRect()
          const iw = Math.max(0, Math.min(r.right, lr.right) - Math.max(r.left, lr.left))
          const ih = Math.max(0, Math.min(r.bottom, lr.bottom) - Math.max(r.top, lr.top))
          if (r.width <= 0 || r.height <= 0 || iw * ih < r.width * r.height * 0.40) return
          // Keep the first substantially visible row/column as a spatial
          // landmark, not the center-most card: centering later rows causes
          // the earlier visible row to fly off the other edge on collapse.
          visibleCards.push({ id, x: r.left, y: r.top })
        })
      }
      visibleCards.sort((a, b) =>
        Math.abs(a.y - b.y) > 3 ? a.y - b.y : a.x - b.x
      )
      const leadingCard = visibleCards[0]
      flipAnchor.current = leadingCard
        ? { ...leadingCard, wasHorizontal, wasScrolled }
        : null
    })
  }, [])

  useLayoutEffect(() => {
    const list = listRef.current
    const snap = flipSnap.current
    if (!list || !snap) return
    flipSnap.current = null
    const anchor = flipAnchor.current
    flipAnchor.current = null
    // Only transfer the scroll anchor when changing scroll AXES and when
    // the user was already away from the beginning. New/top views still
    // open from the normal newest-first position.
    if (anchor && anchor.wasHorizontal !== axisIsHorizontal && anchor.wasScrolled) {
      const node = Array.from(list.querySelectorAll<HTMLElement>('.recent-section > .item'))
        .find(el => el.querySelector<HTMLElement>('.item-main')?.dataset.id === anchor.id)
      if (node) {
        const r = node.getBoundingClientRect()
        if (axisIsHorizontal) list.scrollLeft += r.left - anchor.x
        else list.scrollTop += r.top - anchor.y
      }
    }
    if (reduceMotion || typeof list.animate !== 'function') return
    list.querySelectorAll<HTMLElement>('.list-stack .item').forEach((el) => {
      const id = el.querySelector<HTMLElement>('.item-main')?.dataset.id
      if (!id) return
      const from = snap.get(id)
      if (!from) return // card born in the new layout — no flight
      // Retarget from the card's LIVE painted position captured above.
      // Cancel the previous FLIP before measuring the NEW layout endpoint:
      // getBoundingClientRect() still includes an old WAAPI transform until
      // cancellation, so measuring "to" first causes a reversal snap.
      // Do not cancel opacity/copy-ripple animations.
      for (const a of el.getAnimations()) {
        const effect = a.effect as KeyframeEffect | null
        const frames = (effect?.getKeyframes?.() ?? []) as Array<Record<string, unknown>>
        if (frames.some((f) => typeof f.transform === 'string' && f.transform !== 'none')) a.cancel()
      }
      const to = cardVisualPos(el)
      const viewport = list.getBoundingClientRect()
      // Do not animate cards that are offscreen at BOTH endpoints. A scrolled
      // 3-row -> 1-row switch can move a virtualized card by 2000+px while
      // its entire trajectory remains clipped; these wasted composited
      // flights inflate motion metrics and compete with visible card work.
      const canSee = (p: typeof to) =>
        p.x + p.w > viewport.left - 8 &&
        p.x < viewport.right + 8 &&
        p.y + p.h > viewport.top - 8 &&
        p.y < viewport.bottom + 8
      if (!canSee(from) && !canSee(to)) return
      const dx = from.x - to.x
      const dy = from.y - to.y
      // Stack expansion can change the tile's own width (210 -> 254px+).
      // Animate it visually with a horizontal FLIP scale, while flexbox
      // reflows ONCE to the target width. Never tween CSS width each frame:
      // that would repeatedly wrap all neighboring cards.
      const scaleX = isHorizontal && to.w > 0 ? from.w / to.w : 1
      const resize = Math.abs(from.w - to.w) > 1 && isHorizontal
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && !resize) return
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)${resize ? ` scaleX(${scaleX})` : ''}`, transformOrigin: 'left top' },
          { transform: 'none', transformOrigin: 'left top' }
        ],
        { duration: DOCK_MOTION.durationMs, easing: easingWaapi() }
      )
    })
  }, [dockRows, reduceMotion, pinned, recent, expandedStackId, axisIsHorizontal])

  // Cards in or near the list's view are marked data-near and always drawn
  // (item.css); the rest stay culled by content-visibility: auto. Left to
  // content-visibility alone, the top dock painted its cards as empty boxes
  // on every open until the open motion (the blade's clip-path growing from
  // the edge bar) ended, about 5 frames; drawing them fully removes that. This
  // observer measures against the list itself, which the clip does not touch,
  // so the cards in view stay drawn while the shelf is closed.
  useEffect(() => {
    const list = listRef.current
    const stack = stackRef.current
    if (!list || !stack || typeof IntersectionObserver !== 'function') return
    const near = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.setAttribute('data-near', '')
          else e.target.removeAttribute('data-near')
        }
      },
      // one view either side, along the list's own direction
      { root: list, rootMargin: axisIsHorizontal ? '0px 100% 0px 100%' : '100% 0px 100% 0px' }
    )
    const watched = new Set<Element>()
    const sync = () => {
      const cards = new Set(stack.querySelectorAll('.item'))
      for (const card of cards) if (!watched.has(card)) { near.observe(card); watched.add(card) }
      for (const card of watched) if (!cards.has(card)) { near.unobserve(card); watched.delete(card) }
    }
    sync()
    const added = new MutationObserver(sync)
    added.observe(stack, { childList: true, subtree: true })
    return () => {
      added.disconnect()
      near.disconnect()
    }
  }, [hasStack, isHorizontal, axisIsHorizontal])

  // Re-sync the slider after axis/layout/content changes and on first mount
  // (the scroll event alone won't fire when the list shrinks or rebuilds).
  useEffect(() => {
    const el = listRef.current
    if (!el || !isHorizontal) return
    const scrollPos = axisIsHorizontal ? el.scrollLeft : el.scrollTop
    const max = axisIsHorizontal
      ? el.scrollWidth - el.clientWidth
      : el.scrollHeight - el.clientHeight
    publishListScroll(max > 0 ? Math.min(1, Math.max(0, scrollPos / max)) : 0)
  }, [isHorizontal, axisIsHorizontal, typeFilter, query, total])

  return (
    <div
      className={`list${isHorizontal ? ' horizontal' : ''}${multiRow ? ' multi-row' : ''}`}
      id="cv-dock-list"
      ref={listRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDragLeaveOrDrop}
      onScroll={handleScroll}
      onPointerMove={handleCornerHover}
      onPointerLeave={() => setCornerHover(false)}
    >
      {total === 0 ? (
        <EmptyState filtered={query.trim().length > 0} />
      ) : (
        <div ref={stackRef} className="list-stack">
          {pinned.length > 0 && (
            <section className="pinned-section">
              <div
                className={`pinned-accordion ${isHorizontal ? 'horizontal' : ''} ${!pinnedCollapsed ? 'is-expanded' : ''}`}
                style={
                  isHorizontal
                    ? ({ '--pinned-target-width': `${pinned.length * 210 + (pinned.length - 1) * 10}px` } as React.CSSProperties)
                    : undefined
                }
              >
                <div className="pinned-accordion-inner">
                  {pinned.map((it) => (
                    <ClipboardItemCard key={it.id} item={it} />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className={`pinned-floating-pill ${isHorizontal ? 'horizontal' : ''} ${pinnedCollapsed ? 'is-collapsed' : ''}`}
                onClick={() => {
                  const next = !pinnedCollapsed
                  playExpandSound(!next)
                  setPinnedCollapsed(next)
                }}
                title={pinnedCollapsed ? t('item.expandPinned') : t('item.collapsePinned')}
                aria-label={pinnedCollapsed ? t('item.expandPinned') : t('item.collapsePinned')}
              >
                <PinFillIcon width={11} height={11} className="pinned-pill-icon" />
                <span className="pinned-pill-count">{pinned.length}</span>
                <ChevronDownIcon
                  width={11}
                  height={11}
                  className="pinned-pill-arrow"
                  style={{
                    // Multi-row expands/collapses downward, so the chevron
                    // speaks vertically there like the side dock's pill.
                    transform: multiRow
                      ? (pinnedCollapsed ? 'rotate(0deg)' : 'rotate(180deg)')
                      : isHorizontal
                        ? (pinnedCollapsed ? 'rotate(-90deg)' : 'rotate(90deg)')
                        : (pinnedCollapsed ? 'rotate(0deg)' : 'rotate(180deg)')
                  }}
                />
              </button>
            </section>
          )}

          {recent.length > 0 && (
            <section className="recent-section">
              {pinned.length > 0 && (
                <div className="section-label recent-header">
                  <span className="recent-label-text">{t('item.recent')}</span>
                </div>
              )}
              {recent.map((it) => (
                <ClipboardItemCard key={it.id} item={it} />
              ))}
            </section>
          )}
        </div>
      )}

        <AnimatePresence>
          {(showScrollTop || cornerHover) && (
            <motion.button
              key="scroll-top"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.14, ease: 'easeOut' }}
              className={`scroll-top-btn${isHorizontal ? ' horizontal' : ''}`}
              onClick={scrollToTop}
              title={t('item.scrollToTop')}
              aria-label={t('item.scrollToTop')}
            >
              {axisIsHorizontal ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              )}
            </motion.button>
          )}
          {isHorizontal && (showScrollTop || cornerHover) && (
            <motion.button
              key="scroll-end"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.14, ease: 'easeOut' }}
              className={`scroll-end-btn${isHorizontal ? ' horizontal' : ''}`}
              onClick={scrollToEnd}
              title={t('item.scrollToEnd')}
              aria-label={t('item.scrollToEnd')}
            >
              {axisIsHorizontal ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      <AnimatePresence>
        {backSpot && (
          <BackButton
            key="back-button"
            horizontal={axisIsHorizontal}
            reduceMotion={reduceMotion}
            label={t('item.backToSpot')}
            onBack={goBack}
            onDone={() => setBackSpot(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * "Back to where you were": the scroll-to-top button's twin, in its corner
 * (free while the list is at the top), pointing the other way. A white ring
 * around its edge shrinks for as long as it is offered; the pointer on it
 * holds the time.
 */
function BackButton({ horizontal, reduceMotion, label, onBack, onDone }: {
  horizontal: boolean
  reduceMotion: boolean
  label: string
  onBack: () => void
  onDone: () => void
}) {
  const [held, setHeld] = useState(false)
  const timeLeft = useRef(BACK_BUTTON_MS)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (held) return
    const startedAt = performance.now()
    const timer = window.setTimeout(() => done.current(), timeLeft.current)
    return () => {
      window.clearTimeout(timer)
      timeLeft.current -= performance.now() - startedAt
    }
  }, [held])

  return (
    <motion.button
      type="button"
      className={`scroll-top-btn back-btn${horizontal ? ' horizontal' : ''}${held ? ' is-held' : ''}`}
      style={{ '--back-btn-ms': `${BACK_BUTTON_MS}ms` } as React.CSSProperties}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.14, ease: 'easeOut' }}
      onClick={onBack}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      title={label}
      aria-label={label}
    >
      {horizontal ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      )}
      <svg className="back-btn-ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="20.5" pathLength="100" />
      </svg>
    </motion.button>
  )
}
