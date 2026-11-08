import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')
const pkg = JSON.parse(read('package.json'))

/**
 * PLIUM is a separate NSIS preview product, not an upstream Edge-Drop Store
 * repackage. These are release gates, not an excuse to enable upstream feeds.
 */
describe('PLIUM shipping contracts', () => {
  it('has independent package identity and is not a public npm package', () => {
    expect(pkg.name).toBe('plium')
    expect(pkg.private).toBe(true)
    expect(pkg.license).toBe('Apache-2.0')
    expect(pkg.build.appId).toBe('com.ardss.plium')
    expect(pkg.build.productName).toBe('PLIUM')
  })
  it('distributes NSIS x64 only and does not impersonate upstream Store', () => {
    expect(pkg.build.win.target).toEqual([{ target: 'nsis', arch: ['x64'] }])
    expect(pkg.build.appx).toBeUndefined()
    expect(pkg.build.publish).toBeUndefined()
  })
  it('does not offer fake Microsoft Store / MSIX distribution', () => {
    for (const script of ['build:store','build:msix']) {
      expect(pkg.scripts[script]).toContain('disabled')
      expect(pkg.scripts[script]).toContain('process.exit(1)')
      expect(pkg.scripts[script]).not.toContain('--win appx')
    }
  })
  it('GitHub-style NSIS packaging remains local and explicitly names the target', () => {
    expect(pkg.scripts['build:github']).toContain('--win nsis')
    expect(pkg.scripts['build:win']).toBe('npm run build:github')
    expect(pkg.build.nsis.artifactName).toBe('PLIUM-Setup-${version}.${ext}')
    expect(pkg.build.nsis.perMachine).toBe(false)
    expect(pkg.build.nsis.allowToChangeInstallationDirectory).toBe(true)
  })
  it('does not inherit an upstream update publisher or update URL', () => {
    expect(pkg.build.publish).toBeUndefined()
    const updater = read('electron/main/updater.ts')
    expect(updater).not.toContain('api.github.com')
    expect(updater).not.toContain('checkForUpdates()')
    expect(updater).not.toContain('downloadUpdate(')
    expect(updater).toContain('preview updates are disabled')
  })
  it('uses independently branded application and tray icons', () => {
    expect(pkg.build.win.icon).toBe('resources/icon.ico')
    expect(existsSync(join(root, 'resources/icon.ico'))).toBe(true)
    expect(existsSync(join(root, 'resources/icon.png'))).toBe(true)
    expect(existsSync(join(root, 'resources/tray.png'))).toBe(true)
    expect(existsSync(join(root, 'resources/tray-dark.png'))).toBe(true)
    expect(read('src/assets/logo.svg')).toContain('<svg')
  })
  it('has appropriate NSIS shortcuts', () => {
    expect(pkg.build.nsis.shortcutName).toContain('PLIUM')
    expect(pkg.build.nsis.createDesktopShortcut).toBe(true)
    expect(pkg.build.nsis.createStartMenuShortcut).toBe(true)
  })
  it('does not bundle the upstream store startup executable', () => {
    expect(pkg.build.extraResources.some((x: { from: string }) => /EdgeDropStartup/i.test(x.from))).toBe(false)
    expect(pkg.build.files).toContain('!resources/startup/**/*.exe')
    expect(pkg.build.files).toContain('!resources/appx/**')
  })
  it('keeps only required runtime packages in production', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      '@resvg/resvg-js', 'koffi', 'react', 'zustand'
    ])
  })
  it('excludes build-only libraries and source packages from production', () => {
    expect(pkg.build.files).toEqual(expect.arrayContaining([
      '!out/renderer/**/*.gif', '!out/ts/**', '!resources/appx/**',
      '!**/node_modules/emoji-datasource-twitter/**',
      '!**/node_modules/framer-motion/**', '!**/node_modules/react-dom/**'
    ]))
  })
  it('bundles Twemoji assets without bundling its entire source package', () => {
    expect(pkg.build.extraResources).toContainEqual({
      from: 'node_modules/emoji-datasource-twitter/img/twitter/64', to: 'emoji/64'
    })
    expect(pkg.devDependencies['emoji-datasource-twitter']).toBeTruthy()
  })
  it('unpacks native modules', () => {
    const unpack = pkg.build.asarUnpack.join(' ')
    expect(unpack).toMatch(/koffi/)
    expect(unpack).toMatch(/@resvg/)
    expect(unpack).toMatch(/\{node,dll\}/)
  })
  it('keeps application data outside the archive', () => {
    expect(pkg.build.files).toContain('out/**/*')
    expect(pkg.build.files).toContain('package.json')
    expect(read('electron/store/paths.ts')).toContain("app.getPath('userData')")
  })
  it('keeps attribution and does not misrepresent the upstream developer', () => {
    expect(existsSync(join(root, 'LICENSE'))).toBe(true)
    expect(existsSync(join(root, 'PLIUM-PREVIEW.md'))).toBe(true)
    expect(read('PLIUM-PREVIEW.md')).toContain('Edge-Drop')
    expect(read('PLIUM-PREVIEW.md')).toContain('Apache-2.0')
  })
})