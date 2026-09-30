import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const brandsDir = join(root, 'assets/brands');
const outputDir = join(brandsDir, 'markers');
const shape = PNG.sync.read(readFileSync(join(brandsDir, 'marker-shape.png')));

// Work in the original background's pixel grid, then export a 2x screen-size
// image. StationMap uses icon-size 0.50176, so 160x200 pixels still display at
// the original 80.28x100.35 screen pixels for every brand.
const sourceIconSize = 0.098;
const outputWidth = 160;
const outputHeight = 200;
const logoMaxWidth = Math.round(42 / sourceIconSize);
const wordmarkMaxWidth = Math.round(48 / sourceIconSize);
const logoMaxHeight = Math.round(22 / sourceIconSize);
const wordmarkMinHeight = Math.round(13 / sourceIconSize);
const outlineRadius = Math.round(1.2 / sourceIconSize);
const logoCenterX = Math.floor(shape.width / 2);
// Mirrors the former logo layer's -72 screen-pixel offset with an upright pin.
const logoCenterY = 289;
const check = process.argv.includes('--check');
const requestedBrand = process.argv.find((argument) => argument.startsWith('--brand='))?.slice('--brand='.length);

function visibleBounds(image) {
  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] < 8) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error('Logo contains no visible pixels');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function sampleBilinear(image, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(image.width - 1, x0 + 1);
  const y1 = Math.min(image.height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const result = [0, 0, 0, 0];

  for (const [sx, sy, weight] of [
    [x0, y0, (1 - fx) * (1 - fy)],
    [x1, y0, fx * (1 - fy)],
    [x0, y1, (1 - fx) * fy],
    [x1, y1, fx * fy],
  ]) {
    const offset = (sy * image.width + sx) * 4;
    const alpha = image.data[offset + 3] / 255;
    result[3] += alpha * weight;
    for (let channel = 0; channel < 3; channel++) {
      result[channel] += image.data[offset + channel] * alpha * weight;
    }
  }
  if (result[3] > 0) {
    for (let channel = 0; channel < 3; channel++) result[channel] /= result[3];
  }
  result[3] *= 255;
  return result;
}

function blend(data, offset, color) {
  const foregroundAlpha = color[3] / 255;
  const backgroundAlpha = data[offset + 3] / 255;
  const outputAlpha = foregroundAlpha + backgroundAlpha * (1 - foregroundAlpha);
  if (outputAlpha === 0) return;
  for (let channel = 0; channel < 3; channel++) {
    data[offset + channel] = Math.round(
      (color[channel] * foregroundAlpha + data[offset + channel] * backgroundAlpha * (1 - foregroundAlpha)) / outputAlpha,
    );
  }
  data[offset + 3] = Math.round(outputAlpha * 255);
}

function downsample(image) {
  const resized = new PNG({ width: outputWidth, height: outputHeight });
  for (let y = 0; y < outputHeight; y++) {
    const top = y * image.height / outputHeight;
    const bottom = (y + 1) * image.height / outputHeight;
    for (let x = 0; x < outputWidth; x++) {
      const left = x * image.width / outputWidth;
      const right = (x + 1) * image.width / outputWidth;
      let totalWeight = 0;
      let alphaSum = 0;
      const colors = [0, 0, 0];
      for (let sy = Math.floor(top); sy < Math.ceil(bottom); sy++) {
        const yWeight = Math.min(bottom, sy + 1) - Math.max(top, sy);
        for (let sx = Math.floor(left); sx < Math.ceil(right); sx++) {
          const weight = yWeight * (Math.min(right, sx + 1) - Math.max(left, sx));
          const source = (sy * image.width + sx) * 4;
          const alpha = image.data[source + 3] / 255;
          totalWeight += weight;
          alphaSum += alpha * weight;
          for (let channel = 0; channel < 3; channel++) {
            colors[channel] += image.data[source + channel] * alpha * weight;
          }
        }
      }
      const target = (y * outputWidth + x) * 4;
      if (alphaSum > 0) {
        for (let channel = 0; channel < 3; channel++) {
          resized.data[target + channel] = Math.round(colors[channel] / alphaSum);
        }
      }
      resized.data[target + 3] = Math.round(alphaSum / totalWeight * 255);
    }
  }
  return resized;
}

function compose(logo, brand) {
  const bounds = visibleBounds(logo);
  const isWordmark = bounds.width / bounds.height > 2.5;
  const scale = Math.min((isWordmark ? wordmarkMaxWidth : logoMaxWidth) / bounds.width, logoMaxHeight / bounds.height);
  const width = Math.max(1, Math.round(bounds.width * scale));
  // Recheio, Plenergy and similar wordmarks are only a few pixels tall when
  // uniformly scaled. Give these a modest height boost for map readability.
  const height = Math.max(
    1,
    Math.round(bounds.height * scale),
    isWordmark ? wordmarkMinHeight : 0,
  );
  const left = logoCenterX - Math.floor(width / 2);
  const top = logoCenterY - Math.floor(height / 2);
  const marker = new PNG({ width: shape.width, height: shape.height });
  shape.data.copy(marker.data);

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceX = bounds.left + ((x + 0.5) / width) * bounds.width - 0.5;
      const sourceY = bounds.top + ((y + 0.5) / height) * bounds.height - 0.5;
      const color = sampleBilinear(
        logo,
        Math.max(0, Math.min(logo.width - 1, sourceX)),
        Math.max(0, Math.min(logo.height - 1, sourceY)),
      );
      if (brand === 'nova.png') {
        // The supplied NOVA wordmark is both very dark and mostly translucent
        // (its strongest pixel is only ~160/255 alpha). Preserve its silhouette
        // and purple hue, but make the fill readable against the charcoal pin.
        color[0] = 188;
        color[1] = 107;
        color[2] = 229;
        color[3] = Math.min(255, color[3] * 3);
      }
      pixels.set(color, (y * width + x) * 4);
    }
  }

  // Dilate the actual alpha silhouette, rather than the 48x48 logo canvas.
  // This gives small wordmarks a white edge without drawing a white box.
  const haloWidth = width + outlineRadius * 2;
  const haloHeight = height + outlineRadius * 2;
  const halo = new Uint8Array(haloWidth * haloHeight);
  const disk = [];
  for (let dy = -outlineRadius; dy <= outlineRadius; dy++) {
    for (let dx = -outlineRadius; dx <= outlineRadius; dx++) {
      if (dx * dx + dy * dy <= outlineRadius * outlineRadius) disk.push([dx, dy]);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha < 8) continue;
      for (const [dx, dy] of disk) {
        const at = (y + dy + outlineRadius) * haloWidth + x + dx + outlineRadius;
        if (alpha > halo[at]) halo[at] = alpha;
      }
    }
  }
  for (let y = 0; y < haloHeight; y++) {
    for (let x = 0; x < haloWidth; x++) {
      const alpha = halo[y * haloWidth + x];
      if (!alpha) continue;
      const markerX = left - outlineRadius + x;
      const markerY = top - outlineRadius + y;
      if (markerX < 0 || markerX >= shape.width || markerY < 0 || markerY >= shape.height) continue;
      blend(marker.data, (markerY * shape.width + markerX) * 4, [255, 255, 255, alpha]);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (!pixels[offset + 3]) continue;
      blend(marker.data, ((top + y) * shape.width + left + x) * 4, pixels.subarray(offset, offset + 4));
    }
  }
  return PNG.sync.write(downsample(marker));
}

const brands = readdirSync(brandsDir)
  .filter((name) => name.endsWith('.png') && name !== 'marker-shape.png')
  .sort();
if (!brands.includes('default.png')) throw new Error('Missing default brand logo');
if (requestedBrand && !brands.includes(`${requestedBrand}.png`)) {
  throw new Error(`Unknown brand: ${requestedBrand}`);
}
if (!check) mkdirSync(outputDir, { recursive: true });
for (const brand of brands) {
  if (requestedBrand && brand !== `${requestedBrand}.png`) continue;
  const output = join(outputDir, brand);
  const rendered = compose(PNG.sync.read(readFileSync(join(brandsDir, brand))), brand);
  if (check) {
    let existing;
    try { existing = readFileSync(output); } catch { throw new Error(`Missing generated marker: ${output}`); }
    if (!existing.equals(rendered)) throw new Error(`Stale generated marker: ${output}`);
  } else {
    writeFileSync(output, rendered);
  }
  console.log(`${check ? 'Checked' : 'Generated'} ${brand}`);
}
