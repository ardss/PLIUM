import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileBodyFromPath } from '../electron/main/fileStream'

describe('Electron local file protocol stream lifecycle', () => {
  let dir: string
  let file: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'plium-undici-file-stream-'))
    file = join(dir, 'file.bin')
    writeFileSync(file, Buffer.alloc(512 * 1024, 0x5a))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('serves complete content through a WHATWG ReadableStream', async () => {
    const response = new Response(fileBodyFromPath(file), {
      headers: { 'Content-Type': 'image/png' }
    })
    expect(response.headers.get('content-type')).toBe('image/png')
    const bytes = new Uint8Array(await response.arrayBuffer())
    expect(bytes).toEqual(new Uint8Array(readFileSync(file)))
  })

  it('propagates premature cancellation safely to the native fs stream', async () => {
    for (let i = 0; i < 24; i++) {
      const response = new Response(fileBodyFromPath(file))
      const reader = response.body!.getReader()
      const first = await reader.read()
      expect(first.done).toBe(false)
      expect(first.value!.length).toBeGreaterThan(0)
      await expect(reader.cancel('renderer no longer needs thumbnail')).resolves.toBeUndefined()
    }
  })

  it('survives parallel canceled image requests', async () => {
    await Promise.all(Array.from({ length: 32 }, async (_, i) => {
      const response = new Response(fileBodyFromPath(file))
      const reader = response.body!.getReader()
      const first = await reader.read()
      expect(first.done).toBe(false)
      await reader.cancel('panel closed ' + i)
    }))
  })

  it('keeps all five local protocol paths off the unsafe undici async-iterable adapter', () => {
    const source = readFileSync(join(__dirname, '../electron/main/index.ts'), 'utf8')
    expect((source.match(/fileBodyFromPath\(/g) || []).length).toBe(5)
    expect(source).not.toContain('new Response(stream as unknown as ReadableStream')
    expect(source).not.toContain('createReadStream(')
    const adapter = readFileSync(join(__dirname, '../electron/main/fileStream.ts'), 'utf8')
    expect(adapter).toContain('Readable.toWeb(createReadStream(filePath))')
  })
})
