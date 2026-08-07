#!/usr/bin/env node
// Generates an inverted-teardrop marker PNG (RGBA) with no external deps.
//
// Geometry (matches the app's marker spec, pointer tip at the very bottom):
//   canvas: 48x48 (pointer bottom tip sits at y=48)
//   rounded-square body: ~34 tall, 6px corner radius, pointer overlaps body
//   pointer: 10 wide x 6 tall triangle, apex at y=48 (bottom-center)
//
// Usage:
//   node scripts/generate-teardrop.mjs <outPath> [hexBodyColor] [hexGlyphColor]
// Example:
//   node scripts/generate-teardrop.mjs assets/brands/default.png '#0C8599' '#FFFFFF'

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const W = 48;
const H = 48;

const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

function hexToRgb(hex, fallback) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return fallback;
  return {
    r: parseInt(m[1].slice(0, 2), 16),
    g: parseInt(m[1].slice(2, 4), 16),
    b: parseInt(m[1].slice(4, 6), 16),
  };
}

// Signed distance to a triangle. Returns negative inside.
function triangleSDF(px, py, p0, p1, p2) {
  const [ax, ay] = p0, [bx, by] = p1, [cx, cy] = p2;
  const e0 = [bx - ax, by - ay];
  const e1 = [cx - bx, cy - by];
  const e2 = [ax - cx, ay - cy];
  const v0 = [px - ax, py - ay];
  const v1 = [px - bx, py - by];
  const v2 = [px - cx, py - cy];
  const cross = (u, w) => u[0] * w[1] - u[1] * w[0];
  const s = cross(e0, e2) < 0 ? -1 : 1;
  const d0 = cross(e0, v0) * s;
  const d1 = cross(e1, v1) * s;
  const d2 = cross(e2, v2) * s;
  if (d0 >= 0 && d1 >= 0 && d2 >= 0) return -Math.min(d0, d1, d2);
  const seg = (a, b) => {
    const ab = [b[0] - a[0], b[1] - a[1]];
    const t = clamp(((px - a[0]) * ab[0] + (py - a[1]) * ab[1]) / (ab[0] * ab[0] + ab[1] * ab[1]));
    return Math.hypot(px - (a[0] + ab[0] * t), py - (a[1] + ab[1] * t));
  };
  return Math.min(Math.max(seg(p0, p1), -d0), Math.max(seg(p1, p2), -d1), Math.max(seg(p2, p0), -d2));
}

// Rounded-rect SDF centered at (cx, cy) with half-size hw/hh and radius r.
function rrectSDF(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

// SDF of the full teardrop: body + pointer triangle (union via min).
// Visible teardrop is ~28x34 (spec 28x32) inside the 48x48 canvas, leaving
// transparent padding so the clickable area stays 48x48.
//   body: 28 wide x 28 tall, 6px radius, top at y=14, bottom at y=42
//   pointer: 10 wide x 6 tall, base at y=42, tip at y=48
function teardropSDF(px, py) {
  const body = rrectSDF(px, py, W / 2, 28, 14, 14, 6);
  const tri = triangleSDF(px, py, [W / 2 - 5, 42], [W / 2 + 5, 42], [W / 2, 48]);
  return Math.min(body, tri);
}

function coverage(px, py) {
  const ss = 4;
  let hit = 0;
  for (let sy = 0; sy < ss; sy++) {
    for (let sx = 0; sx < ss; sx++) {
      if (teardropSDF(px + (sx + 0.5) / ss, py + (sy + 0.5) / ss) < 0) hit++;
    }
  }
  return hit / (ss * ss);
}

function buildRgba() {
  const body = hexToRgb(process.argv[3], { r: 12, g: 133, b: 153 });
  const glyph = hexToRgb(process.argv[4], { r: 255, g: 255, b: 255 });
  const out = new Uint8ClampedArray(W * H * 4);
  const o = 0.9;
  const br = Math.round(body.r * (1 - o) + glyph.r * o);
  const bg = Math.round(body.g * (1 - o) + glyph.g * o);
  const bb = Math.round(body.b * (1 - o) + glyph.b * o);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = coverage(x, y);
      out[i + 3] = Math.round(a * 255);
      out[i] = br;
      out[i + 1] = bg;
      out[i + 2] = bb;
    }
  }
  return out;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(rgba, w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.subarray(y * stride, (y + 1) * stride).forEach((v, i) => {
      raw[y * (stride + 1) + 1 + i] = v;
    });
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- SDF status dot (for open/closed tinting) ---
// 24x24 canvas, filled circle radius 9. Encodes signed distance in alpha:
// alpha = 0.5 + sdf * K clamped, so MapLibre's icon-halo/color work on it.
const DOT_SIZE = 24;
const DOT_RADIUS = 9;
function buildDotRgba() {
  const out = new Uint8ClampedArray(DOT_SIZE * DOT_SIZE * 4);
  const K = 0.5;
  const c = (DOT_SIZE - 1) / 2;
  for (let y = 0; y < DOT_SIZE; y++) {
    for (let x = 0; x < DOT_SIZE; x++) {
      const d = Math.hypot(x - c, y - c);
      const sdf = DOT_RADIUS - d;
      const a = clamp(0.5 + sdf * K, 0, 1);
      const i = (y * DOT_SIZE + x) * 4;
      out[i] = 255; out[i + 1] = 255; out[i + 2] = 255;
      out[i + 3] = Math.round(a * 255);
    }
  }
  return out;
}

const mode = process.argv[2];
if (mode === 'dot') {
  const outPath = resolve(process.argv[3] || 'status-dot.png');
  const png = encodePng(buildDotRgba(), DOT_SIZE, DOT_SIZE);
  writeFileSync(outPath, png);
  console.log(`Wrote ${outPath} (${DOT_SIZE}x${DOT_SIZE} SDF)`);
} else {
  const outPath = resolve(process.argv[2] || 'default.png');
  const png = encodePng(buildRgba(), W, H);
  writeFileSync(outPath, png);
  console.log(`Wrote ${outPath} (${W}x${H})`);
}