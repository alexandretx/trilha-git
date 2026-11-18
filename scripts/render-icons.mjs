import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const paper = [0xf3, 0xef, 0xe6, 255];
const ink = [0x1c, 0x19, 0x15, 255];
const accent = [0x2c, 0x56, 0x40, 255];

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function png(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function render(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const set = (x, y, color) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= size || py >= size) return;
    const offset = (py * size + px) * 4;
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = color[3];
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) set(x, y, paper);
  }
  const fill = (x, y, width, height, color) => {
    for (let py = y; py < y + height; py += 1) {
      for (let px = x; px < x + width; px += 1) set(px, py, color);
    }
  };

  fill(size * 0.16, size * 0.2, size * 0.045, size * 0.6, accent);
  fill(size * 0.3, size * 0.3, size * 0.055, size * 0.4, ink);
  fill(size * 0.24, size * 0.3, size * 0.18, size * 0.055, ink);

  const cx = size * 0.7;
  const cy = size * 0.46;
  const outer = size * 0.15;
  const inner = size * 0.085;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x - cx, y - cy);
      if (distance <= outer && distance >= inner) set(x, y, ink);
    }
  }
  fill(cx + outer - size * 0.055, cy - size * 0.02, size * 0.055, size * 0.24, ink);
  fill(cx - size * 0.02, cy + size * 0.2, outer * 0.85, size * 0.055, ink);
  return png(size, size, pixels);
}

writeFileSync('public/icon-192.png', render(192));
writeFileSync('public/icon-512.png', render(512));
