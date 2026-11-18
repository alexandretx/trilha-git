import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const paper = [0xf3, 0xef, 0xe6, 255];
const ink = [0x1c, 0x19, 0x15, 255];
const accent = [0x2c, 0x56, 0x40, 255];

const glyphs = {
  t: 'M331 0Q263 0 231.0 36.5Q199 73 199 131V428H40V516H153Q182 516 194.0 527.5Q206 539 206 569V698H308V516H528V428H308V88H528V0Z',
  g: 'M570 -56Q570 -136 503.0 -174.0Q436 -212 299 -212Q232 -212 186.5 -203.5Q141 -195 112.5 -179.0Q84 -163 71.5 -140.0Q59 -117 59 -88Q59 -46 82.5 -22.5Q106 1 149 12V22Q123 32 107.5 50.0Q92 68 92 97Q92 135 118.0 154.5Q144 174 185 184V189Q138 211 112.0 251.0Q86 291 86 347Q86 388 101.0 421.5Q116 455 143.5 478.5Q171 502 209.5 515.0Q248 528 296 528Q350 528 393 511V528Q393 558 410.0 578.0Q427 598 462 598H556V512H436V488Q470 465 488.0 429.5Q506 394 506 347Q506 306 491.0 272.5Q476 239 448.5 215.5Q421 192 382.5 179.5Q344 167 296 167Q262 167 232 173Q214 168 196.0 156.0Q178 144 178 123Q178 99 201.0 93.0Q224 87 258 87H374Q478 87 524.0 47.5Q570 8 570 -56ZM468 -63Q468 -37 447.0 -21.5Q426 -6 371 -6H192Q154 -24 154 -64Q154 -93 178.5 -114.0Q203 -135 260 -135H341Q403 -135 435.5 -116.5Q468 -98 468 -63ZM296 242Q349 242 374.0 267.0Q399 292 399 334V361Q399 403 374.0 428.0Q349 453 296 453Q243 453 218.0 428.0Q193 403 193 361V334Q193 292 218.0 267.0Q243 242 296 242Z',
};

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

function flatten(path) {
  const numbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const commands = path.match(/[MQHVZ]/g) ?? [];
  const polygons = [];
  let cursor = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let current = [];
  const push = (nx, ny) => current.push([nx, ny]);
  const quad = (cx, cy, ex, ey) => {
    const steps = 8;
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const u = 1 - t;
      push(u * u * x + 2 * u * t * cx + t * t * ex, u * u * y + 2 * u * t * cy + t * t * ey);
    }
    x = ex;
    y = ey;
  };
  for (const command of commands) {
    if (command === 'M') {
      if (current.length > 2) polygons.push(current);
      x = numbers[cursor] ?? 0;
      y = numbers[cursor + 1] ?? 0;
      cursor += 2;
      startX = x;
      startY = y;
      current = [[x, y]];
    } else if (command === 'Q') {
      const cx = numbers[cursor] ?? 0;
      const cy = numbers[cursor + 1] ?? 0;
      const ex = numbers[cursor + 2] ?? 0;
      const ey = numbers[cursor + 3] ?? 0;
      cursor += 4;
      quad(cx, cy, ex, ey);
    } else if (command === 'H') {
      x = numbers[cursor] ?? x;
      cursor += 1;
      push(x, y);
    } else if (command === 'V') {
      y = numbers[cursor] ?? y;
      cursor += 1;
      push(x, y);
    } else if (command === 'Z') {
      push(startX, startY);
      polygons.push(current);
      current = [];
    }
  }
  if (current.length > 2) polygons.push(current);
  return polygons;
}

const outlines = {
  t: flatten(glyphs.t),
  g: flatten(glyphs.g),
};

function inside(polygons, px, py) {
  let hits = 0;
  for (const polygon of polygons) {
    for (let index = 0; index < polygon.length - 1; index += 1) {
      const a = polygon[index];
      const b = polygon[index + 1];
      if (!a || !b) continue;
      const crosses = a[1] > py !== b[1] > py;
      if (!crosses) continue;
      const x = ((b[0] - a[0]) * (py - a[1])) / (b[1] - a[1]) + a[0];
      if (px < x) hits += 1;
    }
  }
  return hits % 2 === 1;
}

function blend(base, color, coverage) {
  const amount = Math.max(0, Math.min(1, coverage));
  return [
    Math.round(base[0] * (1 - amount) + color[0] * amount),
    Math.round(base[1] * (1 - amount) + color[1] * amount),
    Math.round(base[2] * (1 - amount) + color[2] * amount),
    255,
  ];
}

function render(size, { inset }) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      pixels[offset] = paper[0];
      pixels[offset + 1] = paper[1];
      pixels[offset + 2] = paper[2];
      pixels[offset + 3] = 255;
    }
  }
  const paint = (x, y, color) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= size || py >= size) return;
    const offset = (py * size + px) * 4;
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = 255;
  };
  const fillRect = (x, y, width, height, color) => {
    for (let py = y; py < y + height; py += 1) {
      for (let px = x; px < x + width; px += 1) paint(px, py, color);
    }
  };

  const barX = size * (0.1 + inset);
  const barY = size * (0.18 + inset * 0.3);
  const barW = Math.max(2, size * 0.045);
  const barH = size * (0.64 - inset * 0.6);
  fillRect(barX, barY, barW, barH, accent);

  const scale = (size * (0.46 - inset * 0.15)) / 910;
  const originX = barX + barW + size * 0.06;
  const baseline = size * 0.62;
  const samples = 3;
  const letter = (polygons, shift) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let cover = 0;
        for (let sy = 0; sy < samples; sy += 1) {
          for (let sx = 0; sx < samples; sx += 1) {
            const fx = (x + (sx + 0.5) / samples - originX) / scale - shift;
            const fy = (baseline - (y + (sy + 0.5) / samples)) / scale;
            if (inside(polygons, fx, fy)) cover += 1;
          }
        }
        if (cover === 0) continue;
        const offset = (y * size + x) * 4;
        const mixed = blend(
          [pixels[offset], pixels[offset + 1], pixels[offset + 2], 255],
          ink,
          cover / (samples * samples),
        );
        pixels[offset] = mixed[0];
        pixels[offset + 1] = mixed[1];
        pixels[offset + 2] = mixed[2];
      }
    }
  };
  letter(outlines.t, 0);
  letter(outlines.g, 600);
  return png(size, size, pixels);
}

writeFileSync('public/icon-192.png', render(192, { inset: 0 }));
writeFileSync('public/icon-512.png', render(512, { inset: 0 }));
writeFileSync('public/icon-maskable-192.png', render(192, { inset: 0.08 }));
writeFileSync('public/icon-maskable-512.png', render(512, { inset: 0.08 }));

const favicon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#f3efe6"/>
  <rect x="3" y="6" width="2" height="20" fill="#2c5640"/>
  <g fill="#1c1915" transform="translate(7.2 26.2) scale(0.0175 -0.0175)">
    <path d="${glyphs.t}"/>
    <path d="${glyphs.g}" transform="translate(620 0)"/>
  </g>
</svg>
`;
writeFileSync('public/favicon.svg', favicon);
