/**
 * Runtime license gate.
 *
 * Walks the *production* dependency closure (dependencies + optional
 * dependencies, which is what electron-builder packs into app.asar) and fails
 * when a package reports a license outside the reviewed allowlist.
 *
 * Dev/build tooling is intentionally out of scope: none of it reaches users.
 * See scripts/audit-dependencies.mjs for the vulnerability side of the gate.
 *
 * Usage:
 *   node scripts/audit-licenses.mjs           # check (CI default)
 *   node scripts/audit-licenses.mjs --write   # regenerate THIRD-PARTY-NOTICES.md
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const writeMode = process.argv.includes('--write')

/** Licenses that may ship in a binary without further obligation. */
const PERMISSIVE = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'Python-2.0',
  'Unlicense',
  'Zlib'
])

/**
 * Weak/file-level copyleft: usable as a dependency, but the shipped bits must
 * stay under that license and their source must remain available. Listed in
 * NOTICE and THIRD-PARTY-NOTICES.md.
 */
const DISCLOSE_ONLY = new Set(['MPL-2.0'])

/** Licenses that must never enter a distributed PLIUM build. */
const FORBIDDEN_PATTERNS = [
  /^GPL-/i,
  /^AGPL-/i,
  /^LGPL-/i,
  /^SSPL/i,
  /^BUSL/i,
  /Commons-Clause/i,
  /^UNLICENSED$/i,
  /^Proprietary$/i
]

function findPackageJson(fromDir, name) {
  let dir = fromDir
  for (;;) {
    const candidate = join(dir, 'node_modules', name, 'package.json')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function normalizeLicense(pkg) {
  const raw = pkg.license ?? pkg.licenses
  if (typeof raw === 'string') return raw.trim()
  if (Array.isArray(raw)) {
    const parts = raw.map((entry) => (typeof entry === 'string' ? entry : entry?.type)).filter(Boolean)
    return parts.length > 0 ? `(${parts.join(' OR ')})` : '(none)'
  }
  if (raw && typeof raw === 'object' && typeof raw.type === 'string') return raw.type
  return '(none)'
}

/** Split an SPDX expression into the identifiers a consumer may choose from. */
function spdxChoices(expression) {
  return expression
    .replace(/[()]/g, ' ')
    .split(/\s+(?:OR|AND)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

function classify(expression) {
  if (expression === '(none)') return 'unlicensed'
  const choices = spdxChoices(expression)
  if (choices.some((choice) => FORBIDDEN_PATTERNS.some((pattern) => pattern.test(choice)))) {
    return 'forbidden'
  }
  if (choices.some((choice) => PERMISSIVE.has(choice))) return 'permissive'
  if (choices.some((choice) => DISCLOSE_ONLY.has(choice))) return 'disclose'
  return 'unreviewed'
}

function collectRuntimeClosure() {
  const rootPkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
  const packages = new Map()
  const absent = []
  const queue = Object.keys(rootPkg.dependencies ?? {}).map((name) => ({
    name,
    from: projectRoot,
    optional: false
  }))

  while (queue.length > 0) {
    const { name, from, optional } = queue.shift()
    const pkgPath = findPackageJson(from, name)
    if (!pkgPath) {
      // npm installs only the optional native binary matching this platform.
      // Those packages never enter a Windows x64 build, so their absence is
      // expected; a missing *required* dependency is a real problem.
      if (optional) {
        absent.push(name)
        continue
      }
      packages.set(`${name}@missing`, { name, version: '(not installed)', license: '(none)' })
      continue
    }
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    const key = `${pkg.name}@${pkg.version}`
    if (packages.has(key)) continue
    packages.set(key, { name: pkg.name, version: pkg.version, license: normalizeLicense(pkg) })
    // Optional dependencies (native platform binaries) are packed too when the
    // platform matches, so they belong in the review.
    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      queue.push({ name: dep, from: dirname(pkgPath), optional: false })
    }
    for (const dep of Object.keys(pkg.optionalDependencies ?? {})) {
      queue.push({ name: dep, from: dirname(pkgPath), optional: true })
    }
  }
  return { packages: [...packages.values()].sort((a, b) => a.name.localeCompare(b.name)), absent }
}

const { packages, absent } = collectRuntimeClosure()
const buckets = { permissive: [], disclose: [], forbidden: [], unreviewed: [], unlicensed: [] }

for (const pkg of packages) {
  const verdict = classify(pkg.license)
  const entry = { ...pkg, verdict }
  if (verdict === 'permissive') buckets.permissive.push(entry)
  else if (verdict === 'disclose') buckets.disclose.push(entry)
  else if (verdict === 'forbidden') buckets.forbidden.push(entry)
  else if (verdict === 'unlicensed') buckets.unlicensed.push(entry)
  else buckets.unreviewed.push(entry)
}

const problems = [...buckets.forbidden, ...buckets.unreviewed, ...buckets.unlicensed]

function describe(entry) {
  return `${entry.name}@${entry.version} (${entry.license})`
}

if (writeMode) {
  const lines = [
    '# Third-party notices',
    '',
    'Generated by `node scripts/audit-licenses.mjs --write`. Do not edit by hand.',
    '',
    `Runtime packages reviewed: **${packages.length}**.`,
    '',
    '## Packages requiring attribution or source disclosure',
    ''
  ]
  const notable = [...buckets.disclose]
  if (notable.length === 0) lines.push('_None._')
  for (const entry of notable) {
    lines.push(`- ${describe(entry)}`)
    if (entry.name.startsWith('@resvg/resvg-js')) {
      lines.push('  - MPL-2.0. Source: https://github.com/thx/resvg-js and https://github.com/RazrFalcon/resvg')
    }
  }
  lines.push('', '## Permissively licensed packages', '')
  for (const entry of buckets.permissive) lines.push(`- ${describe(entry)}`)
  lines.push('', '## Artwork', '')
  lines.push('- Twemoji graphics © Twitter, Inc. and other contributors — CC BY 4.0')
  lines.push('')
  writeFileSync(join(projectRoot, 'THIRD-PARTY-NOTICES.md'), lines.join('\n'), 'utf8')
  console.log(`WROTE THIRD-PARTY-NOTICES.md (${packages.length} packages)`)
}

console.log(`Runtime dependency license review: ${packages.length} packages`)
if (absent.length > 0) {
  console.log(`  other-platform optional binaries not installed here: ${absent.length}`)
}
console.log(`  permissive: ${buckets.permissive.length}`)
console.log(`  disclose-only: ${buckets.disclose.length}`)
if (buckets.disclose.length > 0) {
  for (const entry of buckets.disclose) console.log(`    - ${describe(entry)}`)
}
if (problems.length > 0) {
  console.error('FAIL: runtime dependencies with unacceptable or unreviewed licenses:')
  for (const entry of problems) console.error(`  - ${describe(entry)} [${entry.verdict}]`)
  process.exit(1)
}
console.log('PASS: every runtime dependency license is reviewed and distributable')
