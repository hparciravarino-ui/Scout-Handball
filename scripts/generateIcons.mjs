import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgBuffer = fs.readFileSync(path.join(process.cwd(), 'public/icon.svg'));

async function generate() {
  console.log('Generating PWA PNG icons from public/icon.svg...');

  // 1. pwa-192x192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(process.cwd(), 'public/pwa-192x192.png'));

  // 2. pwa-512x512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(process.cwd(), 'public/pwa-512x512.png'));

  // 3. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(process.cwd(), 'public/apple-touch-icon.png'));

  // 4. pwa-maskable-512x512.png (512x512 with 15% safe-zone padding)
  // Render inner icon at 384x384 and composite over a 512x512 solid navy background (#00008B)
  const resizedInner = await sharp(svgBuffer)
    .resize(384, 384)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 139, alpha: 1 }, // #00008B
    },
  })
    .composite([{ input: resizedInner, top: 64, left: 64 }])
    .png()
    .toFile(path.join(process.cwd(), 'public/pwa-maskable-512x512.png'));

  // 5. favicon.png (64x64)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(process.cwd(), 'public/favicon.png'));

  console.log('All PWA PNG icons generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
