import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const size = 1024;
const outputDir = path.resolve('public/brand/generated/round6-four-directions/hive/refinements');
const outputFile = path.join(outputDir, 'hive-06-six-cell-geometry.png');

// Each tile is a complete point-top regular hexagon. The irregular silhouette is
// created only by the six radii and their deliberately compact placement.
const cells = [
  { cx: 400, cy: 300, r: 190, fill: '#c39a52' }, // largest, upper-left anchor
  { cx: 688, cy: 300, r: 120, fill: '#3a3020' }, // 20px horizontal seam from gold
  { cx: 258, cy: 546, r: 115, fill: '#6f8f55' }, // 20px lower-left diagonal seam
  { cx: 548, cy: 557, r: 130, fill: '#9a7448' }, // central link, 20px lower-right diagonal seam
  { cx: 421, cy: 777, r: 140, fill: '#c9603f' }, // 20px lower-left diagonal seam from link
  { cx: 826, cy: 539, r: 175, fill: '#c9603f' }, // right anchor, 20px diagonal seam from ink
];

function regularHexagon({ cx, cy, r, fill }) {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');

  // A same-colour round stroke gives every otherwise regular hexagon the same
  // soft corner treatment without changing or cutting any edge.
  return `<polygon points="${points}" fill="${fill}" stroke="${fill}" stroke-width="6" stroke-linejoin="round" />`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#f4edd9" />
  ${cells.map(regularHexagon).join('\n  ')}
</svg>`;

await mkdir(outputDir, { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outputFile);
console.log(outputFile);
