import sharp from 'sharp';

const input = 'src/assets/images/about/about-intro-bg.png';
const output = 'src/assets/images/about/about-intro-bg.png';

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

  const isDropShadow = saturation < 28 && min > 185 && max < 254;
  const isOuterVignette = saturation < 36 && min > 168 && max < 252;

  const pixelIndex = i / 4;
  const x = pixelIndex % width;
  const y = Math.floor(pixelIndex / width);
  const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y);

  if (isDropShadow || (edgeDistance < 120 && isOuterVignette)) {
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
