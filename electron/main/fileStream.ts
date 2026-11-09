/**
 * Bridge a Node fs.ReadStream into a WHATWG byte stream for Electron's
 * protocol.handle Response. Never pass a Node ReadStream directly to Response:
 * undici's ReadableStreamFrom async-iterator adapter queues controller.close()
 * after the response can be canceled, causing uncaught ERR_INVALID_STATE on
 * Electron 45 / Node 24 when a thumbnail or icon load is abandoned.
 *
 * Readable.toWeb owns the stream lifecycle and propagates cancellation to the
 * underlying fs stream. It also preserves bounded streaming for large images.
 */
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'

export function fileBodyFromPath(filePath: string): ReadableStream<Uint8Array> {
  return Readable.toWeb(createReadStream(filePath)) as unknown as ReadableStream<Uint8Array>
}
