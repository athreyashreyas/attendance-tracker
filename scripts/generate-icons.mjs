// Generates the PWA / home-screen icons: the checkmark knocked out in
// parchment-white over a full-bleed forest-green field — the brand colour is
// the field and the mark is the light negative space (matching Hisaab), the
// inverse of the old white-tile-with-a-green-mark scheme. A full opaque square
// means iOS and Android maskable both crop it cleanly with no transparent
// corners. The check geometry is the same path used by public/mask-icon.svg.
//
// Run with `node scripts/generate-icons.mjs` (needs `sharp` resolvable, e.g.
// `pnpm add -D sharp` or run via a workspace that already has it).

import sharp from 'sharp';

const OUT = new URL('../public/', import.meta.url);

const FIELD = '#14532D';   // forest green — the app's primary
const MARK = '#F7FBF8';    // parchment-white knockout

// Full 512 tile: green field + the checkmark from mask-icon.svg, recoloured to
// the light mark. No rounded corners — the OS applies its own mask.
const tileSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${FIELD}"/>
  <g fill="${MARK}" transform="translate(-49.48,-14.98) scale(1.08)">
    <circle cx="150" cy="230" r="8"/>
    <polygon points="157.06,226.24 244.12,372.47 215.88,387.53 142.94,233.76"/>
    <circle cx="230" cy="380" r="16"/>
    <path d="M 215.69,372.84 Q 297.01,222.88 426.54,106.39 L 433.46,113.61 Q 312.99,237.12 244.31,387.16 Z"/>
    <circle cx="430" cy="110" r="5"/>
  </g>
</svg>`;

const svg = Buffer.from(tileSvg);

// filename -> pixel size. pwa-* are the manifest (maskable) icons; the
// apple-touch-icon.png (180) doubles as the manifest's plain "any" entry.
const sizes = {
  'apple-touch-icon.png': 180,
  'apple-touch-icon-152x152.png': 152,
  'apple-touch-icon-167x167.png': 167,
  'pwa-192x192.png': 192,
  'pwa-512x512.png': 512,
};

for (const [file, size] of Object.entries(sizes)) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(new URL(file, OUT).pathname);
  console.log(`  ${file}  (${size}px)`);
}
console.log('done');
