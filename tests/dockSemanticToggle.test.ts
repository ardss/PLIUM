import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TRANSLATIONS } from '../src/i18n/translations'

const root = join(__dirname, '..')
const header = readFileSync(join(root, 'src/components/Header.tsx'), 'utf8')
const panel = readFileSync(join(root, 'src/components/Panel.tsx'), 'utf8')
const css = readFileSync(join(root, 'src/styles/panel.css'), 'utf8')

describe('dock expand/collapse semantics', () => {
  it('uses a single action instead of numeric row choices', () => {
    expect(header).toContain('className="dock-layout-toggle"')
    expect(header).toContain("const dockActionLabel = t(dockIsExpanded ? 'item.collapse' : 'item.expand')")
    expect(header).not.toContain('dock-layout-seg')
    expect(header).not.toContain("value: '1', lines: 1")
    expect(header).not.toContain("value: '3', lines: 3")
    expect(header).not.toContain('<span>{dockActionLabel}</span>')
    expect(css).toMatch(/\.dock-layout-toggle\s*\{[^}]*width: 30px;[^}]*height: 30px;/s)
  })

  it('clicks toggle between folded and expanded using the existing transition', () => {
    expect(header).toContain('onDockRowsChange(dockIsExpanded ? 1 : 3)')
    expect(header).toContain('aria-expanded={dockIsExpanded}')
    expect(header).toContain('aria-label={dockActionLabel}')
    expect(panel).toContain('onDockRowsChange={isHorizontal ? commitRows : undefined}')
    expect(panel).toContain('dockFlip.capture()')
  })

  it('uses the same action label for the lower drag handle', () => {
    expect(panel).toContain("title={t((settings.dockRows ?? 1) > 1 ? 'item.collapse' : 'item.expand')}")
    expect(panel).toContain("aria-label={t((settings.dockRows ?? 1) > 1 ? 'item.collapse' : 'item.expand')}")
  })

  it('has both action labels for every supported language', () => {
    for (const [lang, messages] of Object.entries(TRANSLATIONS)) {
      expect(messages.item.expand.trim(), lang).not.toBe('')
      expect(messages.item.collapse.trim(), lang).not.toBe('')
    }
    expect(TRANSLATIONS['zh-CN'].item.expand).toBe('展开')
    expect(TRANSLATIONS['zh-CN'].item.collapse).toBe('折叠')
  })

  it('animates the chevron and honors reduced motion', () => {
    expect(css).toContain('.dock-layout-chevron.is-expanded { transform: rotate(180deg); }')
    expect(css).toContain('[data-motion="reduce"] .dock-layout-chevron { transition: none; }')
  })
})
