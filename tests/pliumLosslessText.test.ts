import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const roots = vi.hoisted(() => ({ userData: '', home: '' }))
const dpapi = vi.hoisted(() => ({ available: true, key: 'k1' }))

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => join(roots.userData, 'app'),
    getPath: (name: string) => name === 'userData' ? roots.userData : join(roots.userData, name)
  },
  nativeImage: { createFromPath: () => ({ isEmpty: () => true }) },
  safeStorage: {
    isEncryptionAvailable: () => dpapi.available,
    encryptString: (value: string) => Buffer.from('ENC:' + dpapi.key + ':' + value, 'utf8'),
    decryptString: (buffer: Buffer) => {
      const value = buffer.toString('utf8')
      const prefix = 'ENC:' + dpapi.key + ':'
      if (!value.startsWith(prefix)) throw new Error('DPAPI key mismatch')
      return value.slice(prefix.length)
    }
  }
}))
vi.mock('../electron/store/winDpapi', () => ({
  hasDirectDpapi: () => dpapi.available,
  dpapiProtect: (text: string) => Buffer.from('ENC:' + dpapi.key + ':' + text, 'utf8'),
  dpapiUnprotect: (encrypted: Buffer) => {
    const str = encrypted.toString('utf8')
    const head = 'ENC:' + dpapi.key + ':'
    if (!str.startsWith(head)) throw new Error('Synthetic DPAPI key mismatch')
    return str.slice(head.length)
  }
}))

vi.mock('node:os', async (original) => {
  const real = await original<typeof import('node:os')>()
  return { ...real, homedir: () => roots.home }
})

import { ItemStore } from '../electron/store/ItemStore'
import { PATHS } from '../electron/store/paths'

const bigText = '一' + 'A'.repeat(600000) + '终' // past the previous 500,000-char truncation
const tinyLongText = 'This is legacy private text: ' + 'b'.repeat(500)

beforeEach(() => {
  const base = join(tmpdir(), 'plium-lossless-' + Date.now() + '-' + Math.random().toString(16).slice(2))
  roots.home = join(base, 'home')
  roots.userData = join(base, 'userData')
  mkdirSync(roots.home, { recursive: true })
  mkdirSync(roots.userData, { recursive: true })
  mkdirSync(join(roots.userData, 'payloads'), { recursive: true })
  mkdirSync(join(roots.userData, 'images'), { recursive: true })
  dpapi.available = true
  dpapi.key = 'k1'
})
afterEach(() => {
  rmSync(join(roots.userData, '..'), { recursive: true, force: true })
})

