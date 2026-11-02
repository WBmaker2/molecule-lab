import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(here, '../public/icons');
mkdirSync(outputDir, { recursive: true });

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const compressed = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function mix(a, b, t) {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * clamped),
    Math.round(a[1] + (b[1] - a[1]) * clamped),
    Math.round(a[2] + (b[2] - a[2]) * clamped),
  ];
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function segmentAlpha(px, py, ax, ay, bx, by, thickness) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  const dx = px - (ax + vx * t);
  const dy = py - (ay + vy * t);
  return 1 - smoothstep(thickness, thickness + 0.9, Math.hypot(dx, dy));
}

function render(size, maskable) {
  const rgba = Buffer.alloc(size * size * 4);
  const scale = maskable ? 0.8 : 1;
  const oxygen = [208, 106, 77];
  const oxygenDeep = [140, 63, 43];
  const hydrogen = [246, 241, 230];
  const hydrogenDeep = [185, 173, 150];
  const bond = [176, 139, 110];
  const brass = [192, 142, 58];

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      const samples = 2;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = ((px + (sx + 0.5) / samples) / size) * 64;
          const y = ((py + (sy + 0.5) / samples) / size) * 64;
          const ux = 32 + (x - 32) / scale;
          const uy = 32 + (y - 32) / scale;

          const backgroundDistance = Math.hypot(ux - 30, uy - 28) / 39;
          let color = mix([48, 60, 42], [22, 30, 19], backgroundDistance);

          const ringDistance = Math.abs(Math.hypot(ux - 32, uy - 32) - 27.5);
          const ringAlpha = (1 - smoothstep(0.28, 0.82, ringDistance)) * 0.34;
          if (ringAlpha > 0) color = mix(color, brass, ringAlpha);

          const oxygenX = 32;
          const oxygenY = 38;
          const hydrogenLeft = [18, 20];
          const hydrogenRight = [46, 20];
          const bondThickness = 1.9;
          const leftBond = segmentAlpha(
            ux,
            uy,
            oxygenX,
            oxygenY,
            hydrogenLeft[0],
            hydrogenLeft[1],
            bondThickness,
          );
          const rightBond = segmentAlpha(
            ux,
            uy,
            oxygenX,
            oxygenY,
            hydrogenRight[0],
            hydrogenRight[1],
            bondThickness,
          );
          const bondAlpha = Math.max(leftBond, rightBond);
          if (bondAlpha > 0) color = mix(color, bond, bondAlpha * 0.95);

          const oxygenDistance = Math.hypot(ux - oxygenX, uy - oxygenY);
          const oxygenGlow = Math.exp(-((oxygenDistance / 15) ** 2)) * 0.24;
          if (oxygenGlow > 0) color = mix(color, oxygen, oxygenGlow);
          if (oxygenDistance < 12.4) {
            const highlight = Math.max(
              0,
              1 - Math.hypot(ux - oxygenX + 3.5, uy - oxygenY + 4) / 17,
            );
            const sphere = mix(oxygen, oxygenDeep, 0.45 - highlight * 0.45);
            color = mix(color, sphere, 1 - smoothstep(10.7, 12.2, oxygenDistance));
          }

          for (const [hx, hy] of [hydrogenLeft, hydrogenRight]) {
            const distance = Math.hypot(ux - hx, uy - hy);
            const glow = Math.exp(-((distance / 9) ** 2)) * 0.2;
            if (glow > 0) color = mix(color, hydrogen, glow);
            if (distance < 7.8) {
              const highlight = Math.max(0, 1 - Math.hypot(ux - hx + 1.8, uy - hy + 2) / 10);
              const sphere = mix(hydrogen, hydrogenDeep, 0.35 - highlight * 0.35);
              color = mix(color, sphere, 1 - smoothstep(6.4, 7.6, distance));
            }
          }

          r += color[0];
          g += color[1];
          b += color[2];
        }
      }
      const total = samples * samples;
      const index = (py * size + px) * 4;
      rgba[index] = Math.round(r / total);
      rgba[index + 1] = Math.round(g / total);
      rgba[index + 2] = Math.round(b / total);
      rgba[index + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
]) {
  writeFileSync(resolve(outputDir, name), render(size, maskable));
  console.log(`wrote public/icons/${name}`);
}
