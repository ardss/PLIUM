import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..')
const read = (f: string) => readFileSync(join(root, f), 'utf8')

describe('PLIUM public-repository identity and safety', () => {
  it('promotes PLIUM and honest release status', () => {
    const readme = read('README.md')
    expect(readme).toContain('PLIUM · 叠间')
    expect(readme).toContain('one compact row ↔ three expanded rows')
    expect(readme).toContain('https://github.com/ardss/PLIUM/releases')
    expect(readme).toContain('Deepender25/Edge-Drop')
    expect(readme).toContain('Apache-2.0')
    expect(readme).not.toContain('https://github.com/Deepender25/Edge-Drop/releases')
    expect(readme).not.toContain('edgedrop.app')
    expect(readme).not.toContain('apps.microsoft.com')
  })
  it('uses PLIUM links in both active settings and header', () => {
    for (const file of ['src/components/Header.tsx','src/components/Settings.tsx']) {
      const src = read(file)
      expect(src).toContain('https://github.com/ardss/PLIUM')
      expect(src).not.toContain('https://github.com/ardss/Edge-Drop')
    }
    const settings = read('src/components/Settings.tsx')
    expect(settings).not.toContain('ms-windows-store://review')
    expect(settings).not.toContain('kofi-support-btn')
  })
  it('keeps an independent app and removes upstream sponsorship', () => {
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.name).toBe('plium')
    expect(pkg.build.productName).toBe('PLIUM')
    expect(pkg.build.appId).toBe('com.ardss.plium')
    expect(existsSync(join(root, '.github/FUNDING.yml'))).toBe(false)
    expect(read('resources/plium-logo.svg')).toContain('<title id="logo-title">PLIUM')
  })
  it('keeps the license and a paused, separate release channel', () => {
    expect(existsSync(join(root, 'LICENSE'))).toBe(true)
    expect(read('PLIUM-PREVIEW.md')).toContain('one row ↔ three rows')
    expect(read('PRIVACY.md')).toContain('Online update checking is **disabled**')
    const workflow = read('.github/workflows/download-count.yml')
    expect(workflow).toContain('workflow_dispatch')
    expect(workflow).not.toContain('schedule:')
    expect(workflow).not.toContain('types: [published]')
  })
  it('archives imported docs and prevents accidental regeneration', () => {
    expect(existsSync(join(root,'docs/upstream-reference/FEATURES.md'))).toBe(true)
    expect(existsSync(join(root,'docs/upstream-reference/translation-source/en.json'))).toBe(true)
    expect(existsSync(join(root,'edge-drop-translations/en.json'))).toBe(false)
    const generator = read('scripts/generate_translations_ts.cjs')
    expect(generator).toContain('PLIUM_ALLOW_LEGACY_I18N_REGEN')
    expect(generator).toContain('process.exit(1)')
  })
})