describe('PLIUM full-text data safety', () => {
  it('keeps >500k characters intact and encrypted through persistence and restart', () => {
    const store = new ItemStore()
    store.add({ kind: 'text', text: bigText, isUrl: false }, 250)
    const item = store.list()[0]
    expect(store.getFullText(item.id)).toBe(bigText)
    expect(store.getVerifiedFullText(item.id)).toBe(bigText)
    expect(item.data.kind === 'text' && item.data.hasFullPayload).toBe(true)
    const file = join(PATHS.payloadsDir(), item.id + '.txt')
    const raw = readFileSync(file, 'utf8')
    expect(raw.startsWith('PLIUM-WIN-DPAPI-TEXT-V1:')).toBe(true)
    expect(raw).not.toContain(bigText.slice(0, 100))
    expect(store.persistSync()).toBe(true)

    const reopened = new ItemStore()
    reopened.load()
    expect(reopened.list()).toHaveLength(1)
    expect(reopened.getFullText(item.id)).toBe(bigText)
    reopened.add({ kind: 'text', text: bigText, isUrl: false }, 250)
    expect(reopened.list()).toHaveLength(1)
    expect(reopened.list()[0].hitCount).toBe(2)
    reopened.persistSync()
  })

  it('migrates legacy plaintext sidecar upon use without losing content', () => {
    const store = new ItemStore()
    store.add({ kind: 'text', text: tinyLongText, isUrl: false }, 250)
    const id = store.list()[0].id
    const file = join(PATHS.payloadsDir(), id + '.txt')
    writeFileSync(file, tinyLongText, 'utf8') // legacy v10 file
    expect(store.getFullText(id)).toBe(tinyLongText)
    expect(readFileSync(file, 'utf8')).toMatch(/^PLIUM-WIN-DPAPI-TEXT-V1:/)
    store.persistSync()
    const reopened = new ItemStore()
    reopened.load()
    expect(reopened.getFullText(id)).toBe(tinyLongText)
    reopened.persistSync()
  })

  it('does not overwrite ciphertext when the DPAPI key is unavailable', () => {
    const store = new ItemStore()
    store.add({ kind: 'text', text: tinyLongText, isUrl: false }, 250)
    const id = store.list()[0].id
    const file = join(PATHS.payloadsDir(), id + '.txt')
    const saved = readFileSync(file)
    dpapi.key = 'other'
    expect(store.getVerifiedFullText(id)).toBeNull()
    expect(store.getFullText(id)).toBe(tinyLongText.slice(0, 300))
    expect(readFileSync(file).equals(saved)).toBe(true)
    dpapi.key = 'k1'
    expect(store.getFullText(id)).toBe(tinyLongText)
    store.persistSync()
  })

  it('returns null for an absent sidecar instead of pretending preview is full text', () => {
    const store = new ItemStore()
    store.add({ kind: 'text', text: tinyLongText, isUrl: false }, 250)
    const id = store.list()[0].id
    rmSync(join(PATHS.payloadsDir(), id + '.txt'))
    expect(store.getVerifiedFullText(id)).toBeNull()
    expect(store.list()).toHaveLength(1)
  })

  it('reads a v10 safeStorage index and can rewrite it as durable direct-DPAPI v3', () => {
    const legacy = { items: [{
      id: 'legacy-v2', data: { kind: 'text', text: 'legacy text', isUrl: false },
      capturedAt: Date.now(), hitCount: 1, pinned: false
    }] }
    const payload = Buffer.from('ENC:' + dpapi.key + ':' + JSON.stringify(legacy), 'utf8').toString('base64')
    writeFileSync(PATHS.indexFile(), JSON.stringify({ v: 2, encrypted: true, payload }), 'utf8')
    const originalIndex = readFileSync(PATHS.indexFile())
    const store = new ItemStore()
    store.load()
    expect(store.getFullText('legacy-v2')).toBe('legacy text')
    expect(store.persistSync()).toBe(true)
    expect(readFileSync(PATHS.indexFile() + '.pre-win-dpapi-v2.bak').equals(originalIndex)).toBe(true)
    expect(JSON.parse(readFileSync(PATHS.indexFile(), 'utf8'))).toMatchObject({
      v: 3, encrypted: true, crypto: 'win-dpapi-v1'
    })
    const reopened = new ItemStore()
    reopened.load()
    expect(reopened.getFullText('legacy-v2')).toBe('legacy text')
  })

  it('reads the former safeStorage-encrypted long-text sidecar', () => {
    const store = new ItemStore()
    store.add({ kind: 'text', text: tinyLongText, isUrl: false }, 250)
    const id = store.list()[0].id
    const file = join(PATHS.payloadsDir(), id + '.txt')
    const oldEncrypted = Buffer.from('ENC:' + dpapi.key + ':' + tinyLongText, 'utf8').toString('base64')
    writeFileSync(file, 'PLIUM-DPAPI-TEXT-V1:' + oldEncrypted, 'utf8')
    expect(store.getVerifiedFullText(id)).toBe(tinyLongText)
  })

  it('never marks a preview-only pointer when encryption is unavailable', () => {
    dpapi.available = false
    const store = new ItemStore()
    store.add({ kind: 'text', text: tinyLongText, isUrl: false }, 250)
    const item = store.list()[0]
    expect(item.data.kind === 'text' && item.data.hasFullPayload).toBeFalsy()
    expect(store.getFullText(item.id)).toBe(tinyLongText)
    expect(existsSync(join(PATHS.payloadsDir(), item.id + '.txt'))).toBe(false)
    store.persistSync()
  })
})
