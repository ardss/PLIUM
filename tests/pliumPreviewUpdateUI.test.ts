import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..')
const settings = readFileSync(join(root, 'src/components/Settings.tsx'), 'utf8')
const updater = readFileSync(join(root, 'electron/main/updater.ts'), 'utf8')

describe('PLIUM preview update experience', () => {
  it('keeps the preview update channel disabled in UI and backend', () => {
    expect(settings).toContain('export const PLIUM_PREVIEW_UPDATES_ENABLED = false')
    expect(updater).toContain('PLIUM preview: updates disabled')
  })
  it('does not render a nonfunctional manual check button', () => {
    expect(settings).toContain('if (!PLIUM_PREVIEW_UPDATES_ENABLED || isStoreBuild || hasPromotedTopUpdate) return null')
  })
  it('does not invite users to choose an update mode with no update feed', () => {
    expect(settings).toContain('below: PLIUM_PREVIEW_UPDATES_ENABLED ? pills<UpdateMode>(')
  })
  it('explains the safe offline upgrade route in both Chinese and English', () => {
    expect(settings).toContain('当前版本不提供在线更新')
    expect(settings).toContain('Online updates are unavailable in this preview.')
    expect(settings).toContain('原版 Edge-Drop 更新通道不会连接。')
  })
})
