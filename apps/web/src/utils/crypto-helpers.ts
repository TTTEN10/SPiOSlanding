/**
 * Normalize byte views for Web Crypto APIs under strict TypeScript DOM typings
 * (avoids SharedArrayBuffer / ArrayBufferLike variance on Uint8Array generics).
 * Always copies into a fresh ArrayBuffer-backed view so the result is a valid BufferSource.
 */
export function toBufferSource(bytes: Uint8Array): BufferSource {
  const ab = new ArrayBuffer(bytes.byteLength);
  const out = new Uint8Array(ab);
  out.set(bytes);
  return out;
}
