import { readFile, readdir, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const root = new URL('../', import.meta.url);
// These files are both the editable originals and the Play Console uploads.
// Preparation crops screenshots in place; there is no second source folder.
const locales = ['en-US', 'pt-PT'];
const screens = ['home', 'prices', 'market'];
const checkOnly = process.argv.includes('--check');

function pngInfo(bytes, label) {
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`${label}: expected PNG`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  if (bitDepth !== 8 || colorType !== 2) {
    throw new Error(`${label}: expected 24-bit RGB PNG without alpha`);
  }
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'tRNS') throw new Error(`${label}: PNG transparency is not allowed`);
    offset += length + 12;
  }
  return { width, height };
}

function jpegInfo(bytes, label) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`${label}: expected JPEG`);
  for (let offset = 2; offset + 4 < bytes.length;) {
    if (bytes[offset] !== 0xff) throw new Error(`${label}: invalid JPEG marker`);
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) throw new Error(`${label}: invalid JPEG segment`);
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      const components = bytes[offset + 7];
      if (components !== 3) throw new Error(`${label}: expected three-channel RGB JPEG`);
      return { width, height };
    }
    offset += length;
  }
  throw new Error(`${label}: JPEG dimensions not found`);
}

function checkScreenshot(bytes, label) {
  const { width, height } = pngInfo(bytes, label);
  PNG.sync.read(bytes);
  if (width < 320 || height < 320 || width > 3840 || height > 3840 || height > 2 * width) {
    throw new Error(`${label}: dimensions ${width}×${height} are outside Google Play's limits`);
  }
  if (width * 16 !== height * 9) {
    throw new Error(`${label}: expected exact 9:16 portrait ratio, got ${width}×${height}`);
  }
  return { width, height };
}

function croppedScreenshot(bytes, label) {
  const { width, height } = pngInfo(bytes, label);
  if (width * 16 === height * 9) {
    checkScreenshot(bytes, label);
    return bytes;
  }
  if (Math.abs(width / height - 9 / 16) > 0.01) {
    throw new Error(`${label}: source is too far from 9:16 for a small crop`);
  }
  const scale = Math.min(Math.floor(width / 9), Math.floor(height / 16));
  const targetWidth = scale * 9;
  const targetHeight = scale * 16;
  const left = Math.floor((width - targetWidth) / 2);
  const top = Math.floor((height - targetHeight) / 2);
  const source = PNG.sync.read(bytes);
  const target = new PNG({ width: targetWidth, height: targetHeight });
  for (let row = 0; row < targetHeight; row++) {
    const start = ((row + top) * width + left) * 4;
    source.data.copy(target.data, row * targetWidth * 4, start, start + targetWidth * 4);
  }
  const output = PNG.sync.write(target, { colorType: 2 });
  checkScreenshot(output, label);
  return output;
}

const listingFiles = (await readdir(new URL('store/listings/', root))).filter((name) => name.endsWith('.md')).sort();
if (listingFiles.join(',') !== 'en-US.md,pt-PT.md') {
  throw new Error(`Expected only en-US and pt-PT store listings, found: ${listingFiles.join(', ')}`);
}

const icon = await readFile(new URL('store/play-upload/store-icon.png', root));
if (icon.length > 1024 * 1024 || icon.readUInt32BE(16) !== 512 || icon.readUInt32BE(20) !== 512 || icon[24] !== 8 || icon[25] !== 6) {
  throw new Error('Play Store icon must be a 512×512 32-bit RGBA PNG under 1024 KB');
}
PNG.sync.read(icon);

for (const locale of locales) {
  const featureTarget = new URL(`store/play-upload/${locale}/feature-graphic.jpg`, root);
  const featureBytes = await readFile(featureTarget);
  const featureDimensions = jpegInfo(featureBytes, featureTarget.pathname);
  if (featureDimensions.width !== 1024 || featureDimensions.height !== 500) {
    throw new Error(`${featureTarget.pathname}: feature graphic must be 1024×500`);
  }

  for (const [index, screen] of screens.entries()) {
    const target = new URL(`store/play-upload/${locale}/phone/${String(index + 1).padStart(2, '0')}-${screen}.png`, root);
    const input = await readFile(target);
    const output = checkOnly ? input : croppedScreenshot(input, target.pathname);
    if (!checkOnly) {
      if (!output.equals(input)) await writeFile(target, output);
    }
    const dimensions = checkScreenshot(output, target.pathname);
    console.log(`${locale} ${screen}: ${dimensions.width}×${dimensions.height}, RGB PNG`);
  }
}

console.log(checkOnly ? 'Google Play assets validated.' : 'Google Play assets prepared and validated.');
