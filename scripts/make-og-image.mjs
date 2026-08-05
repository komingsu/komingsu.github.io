/**
 * Generates public/og-default.png.
 *
 * Social platforms do not reliably render SVG for `og:image`, so the shared
 * card has to be a raster file. This script is the source of truth for it —
 * re-run `node scripts/make-og-image.mjs` after changing the wording.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'og-default.png');

const W = 1200;
const H = 630;

/** Level sets of an elongated bowl — the same picture the blog is about. */
function contours() {
  const paths = [];
  const cx = 880;
  const cy = 330;
  for (let i = 1; i <= 9; i++) {
    const rx = i * 78;
    const ry = i * 34;
    const opacity = (0.4 - i * 0.032).toFixed(3);
    paths.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" ` +
        `stroke="#5a5a63" stroke-width="1.5" opacity="${opacity}" ` +
        `transform="rotate(-24 ${cx} ${cy})"/>`,
    );
  }
  return paths.join('\n    ');
}

/** A zig-zagging descent, because that is the story the contours set up. */
const descent =
  'M 1160 96 C 1010 190, 700 150, 792 268 C 848 340, 1000 300, 946 356 ' +
  'C 906 398, 830 372, 862 322 C 880 296, 900 320, 884 330';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#131316"/>
  <g>
    ${contours()}
  </g>
  <path d="${descent}" fill="none" stroke="#3987e5" stroke-width="4"
        stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
  <circle cx="884" cy="330" r="9" fill="#eb6834"/>

  <text x="88" y="286" fill="#f2f2f4" font-family="Ubuntu Sans, Ubuntu, DejaVu Sans, sans-serif"
        font-size="82" font-weight="700" letter-spacing="-2">Ko Minsu</text>
  <text x="88" y="348" fill="#a3a2a8" font-family="Ubuntu Sans, Ubuntu, DejaVu Sans, sans-serif"
        font-size="31" font-weight="400">Interactive notes on scientific ML</text>

  <rect x="88" y="404" width="86" height="4" rx="2" fill="#3987e5"/>
  <text x="88" y="470" fill="#77767c" font-family="Ubuntu Sans, Ubuntu, DejaVu Sans, sans-serif"
        font-size="24" font-weight="400">komingsu.github.io</text>
</svg>`;

await mkdir(dirname(out), { recursive: true });
const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
await writeFile(out, png);
console.log(`wrote ${out} (${(png.length / 1024).toFixed(1)} KB)`);
