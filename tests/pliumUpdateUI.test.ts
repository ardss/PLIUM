import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')
const settings = read('src/components/Settings.tsx')
const translations = read('src/i18n/translations.ts')
const updater = read('electron/main/updater.ts')

describe('PLIUM update experience', () => {
  it('no longer hides update controls behind a preview kill switch', () => {
    // The preview gate existed because there was no verified feed. PLIUM now
    // owns a verified feed, so the UI must not claim updates are unavailable.
    expect(settings).not.toContain('PLIUM_PREVIEW_UPDATES_ENABLED')
    expect(settings).not.toContain('Online updates are unavailable in this preview')
    expect(updater).not.toContain('preview updates are disabled')
  })

  it('offers the three update modes to every non-Store build', () => {
    expect(settings).toContain("id: 'update-mode'")
    expect(settings).toContain("val: 'auto'")
    expect(settings).toContain("val: 'notify'")
    expect(settings).toContain("val: 'off'")
    // The pills render unconditionally now that a feed exists.
    expect(settings).toMatch(/below: pills<UpdateMode>\(/)
  })

  it('still hides update controls on Microsoft Store builds', () => {
    // Store policy owns updates for MSIX installs.
    expect(settings).toContain('if (isStoreBuild || hasPromotedTopUpdate) return null')
    expect(settings).toContain('...(!isStoreBuild ? [{')
  })

  it('tells the user that automatic updates install on exit', () => {
    // Installing while the app is not running is the point of the mechanism;
    // users must be able to read that promise in their language.
    expect(translations).toContain('install them when PLIUM exits')
    expect(translations).toContain('退出 PLIUM 时自动安装')
  })
})
