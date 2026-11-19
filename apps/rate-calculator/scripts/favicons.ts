// tsx scripts/favicons.ts
// Builds the icon set in public/ from public/icon.png.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import sharp, { type Color } from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "public", "icon.png");
const out = join(root, "public");
const plate = { r: 11, g: 13, b: 12, alpha: 1 } satisfies Color;

async function contain(size: number): Promise<Buffer> {
  return sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function plated(size: number, padding: number): Promise<Buffer> {
  const inner = size - padding * 2;
  const logo = await sharp(source)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: plate },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toBuffer();
}

const transparent: Record<string, number> = {
  "favicon-32x32.png": 32,
  "favicon-96x96.png": 96,
};

for (const [name, size] of Object.entries(transparent)) {
  writeFileSync(join(out, name), await contain(size));
  console.log(`wrote public/${name}`);
}

const platedFiles: Record<string, [size: number, padding: number]> = {
  "apple-touch-icon.png": [180, 18],
  "web-app-manifest-192x192.png": [192, 22],
  "web-app-manifest-512x512.png": [512, 58],
};

for (const [name, [size, padding]] of Object.entries(platedFiles)) {
  writeFileSync(join(out, name), await plated(size, padding));
  console.log(`wrote public/${name}`);
}

const ico = await pngToIco([await contain(16), await contain(32), await contain(48)]);
writeFileSync(join(out, "favicon.ico"), ico);
console.log("wrote public/favicon.ico");
