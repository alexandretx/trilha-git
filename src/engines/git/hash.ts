const encoder = new TextEncoder();

export function encodeUtf8(value: string): Uint8Array {
  return encoder.encode(value);
}

export function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

function rotl(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

/** SHA-1 of raw bytes. Used for Git object ids, which are SHA-1 of the object header plus payload. */
export function sha1(message: Uint8Array): Uint8Array {
  const bitLen = message.length * 8;
  const pad = (56 - ((message.length + 1) % 64) + 64) % 64;
  const total = message.length + 1 + pad + 8;
  const data = new Uint8Array(total);
  data.set(message);
  data[message.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(total - 8, Math.floor(bitLen / 2 ** 32));
  view.setUint32(total - 4, bitLen >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const words = new Uint32Array(80);

  for (let offset = 0; offset < data.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 80; index += 1) {
      const mixed =
        (words[index - 3] ?? 0) ^
        (words[index - 8] ?? 0) ^
        (words[index - 14] ?? 0) ^
        (words[index - 16] ?? 0);
      words[index] = rotl(mixed, 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let index = 0; index < 80; index += 1) {
      let f: number;
      let k: number;
      if (index < 20) {
        f = ((b & c) | (~b & d)) >>> 0;
        k = 0x5a827999;
      } else if (index < 40) {
        f = (b ^ c ^ d) >>> 0;
        k = 0x6ed9eba1;
      } else if (index < 60) {
        f = ((b & c) | (b & d) | (c & d)) >>> 0;
        k = 0x8f1bbcdc;
      } else {
        f = (b ^ c ^ d) >>> 0;
        k = 0xca62c1d6;
      }
      const next = (rotl(a, 5) + f + e + k + (words[index] ?? 0)) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = next;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const digest = new Uint8Array(20);
  const out = new DataView(digest.buffer);
  out.setUint32(0, h0);
  out.setUint32(4, h1);
  out.setUint32(8, h2);
  out.setUint32(12, h3);
  out.setUint32(16, h4);
  return digest;
}

export function sha1Hex(message: Uint8Array): string {
  return toHex(sha1(message));
}
