import sharp from 'sharp';

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  console.error('Usage: node remove-image-shadow.mjs <input> <output>');
  process.exit(1);
}

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
const { width, height } = info;

for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;

  const pixelIndex = i / 4;
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);
  const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y);
  const bottomDistance = height - 1 - y;

  const isDropShadow = saturation < 22 && min > 192 && max < 253;
  const isOuterVignette = saturation < 30 && min > 176 && max < 248;
  const isBottomShadow = bottomDistance < 48 && saturation < 36 && min > 165 && max < 252;

  if (isDropShadow || isBottomShadow || (edgeDistance < 90 && isOuterVignette)) {
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = 255;
  }
}

await sharp(pixels, {
  raw: { width, height, channels: 4 },
})
  .png()
  .toFile(output);

console.log('saved', output, `${width}x${height}`);
