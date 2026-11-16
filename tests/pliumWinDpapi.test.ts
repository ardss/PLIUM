import { describe, expect, it } from 'vitest'
import { dpapiProtect, dpapiUnprotect, hasDirectDpapi } from '../electron/store/winDpapi'

describe('PLIUM direct Windows DPAPI (independent of Chromium Local State)', () => {
  it.skipIf(process.platform !== 'win32')('encrypts and decrypts synthetic data with the current Windows user', () => {
    expect(hasDirectDpapi()).toBe(true)
    const original = 'PLIUM dedicated DPAPI check • ' + '文字'.repeat(500)
    const ciphertext = dpapiProtect(original)
    expect(ciphertext.byteLength).toBeGreaterThan(0)
    expect(ciphertext.toString('utf8')).not.toContain(original.slice(0, 20))
    expect(dpapiUnprotect(ciphertext)).toBe(original)
  })
})
