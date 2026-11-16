/**
 * Windows-only, user-scoped DPAPI envelope independent of Chromium's Local State.
 *
 * The previous Electron safeStorage provider may cache a Chromium AES key in
 * memory until a normal application exit writes Local State. If the first
 * process is killed, an already-written encrypted index can be undecipherable.
 * CryptProtectData protects every blob directly with the logged-in Windows
 * user's DPAPI identity, without relying on an unflushed Chromium key file.
 *
 * Legacy safeStorage ciphertext is still read by ItemStore, never rewritten
 * unless its content can be successfully decrypted.
 */
import koffi from 'koffi'

type DpapiFn = (input: { cbData: number; pbData: Buffer }, description: null, entropy: null, reserved: null, prompt: null, flags: number, output: Record<string, unknown>) => boolean
type NativeApi = {
  protect: DpapiFn
  unprotect: DpapiFn
  localFree: (pointer: unknown) => unknown
}

let native: NativeApi | null = null
if (process.platform === 'win32') {
  try {
    koffi.struct('PLIUM_DATA_BLOB', { cbData: 'uint32', pbData: 'void *' })
    const crypt32 = koffi.load('crypt32.dll')
    const kernel32 = koffi.load('kernel32.dll')
    native = {
      protect: crypt32.func('bool CryptProtectData(const PLIUM_DATA_BLOB *input, str16 description, const PLIUM_DATA_BLOB *entropy, void *reserved, void *prompt, uint32 flags, _Out_ PLIUM_DATA_BLOB *output)') as DpapiFn,
      unprotect: crypt32.func('bool CryptUnprotectData(const PLIUM_DATA_BLOB *input, void *description, const PLIUM_DATA_BLOB *entropy, void *reserved, void *prompt, uint32 flags, _Out_ PLIUM_DATA_BLOB *output)') as DpapiFn,
      localFree: kernel32.func('void *LocalFree(void *ptr)') as (pointer: unknown) => unknown
    }
  } catch (err) {
    console.error('[DPAPI] Windows DPAPI unavailable:', err)
  }
}

export function hasDirectDpapi(): boolean {
  return native !== null
}

function crypt(algorithm: 'protect' | 'unprotect', bytes: Buffer): Buffer {
  if (!native) throw new Error('Windows DPAPI is unavailable')
  if (!bytes.length) throw new Error('Cannot encrypt an empty DPAPI payload')
  if (bytes.length > 0xffffffff) throw new Error('DPAPI payload is too large')
  const out: { pbData?: unknown; cbData?: number } = {}
  const ok = native[algorithm]({ cbData: bytes.length, pbData: bytes }, null, null, null, null, 1, out)
  if (!ok || !out.pbData || !out.cbData) throw new Error('Crypt' + (algorithm === 'protect' ? 'ProtectData' : 'UnprotectData') + ' failed')
  try {
    return Buffer.from(koffi.decode(out.pbData, 'uint8_t', out.cbData))
  } finally {
    native.localFree(out.pbData)
  }
}

export function dpapiProtect(text: string): Buffer {
  return crypt('protect', Buffer.from(text, 'utf8'))
}

export function dpapiUnprotect(encrypted: Buffer): string {
  return crypt('unprotect', encrypted).toString('utf8')
}
