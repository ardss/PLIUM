import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TrashIcon } from './icons'
import { playButtonClickSound } from '../lib/soundEffects'
import { useTranslation } from '../i18n'
import { useStore } from '../store/appStore'
import '../styles/pliumMenus.css'
import type { ClipboardItemDto } from '../../shared/types'
import { isKept } from '../../shared/itemMeta'
import { selectClearIds, sameClearIds, type ClearScope } from '../lib/clearPlan'
import { positionClearPopover, type PopoverPosition } from '../lib/clearPopoverGeometry'

interface ClearMenuProps {
  /** Full item list (pinned + recent) to compute time-window ids from. */
  items: ClipboardItemDto[]
  disabled: boolean
  /** Filtered scope changes what Clear all means. */
  filtered?: boolean
  /** Panel's own open/closed state — closes this menu whenever the panel closes. */
  panelOpen: boolean
  /** Clear a specific set of ids (used for the time-window options via deleteBatch). */
  onClear: (ids: string[]) => void
  /** Direction menu flies out. Defaults to 'up' for bottom footer, 'down' for header. */
  menuDirection?: 'up' | 'down'
}

const WINDOWS: { key: '1h' | '6h' | '24h'; hours: number }[] = [
  { key: '1h', hours: 1 },
  { key: '6h', hours: 6 },
  { key: '24h', hours: 24 }
]

export function ClearMenu({
  items,
  disabled,
  panelOpen,
  filtered = false,
  onClear,
  menuDirection = 'up'
}: ClearMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<{scope: ClearScope; ids: string[]; armedAt: number} | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const [placement, setPlacement] = useState<PopoverPosition | null>(null)

  // Force-close menu when panel slides closed
  useEffect(() => {
    if (!panelOpen) {
      setOpen(false)
      setPending(null)
    }
  }, [panelOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          !popoverRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setPending(null)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (pending) {
        setPending(null)
      } else {
        setOpen(false)
      }
    }
    if (open) {
      window.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('keydown', handleEscape, true)
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape, true)
    }
  }, [open, pending])

  // Escape both the native window's clipped blade and its overflow:hidden.
  // The entire popover must remain inside the actual Electron viewport:
  // top Dock has just 218px in single-row mode.
  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null)
      return
    }
    const reposition = () => {
      const anchor = ref.current?.getBoundingClientRect()
      const menu = popoverRef.current
      if (!anchor || !menu) return
      const next = positionClearPopover(
        anchor,
        { width: menu.offsetWidth, height: menu.scrollHeight },
        { width: window.innerWidth, height: window.innerHeight },
        menuDirection === 'up'
      )
      setPlacement((prev) => prev?.left === next.left && prev?.top === next.top &&
        prev?.maxHeight === next.maxHeight ? prev : next)
    }
    reposition()
    window.addEventListener('resize', reposition)
    return () => window.removeEventListener('resize', reposition)
  }, [open, pending, menuDirection])

  useEffect(() => {
    if (pending) cancelButtonRef.current?.focus()
  }, [pending])

  // Every bulk deletion requires an explicit review and a separate confirm action.
  useEffect(() => {
    if (!open) setPending(null)
  }, [open])

  const stageClear = (scope: ClearScope) => {
    const armedAt = Date.now()
    const ids = selectClearIds(items, scope, armedAt)
    if (ids.length === 0) return
    playButtonClickSound()
    setPending({ scope, ids, armedAt })
  }

  const confirmClear = () => {
    if (!pending || Date.now() - pending.armedAt < 300) return
    // Never delete newly captured items that were absent from the preview.
    const currentIds = selectClearIds(items, pending.scope, pending.armedAt)
    if (!sameClearIds(currentIds, pending.ids)) {
      setPending({ ...pending, ids: currentIds, armedAt: Date.now() })
      return
    }
    if (currentIds.length > 0) {
      playButtonClickSound()
      onClear(currentIds)
    }
    setPending(null)
    setOpen(false)
  }

  const scopeLabel = (scope: ClearScope) => scope === 'all'
    ? t(filtered ? 'item.clearAllFiltered' : 'item.clearAll')
    : t(`item.clearLast${scope}`)
  const keptCount = items.filter(isKept).length

  const isMenuDown = menuDirection === 'down'

  return (
    <>
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 350 : 'auto' }}>
      <button
        className={`text-btn${open ? ' active' : ''}`}
        onClick={() => {
          if (disabled) return
          playButtonClickSound()
          useStore.getState().closeCardMenu()
          setOpen((v) => !v)
          setPending(null)
        }}
        disabled={disabled}
        title={t('item.clear')}
        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <TrashIcon width={13} height={13} className="clear-btn-icon" />
        <span>{t('item.clear')}</span>
      </button>

    </div>
    {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            role={pending ? 'dialog' : 'menu'}
            aria-label={pending ? t('item.clearConfirmTitle') : t('item.clear')}
            className="plium-menu-surface plium-clear-menu"
            data-plium-clear-popover
            ref={popoverRef}
            initial={{ opacity: 0, y: isMenuDown ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMenuDown ? -6 : 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: placement?.top ?? 8,
              left: placement?.left ?? 8,
              width: pending ? 'min(320px, calc(100vw - 16px))' : 'min(200px, calc(100vw - 16px))',
              maxHeight: placement?.maxHeight ?? 'calc(100vh - 16px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              visibility: placement ? 'visible' : 'hidden',
              pointerEvents: 'auto',
              overflowWrap: 'anywhere',
              padding: pending ? 10 : 6,
              zIndex: 350
            }}
          >
            {pending ? (
              <div role="group" aria-label={t('item.clearConfirmTitle')} style={{ width: '100%' }}>
                <div style={{ fontSize: 13, fontWeight: 650, margin: '2px 3px 7px', color: '#f5f5f5' }}>
                  {t('item.clearConfirmTitle')}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, margin: '0 3px', color: 'rgba(255,255,255,0.8)' }}>
                  {scopeLabel(pending.scope)}
                </div>
                {filtered && (
                  <div className="plium-clear-filter-hint">
                    {t('item.clearFilterHint')}
                  </div>
                )}
                <div aria-live="polite" style={{ fontSize: 12, fontWeight: 600, margin: '8px 3px', color: '#ffb0b0' }}>
                  {t('item.clearConfirmCount', { count: pending.ids.length })}
                </div>
                {keptCount > 0 && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.54)', lineHeight: 1.5, margin: '0 3px 4px' }}>
                    {t('item.clearConfirmKept', { count: keptCount })}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.54)', lineHeight: 1.5, margin: '0 3px' }}>
                  {t('item.clearConfirmWarning')}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button"
                    ref={cancelButtonRef}
                    className="plium-menu-row plium-confirm-cancel"
                    onClick={() => { playButtonClickSound(); setPending(null) }}>
                    {t('item.clearConfirmCancel')}
                  </button>
                  <button type="button" disabled={pending.ids.length === 0} onClick={confirmClear}
                    className="plium-menu-row plium-confirm-danger">
                    {t('item.clearConfirmAction')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {WINDOWS.map((w) => (
                  <button key={w.key} type="button"
                    role="menuitem"
                    className="plium-menu-row"
                    disabled={selectClearIds(items, w.key).length === 0}
                    onClick={() => stageClear(w.key)}
>
                    {scopeLabel(w.key)}
                  </button>
                ))}
                <div className="plium-menu-divider" />
                <button type="button" role="menuitem" onClick={() => stageClear('all')}
                  className="plium-menu-row plium-menu-danger">
                  {scopeLabel('all')}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>, document.body
    )}
    </>
  )
}
