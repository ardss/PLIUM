import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

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
    const workflow = read('.github/workflows/quality.yml')
    expect(workflow).toContain('pull_request:')
    expect(workflow).toContain('npm run typecheck')
    expect(existsSync(join(root,'.github/workflows/download-count.yml'))).toBe(false)
  })
  it('never implicitly publishes unsigned Windows installers from CI', () => {
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.scripts['build:github']).toContain('--publish never')
    expect(pkg.scripts['build:win']).toBe('npm run build:github')
    expect(read('.github/workflows/quality.yml')).toContain('run: npm run build:win')
  })
  it('archives imported docs and prevents accidental regeneration', () => {
    // This repository uses sparse checkout: archived docs can be committed
    // without being physically materialized in the local worktree.
    const tracked = execFileSync('git', ['ls-files', '--', 'docs/upstream-reference'], { cwd: root, encoding: 'utf8' })
    expect(tracked).toContain('docs/upstream-reference/FEATURES.md')
    expect(tracked).toContain('docs/upstream-reference/translation-source/en.json')
    expect(existsSync(join(root,'edge-drop-translations/en.json'))).toBe(false)
    // Old upstream translation generators must no longer be runnable in PLIUM.
    for (const file of ['generate_translations_ts.cjs', 'generate_translations_file.py', 'build_complete_30_lang_ts.py']) {
      expect(existsSync(join(root, 'scripts', file))).toBe(false)
    }
    expect(existsSync(join(root, 'src/i18n/translations.ts'))).toBe(true)
  })
})
