/** Top Dock scrollbar: one accessible, two-way control for the active list axis. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { publishSliderDrag, subscribeListScroll } from '../lib/dockScrollBus'
import { playDialTickSound } from '../lib/soundEffects'
import { useTranslation } from '../i18n'

const BALL_DIA = 10
const STEP = 0.05
const PAGE_STEP = 0.20
const clamp = (n: number) => Math.min(1, Math.max(0, n))

export function ScrollSlider() {
  const { t } = useTranslation()
  const trackRef = useRef<HTMLDivElement>(null)
  const ballRef = useRef<HTMLDivElement>(null)
  const ratioRef = useRef(0)
  const draggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)

  const apply = useCallback((ratio: number) => {
    const r = clamp(ratio)
    ratioRef.current = r
    const track = trackRef.current
    const ball = ballRef.current
    if (!track || !ball) return
    const span = Math.max(0, track.clientWidth - BALL_DIA)
    ball.style.transform = `translateX(${r * span}px)`
    track.setAttribute('aria-valuenow', String(Math.round(r * 100)))
  }, [])

  useEffect(() => subscribeListScroll((ratio) => {
    if (!draggingRef.current) apply(ratio)
  }), [apply])

  // Resizing the header changes the slider length but not its scroll ratio.
  useEffect(() => {
    const track = trackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => apply(ratioRef.current))
    observer.observe(track)
    return () => observer.disconnect()
  }, [apply])

  const ratioFromPointer = (clientX: number) => {
    const track = trackRef.current
    if (!track) return ratioRef.current
    const r = track.getBoundingClientRect()
    const span = r.width - BALL_DIA
    return span > 0 ? clamp((clientX - r.left - BALL_DIA / 2) / span) : ratioRef.current
  }

  const setRatio = (ratio: number) => {
    const r = clamp(ratio)
    apply(r)
    publishSliderDrag(r)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    setDragging(true)
    setRatio(ratioFromPointer(e.clientX))
    playDialTickSound()
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const r = ratioFromPointer(e.clientX)
    if (r !== ratioRef.current) setRatio(r)
  }
  const stopDragging = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    stopDragging()
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown': next = ratioRef.current - STEP; break
      case 'ArrowRight':
      case 'ArrowUp': next = ratioRef.current + STEP; break
      case 'PageDown': next = ratioRef.current + PAGE_STEP; break
      case 'PageUp': next = ratioRef.current - PAGE_STEP; break
      case 'Home': next = 0; break
      case 'End': next = 1; break
      default: return
    }
    e.preventDefault()
    setRatio(next)
  }

  return (
    <div
      ref={trackRef}
      className={`dock-scroll-slider${dragging ? ' is-dragging' : ''}`}
      role="scrollbar"
      tabIndex={0}
      aria-label={t('item.scrollPosition')}
      aria-controls="cv-dock-list"
      aria-orientation="horizontal"
      aria-valuenow={0}
      aria-valuemin={0}
      aria-valuemax={100}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={stopDragging}
      onKeyDown={onKeyDown}
    >
      <div className="dock-scroll-slider-groove" />
      <div ref={ballRef} className="dock-scroll-slider-ball">
        <span className="dock-scroll-slider-ball-dot" />
      </div>
    </div>
  )
}
