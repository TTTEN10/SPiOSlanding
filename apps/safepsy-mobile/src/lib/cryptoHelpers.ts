export function toBufferSource(bytes: Uint8Array): BufferSource {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}
