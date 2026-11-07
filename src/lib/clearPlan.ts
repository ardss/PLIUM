import { isKept } from '../../shared/itemMeta'

export type ClearScope = '1h' | '6h' | '24h' | 'all'

export type ClearableRecord = {
  id: string
  capturedAt: number
  pinned?: boolean
  note?: string
}

const WINDOWS: Record<Exclude<ClearScope, 'all'>, number> = {
  '1h': 1,
  '6h': 6,
  '24h': 24
}

/** Prepare an immutable selection before showing confirmation. Kept records never enter it. */
export function selectClearIds(items: readonly ClearableRecord[], scope: ClearScope, now = Date.now()): string[] {
  const cutoff = scope === 'all' ? -Infinity : now - WINDOWS[scope] * 3600_000
  return items.filter((item) => !isKept(item) && item.capturedAt >= cutoff).map((item) => item.id)
}

/** New clipboard captures after preview require a fresh confirmation, never a surprise deletion. */
export function sameClearIds(first: readonly string[], second: readonly string[]): boolean {
  if (first.length !== second.length) return false
  const ids = new Set(first)
  return ids.size === first.length && second.every((id) => ids.has(id))
}
