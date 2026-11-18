/**
 * Release CI audit: runtime must be free of reported vulnerabilities.
 * We also review ALL dev/build advisory findings, permitting ONLY the known
 * picomatch ReDoS advisory and its transitive npm-audit dependents.
 * This does not assert the build chain is patched; see docs/RELEASE-STATUS.md.
 */
import { spawnSync } from 'node:child_process'

const knownAdvisory = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf'
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function audit(extraArgs) {
  const args = ['audit', '--json', '--registry=https://registry.npmjs.org/', ...extraArgs]
  const child = spawnSync(npmCommand, args, {
    shell: process.platform === 'win32',
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 20 * 1024 * 1024
  })
  if (child.error) throw child.error
  let report
  try {
    report = JSON.parse(child.stdout)
  } catch {
    throw new Error('npm audit returned invalid JSON or was unavailable: ' + (child.stderr || child.stdout).slice(0, 450))
  }
  if (!report.metadata?.vulnerabilities || !report.vulnerabilities) {
    throw new Error('npm audit did not return a complete vulnerability report')
  }
  return { report, status: child.status }
}

const production = audit(['--omit=dev'])
const prodFindings = Object.values(production.report.metadata.vulnerabilities).reduce((a, b) => a + b, 0)
if (production.status !== 0 || prodFindings !== 0) {
  console.error('FAIL: production dependency audit', production.report.metadata.vulnerabilities)
  process.exit(1)
}
console.log('PASS: production dependency audit, zero reported vulnerabilities')

const full = audit([])
const vulnerabilities = full.report.vulnerabilities
const names = Object.keys(vulnerabilities)
if (names.length === 0) {
  if (full.status !== 0) process.exit(1)
  console.log('PASS: full dependency audit, zero reported vulnerabilities')
  process.exit(0)
}

const root = vulnerabilities.picomatch
if (
  !root ||
  !root.via?.length ||
  !root.via.every(v => typeof v === 'object' && v.url === knownAdvisory)
) {
  console.error('FAIL: unreviewed direct vulnerability found')
  process.exit(1)
}

// A node can be marked reviewed only if all via edges are known graph entries
// and there is a path back to picomatch; cycles are allowed, orphan risks are not.
const reviewed = new Set(['picomatch'])
let previousSize
do {
  previousSize = reviewed.size
  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    if (reviewed.has(name)) continue
    if (
      vulnerability.via?.length &&
      vulnerability.via.every(dep => typeof dep === 'string' && Object.hasOwn(vulnerabilities, dep)) &&
      vulnerability.via.some(dep => reviewed.has(dep))
    ) reviewed.add(name)
  }
} while (reviewed.size !== previousSize)

const unexpected = names.filter(name => !reviewed.has(name))
if (unexpected.length > 0) {
  console.error('FAIL: unreviewed dependency security advisories: ' + unexpected.join(', '))
  process.exit(1)
}
console.warn('REVIEWED EXCEPTION: ' + names.length + ' build/development advisory entries trace to ' + knownAdvisory)
console.warn('This exception does not mean a fix exists. Do not distribute node_modules or the development toolchain.')
console.log('PASS: no unexpected advisories; production runtime audit remains clean')
