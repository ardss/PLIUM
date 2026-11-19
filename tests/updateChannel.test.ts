import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  UPDATE_CHANNEL,
  compareVersions,
  isTrustedUpdateChannel,
  parseUpdateChannelYml,
  releaseApiUrl,
  resolveInstallPolicy
} from '../electron/main/updateChannel'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('update channel — approval gate', () => {
  it('trusts only the PLIUM GitHub release feed', () => {
    expect(isTrustedUpdateChannel({ provider: 'github', owner: 'ardss', repo: 'PLIUM' })).toBe(true)
    // Case-insensitive, like GitHub itself.
    expect(isTrustedUpdateChannel({ provider: 'GitHub', owner: 'ArDss', repo: 'plium' })).toBe(true)
  })

  it('rejects the upstream Edge-Drop feed', () => {
    // Shipping an upstream package over PLIUM would mix brands, install paths
    // and encrypted profiles, so this must never be treated as valid.
    expect(
      isTrustedUpdateChannel({ provider: 'github', owner: 'Deepender25', repo: 'Edge-Drop' })
    ).toBe(false)
  })

  it('rejects a lookalike repository owner or name', () => {
    expect(isTrustedUpdateChannel({ provider: 'github', owner: 'ardss', repo: 'PLIUM-fork' })).toBe(false)
    expect(isTrustedUpdateChannel({ provider: 'github', owner: 'ardss-evil', repo: 'PLIUM' })).toBe(false)
    expect(isTrustedUpdateChannel({ provider: 'generic', owner: 'ardss', repo: 'PLIUM' })).toBe(false)
  })

  it('rejects a missing or unparsable feed document', () => {
    expect(isTrustedUpdateChannel(null)).toBe(false)
    expect(parseUpdateChannelYml(null)).toBeNull()
    expect(parseUpdateChannelYml('')).toBeNull()
    expect(parseUpdateChannelYml('provider: github\n')).toBeNull()
  })

  it('parses the flat app-update.yml electron-builder emits', () => {
    const yml = ['provider: github', 'owner: ardss', 'repo: PLIUM', 'releaseType: release', ''].join('\n')
    expect(parseUpdateChannelYml(yml)).toEqual({ provider: 'github', owner: 'ardss', repo: 'PLIUM' })
    // Quoted values and indentation are tolerated.
    expect(parseUpdateChannelYml("provider: 'github'\n  owner: \"ardss\"\n  repo: PLIUM")).toEqual({
      provider: 'github',
      owner: 'ardss',
      repo: 'PLIUM'
    })
  })

  it('builds feed URLs from the same single source of truth', () => {
    expect(releaseApiUrl()).toBe('https://api.github.com/repos/ardss/PLIUM/releases/latest')
    expect(releaseApiUrl()).toContain(`${UPDATE_CHANNEL.owner}/${UPDATE_CHANNEL.repo}`)
  })
})

describe('update channel — packaging contract', () => {
  it('package.json publishes to the same channel the updater verifies', () => {
    const pkg = JSON.parse(read('package.json')) as {
      build: { publish?: Array<{ provider: string; owner: string; repo: string }> }
    }
    const publish = pkg.build.publish ?? []
    expect(publish).toHaveLength(1)
    expect(publish[0]).toMatchObject({
      provider: UPDATE_CHANNEL.provider,
      owner: UPDATE_CHANNEL.owner,
      repo: UPDATE_CHANNEL.repo
    })
  })

  it('electron-updater ships as a runtime dependency', () => {
    const pkg = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    // A devDependency would be pruned from the packaged app and updates would
    // silently never initialise.
    expect(pkg.dependencies['electron-updater']).toBeTruthy()
    expect(pkg.devDependencies['electron-updater']).toBeUndefined()
  })

  it('the updater never references the upstream repository', () => {
    const sources = [
      'electron/main/updater.ts',
      'electron/main/updateChannel.ts',
      'package.json'
    ].map(read)
    for (const source of sources) {
      // Prose may mention the upstream project by name; a resolvable upstream
      // feed URL would be the actual hazard, so assert on URLs only.
      expect(source).not.toMatch(/github\.com\/Deepender25/i)
      expect(source).not.toMatch(/api\.github\.com\/repos\/Deepender25/i)
    }
  })
})

describe('install policy — updates land while the app is not running', () => {
  it('auto downloads in the background and installs on quit', () => {
    expect(resolveInstallPolicy('auto')).toEqual({
      autoDownload: true,
      installOnAppQuit: true,
      checkAtStartup: true
    })
  })

  it('notify checks only and waits for an explicit download', () => {
    expect(resolveInstallPolicy('notify')).toEqual({
      autoDownload: false,
      installOnAppQuit: false,
      checkAtStartup: true
    })
  })

  it('off stays fully network-silent', () => {
    expect(resolveInstallPolicy('off')).toEqual({
      autoDownload: false,
      installOnAppQuit: false,
      checkAtStartup: false
    })
  })

  it('no mode ever waits for an idle desktop', () => {
    // The old release script gated installation on 90s of keyboard/mouse
    // idleness, which is unsatisfiable where input arrives continuously
    // (remote desktop, KVM, accessibility tools). Installing on quit removes
    // the need to sense input at all, so no input-idle API may appear.
    const source = read('electron/main/updater.ts')
    expect(source).not.toMatch(/GetLastInputInfo/i)
    expect(source).not.toMatch(/idleMs|lastInputTick|getIdleTime/i)
  })
})

describe('compareVersions', () => {
  it('orders dotted versions and tolerates a leading v', () => {
    expect(compareVersions('v1.0.1', '1.0.0')).toBe(1)
    expect(compareVersions('1.0.0', 'v1.0.1')).toBe(-1)
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.2', '1.10.0')).toBe(-1)
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1)
  })

  it('ignores a prerelease suffix when comparing', () => {
    expect(compareVersions('1.0.0-beta.3', '1.0.0')).toBe(0)
  })
})
