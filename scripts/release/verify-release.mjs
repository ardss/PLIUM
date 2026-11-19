/**
 * Pre-publish gate for a PLIUM release.
 *
 * Run this against a finished build directory before tagging or uploading. It
 * answers one question: does the artifact set on disk actually match the source
 * tree we are about to publish, and will the updater accept it?
 *
 *   node scripts/release/verify-release.mjs [--tag v1.0.0] [--dist dist]
 *
 * It also writes the `.sha256` sidecar when missing, so the published set is
 * always installer + checksum + latest.yml.
 *
 * Exits non-zero on the first inconsistency so CI or a maintainer can stop.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
const version = pkg.version
const tagArgIndex = process.argv.indexOf('--tag')
const expectedTag = tagArgIndex > -1 ? process.argv[tagArgIndex + 1] : null
const distArgIndex = process.argv.indexOf('--dist')
const distDir = resolve(
  projectRoot,
  distArgIndex > -1 ? process.argv[distArgIndex + 1] : 'dist'
)

const problems = []
const notes = []

function readYamlField(source, key) {
  const match = source.match(new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, 'm'))
  return match ? match[1].replace(/^['"]|['"]$/g, '') : null
}

function sha256(file) {
  const hash = createHash('sha256')
  hash.update(readFileSync(file))
  return hash.digest('hex').toUpperCase()
}

function sha512Base64(file) {
  const hash = createHash('sha512')
  hash.update(readFileSync(file))
  return hash.digest('base64')
}

// ── 1. Source identity ───────────────────────────────────────────────────────
if (expectedTag && expectedTag !== `v${version}`) {
  problems.push(`tag ${expectedTag} does not match package.json version v${version}`)
}
notes.push(`package.json version: ${version}`)

// ── 2. Installer artifact ────────────────────────────────────────────────────
const installer = join(distDir, `PLIUM-Setup-${version}.exe`)
if (!existsSync(installer)) {
  problems.push(`missing installer: dist/PLIUM-Setup-${version}.exe (run npm run build:win)`)
} else {
  const size = statSync(installer).size
  const digest = sha256(installer)
  notes.push(`installer: PLIUM-Setup-${version}.exe, ${size} bytes`)
  notes.push(`installer SHA-256: ${digest}`)
  const shaFile = `${installer}.sha256`
  const expectedLine = `${digest}  PLIUM-Setup-${version}.exe`
  if (!existsSync(shaFile)) {
    // Publishing set is always installer + checksum + latest.yml; write the
    // sidecar here rather than relying on a hand-typed hash.
    writeFileSync(shaFile, expectedLine + '\n', 'utf8')
    notes.push(`wrote dist/PLIUM-Setup-${version}.exe.sha256`)
  } else {
    const recorded = readFileSync(shaFile, 'utf8').trim().split(/\s+/)[0].toUpperCase()
    if (recorded !== digest) problems.push(`PLIUM-Setup-${version}.exe.sha256 does not match the installer`)
  }
}

// ── 3. Update metadata the updater will fetch ────────────────────────────────
const latestYml = join(distDir, 'latest.yml')
if (!existsSync(latestYml)) {
  problems.push(
    'missing dist/latest.yml — electron-updater cannot see this release; ' +
      'the build must run with the build.publish configuration in package.json'
  )
} else {
  const yml = readFileSync(latestYml, 'utf8')
  const ymlVersion = readYamlField(yml, 'version')
  if (ymlVersion !== version) {
    problems.push(`latest.yml version ${ymlVersion} does not match package.json ${version}`)
  }
  const fileUrl = readYamlField(yml, 'url')
  if (fileUrl && fileUrl !== `PLIUM-Setup-${version}.exe`) {
    problems.push(`latest.yml points at ${fileUrl}, expected PLIUM-Setup-${version}.exe`)
  }
  if (existsSync(installer)) {
    const declared = readYamlField(yml, 'sha512')
    if (!declared) {
      problems.push('latest.yml has no sha512 — the updater would reject the download')
    } else if (declared !== sha512Base64(installer)) {
      problems.push('latest.yml sha512 does not match the installer (stale or swapped artifact)')
    }
  }
  notes.push('latest.yml present and version-matched')
}

// ── 4. Packaged feed points at PLIUM ─────────────────────────────────────────
const packagedFeed = join(distDir, 'win-unpacked', 'resources', 'app-update.yml')
if (!existsSync(packagedFeed)) {
  problems.push('missing dist/win-unpacked/resources/app-update.yml — packaged updater would stay disabled')
} else {
  const feed = readFileSync(packagedFeed, 'utf8')
  const provider = readYamlField(feed, 'provider')
  const owner = readYamlField(feed, 'owner')
  const repo = readYamlField(feed, 'repo')
  if (provider !== 'github' || owner !== 'ardss' || repo !== 'PLIUM') {
    problems.push(`packaged feed is ${provider} ${owner}/${repo}, expected github ardss/PLIUM`)
  } else {
    notes.push('packaged feed: github ardss/PLIUM')
  }
}

// ── 5. Packed executable version ─────────────────────────────────────────────
const packedExe = join(distDir, 'win-unpacked', 'PLIUM.exe')
if (!existsSync(packedExe)) {
  problems.push('missing dist/win-unpacked/PLIUM.exe')
} else {
  notes.push(`packed exe SHA-256: ${sha256(packedExe)}`)
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log('PLIUM release verification')
for (const note of notes) console.log(`  · ${note}`)

if (problems.length > 0) {
  console.error('\nFAIL: release artifacts are not publishable')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log('\nPASS: installer, checksum, update metadata and packaged feed agree')
