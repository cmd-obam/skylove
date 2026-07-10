import sharp from 'sharp';

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  console.error('Usage: node fix-footer-cross-alpha.mjs <input> <output>');
  process.exit(1);
}

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pixels = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  if (r < 40 && g < 40 && b < 40) {
    pixels[i + 3] = 0;
  }
}

await sharp(pixels, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(output);

console.log('saved', output, `${info.width}x${info.height}`);
