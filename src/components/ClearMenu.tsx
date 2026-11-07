import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { TrashIcon } from './icons'
import { playButtonClickSound } from '../lib/soundEffects'
import { useTranslation } from '../i18n'
import type { ClipboardItemDto } from '../../shared/types'
import { isKept } from '../../shared/itemMeta'
import { selectClearIds, sameClearIds, type ClearScope } from '../lib/clearPlan'

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
  /** Clear all unpinned history. */
  onClearAll: () => void
  /** Direction menu flies out. Defaults to 'up' for bottom footer, 'down' for header. */
  menuDirection?: 'up' | 'down'
}

const WINDOWS: { key: '1h' | '6h' | '24h'; hours: number }[] = [
  { key: '1h', hours: 1 },
  { key: '6h', hours: 6 },
  { key: '24h', hours: 24 }
]

const menuItemStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  padding: '7px 10px',
  borderRadius: 7,
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.85)',
  fontSize: 12,
  fontWeight: 400,
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.12s ease'
}

export function ClearMenu({
  items,
  disabled,
  panelOpen,
  filtered = false,
  onClear,
  onClearAll,
  menuDirection = 'up'
}: ClearMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<{scope: ClearScope; ids: string[]; armedAt: number} | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Force-close menu when panel slides closed
  useEffect(() => {
    if (!panelOpen) {
      setOpen(false)
      setPending(null)
    }
  }, [panelOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setPending(null)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      setPending(null)
    }
    if (open) {
      window.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('keydown', handleEscape, true)
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape, true)
    }
  }, [open])

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
      if (pending.scope === 'all') onClearAll()
      else onClear(currentIds)
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
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 350 : 'auto' }}>
      <button
        className={`text-btn${open ? ' active' : ''}`}
        onClick={() => {
          if (disabled) return
          playButtonClickSound()
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: isMenuDown ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMenuDown ? -6 : 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: isMenuDown ? 'calc(100% + 6px)' : undefined,
              bottom: isMenuDown ? undefined : 'calc(100% + 6px)',
              right: 0,
              minWidth: pending ? 268 : 190,
              background: '#141414',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: pending ? 10 : 4,
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(0, 0, 0, 0.5)',
              zIndex: 350
            }}
          >
            {pending ? (
              <div role="group" aria-label={t('item.clearConfirmTitle')} style={{ width: 246 }}>
                <div style={{ fontSize: 13, fontWeight: 650, margin: '2px 3px 7px', color: '#f5f5f5' }}>
                  {t('item.clearConfirmTitle')}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, margin: '0 3px', color: 'rgba(255,255,255,0.8)' }}>
                  {scopeLabel(pending.scope)}
                </div>
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
                    onClick={() => { playButtonClickSound(); setPending(null) }}
                    style={{ ...menuItemStyle, justifyContent: 'center', flex: 1, background: '#292929', color: '#ededed' }}>
                    {t('item.clearConfirmCancel')}
                  </button>
                  <button type="button" disabled={pending.ids.length === 0} onClick={confirmClear}
                    style={{ ...menuItemStyle, justifyContent: 'center', flex: 1, background: pending.ids.length ? '#aa3030' : '#505050', color: '#fff', fontWeight: 600 }}>
                    {t('item.clearConfirmAction')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {WINDOWS.map((w) => (
                  <button key={w.key} type="button"
                    disabled={selectClearIds(items, w.key).length === 0}
                    onClick={() => stageClear(w.key)}
                    style={{ ...menuItemStyle, opacity: selectClearIds(items, w.key).length ? 1 : 0.35 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                    {scopeLabel(w.key)}
                  </button>
                ))}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 2px' }} />
                <button type="button" onClick={() => stageClear('all')}
                  style={{ ...menuItemStyle, color: '#ffa2a2' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                  {scopeLabel('all')}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
