/**
 * Update channel policy — pure logic, no Electron imports, unit-testable.
 *
 * PLIUM ships its own release feed. Two rules are non-negotiable:
 *
 *  1. The feed is `github.com/ardss/PLIUM` and nothing else. Installing an
 *     upstream Edge-Drop package over PLIUM would mix brands, install paths,
 *     encrypted profiles and signing identities, so a feed pointing anywhere
 *     else must disable updating rather than "just work".
 *  2. Installing happens while PLIUM is not running (on quit, or immediately
 *     when the user asks to restart). We never poll for an idle desktop:
 *     Chrome, Edge and electron-updater v27+ all apply updates on next launch
 *     for the same reason — an idle-desktop gate is unsatisfiable on machines
 *     with continuous input (remote desktop, KVM, accessibility tools).
 */
import type { UpdateMode } from '../../shared/types'

/** The single trusted release channel. Keep in sync with package.json build.publish. */
export const UPDATE_CHANNEL = {
  provider: 'github',
  owner: 'ardss',
  repo: 'PLIUM'
} as const

export interface UpdateChannelConfig {
  provider: string
  owner: string
  repo: string
}

/**
 * Parse the `app-update.yml` emitted by electron-builder. Returns null when the
 * document is empty or unreadable — callers treat that as "no usable feed".
 */
export function parseUpdateChannelYml(source: string | null | undefined): UpdateChannelConfig | null {
  if (!source) return null
  const get = (key: string): string | null => {
    // Minimal YAML read: electron-builder writes flat `key: value` pairs and
    // never nests these three keys, so a full parser would be overkill here.
    const match = source.match(new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, 'm'))
    if (!match) return null
    return match[1].replace(/^['"]|['"]$/g, '')
  }
  const provider = get('provider')
  const owner = get('owner')
  const repo = get('repo')
  if (!provider || !owner || !repo) return null
  return { provider, owner, repo }
}

/**
 * True only for the PLIUM GitHub release feed. Compared case-insensitively
 * because GitHub treats owner/repo as case-insensitive.
 */
export function isTrustedUpdateChannel(channel: UpdateChannelConfig | null): boolean {
  if (!channel) return false
  return (
    channel.provider.toLowerCase() === UPDATE_CHANNEL.provider &&
    channel.owner.toLowerCase() === UPDATE_CHANNEL.owner.toLowerCase() &&
    channel.repo.toLowerCase() === UPDATE_CHANNEL.repo.toLowerCase()
  )
}

/** Human-readable feed URL used for the fast GitHub API check and for diagnostics. */
export function releaseApiUrl(owner = UPDATE_CHANNEL.owner, repo = UPDATE_CHANNEL.repo): string {
  return `https://api.github.com/repos/${owner}/${repo}/releases/latest`
}

export function releasePageUrl(owner = UPDATE_CHANNEL.owner, repo = UPDATE_CHANNEL.repo): string {
  return `https://github.com/${owner}/${repo}/releases`
}

/** How an already-downloaded update should reach the disk. */
export interface InstallPolicy {
  /** Download automatically in the background ('auto' mode only). */
  autoDownload: boolean
  /** Apply the staged update when the app exits — the platform default. */
  installOnAppQuit: boolean
  /** Check the feed at startup without user action. */
  checkAtStartup: boolean
}

/**
 * Derive electron-updater behaviour from the user's mode.
 *
 * `off` is fully network-silent: no check, no download, no install.
 * `notify` checks only and waits for an explicit click before downloading.
 * `auto` downloads in the background and installs on quit.
 *
 * In every mode the install itself waits for PLIUM to stop running, so an
 * update never interrupts an active session.
 */
export function resolveInstallPolicy(mode: UpdateMode): InstallPolicy {
  if (mode === 'off') {
    return { autoDownload: false, installOnAppQuit: false, checkAtStartup: false }
  }
  if (mode === 'notify') {
    return { autoDownload: false, installOnAppQuit: false, checkAtStartup: true }
  }
  return { autoDownload: true, installOnAppQuit: true, checkAtStartup: true }
}

/** Compare dotted versions; returns 1 / 0 / -1. Tolerates a leading `v` and missing parts. */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string): number[] =>
    value
      .replace(/^v/i, '')
      .split('-')[0]
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0)
  const left = parse(a)
  const right = parse(b)
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const x = left[i] ?? 0
    const y = right[i] ?? 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}
