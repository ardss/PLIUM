import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { selectClearIds, sameClearIds } from '../src/lib/clearPlan'
import { en, zhCN, zhTW } from '../src/i18n/translations'

const now = 10 * 3600_000
const history = [
  { id: 'recent', capturedAt: now - 30 * 60_000 },
  { id: 'three-hours', capturedAt: now - 3 * 3600_000 },
  { id: 'twelve-hours', capturedAt: now - 12 * 3600_000 },
  { id: 'old', capturedAt: now - 30 * 3600_000 },
  { id: 'pinned', capturedAt: now - 1000, pinned: true },
  { id: 'noted', capturedAt: now - 1000, note: 'must keep' }
]

describe('PLIUM bulk history clearing confirmation', () => {
  it('requires confirmation for all three time scopes and clear all', () => {
    expect(selectClearIds(history, '1h', now)).toEqual(['recent'])
    expect(selectClearIds(history, '6h', now)).toEqual(['recent', 'three-hours'])
    expect(selectClearIds(history, '24h', now)).toEqual(['recent', 'three-hours', 'twelve-hours'])
    expect(selectClearIds(history, 'all', now)).toEqual(['recent', 'three-hours', 'twelve-hours', 'old'])
  })

  it('preserves pinned and noted items in every scope', () => {
    for (const scope of ['1h', '6h', '24h', 'all'] as const) {
      const ids = selectClearIds(history, scope, now)
      expect(ids).not.toContain('pinned')
      expect(ids).not.toContain('noted')
    }
  })

  it('forces new confirmation whenever the captured-item set changes', () => {
    expect(sameClearIds(['a','b'], ['b','a'])).toBe(true)
    expect(sameClearIds(['a','b'], ['a','b','new'])).toBe(false)
    expect(sameClearIds(['a','b'], ['a','c'])).toBe(false)
    expect(sameClearIds([], [])).toBe(true)
  })

  it('does not execute deletion when selecting a range or dismissing confirmation', () => {
    const root = join(__dirname, '..')
    const component = readFileSync(join(root,'src/components/ClearMenu.tsx'),'utf8')
    const panel = readFileSync(join(root,'src/components/Panel.tsx'),'utf8')
    expect(component).toContain('setPending({ scope, ids, armedAt })')
    expect(component).toContain('onClick={() => stageClear(w.key)}')
    expect(component).toContain("onClick={() => stageClear('all')}")
    expect(component).toContain('onClick={confirmClear}')
    expect(component).toContain('sameClearIds(currentIds, pending.ids)')
    expect(component).toContain('onClear(currentIds)')
    expect(component).not.toContain('onClearAll()')
    expect(component).toContain('e.stopImmediatePropagation()')
    expect(component).toContain('if (pending) {')
    expect(component).toContain('setPending(null)')
    expect(panel).toContain("filtered: typeFilter !== 'all' || !!query.trim()")
    expect(panel).toContain("filtered={typeFilter !== 'all' || !!query.trim()}")
    expect(panel).not.toContain('onClearAll: () => {')
    expect(panel).not.toContain('onClearAll={() => {')
    expect(component).toContain('ref={cancelButtonRef}')
    expect(component).toContain('cancelButtonRef.current?.focus()')
  })

  it('offers clear confirm labels in English, simplified and traditional Chinese', () => {
    for(const locale of [en, zhCN, zhTW]){
      for(const key of ['clearConfirmTitle','clearConfirmCount','clearConfirmKept','clearConfirmCancel','clearConfirmAction','clearAllFiltered','clearFilterHint'] as const){
        expect(locale.item[key]).toBeTruthy()
      }
    }
  })
})
