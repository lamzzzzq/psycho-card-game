import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('public/brand/generated/round6-four-directions/hive/refinements');
const size = 960;

const variants = [
  {
    id: 'hive-06-refined-core',
    label: '网站主调：暖金、墨色、柔绿、陶土',
    fills: ['#c39a52', '#3a3020', '#6f8f55', '#c9603f', '#c9603f'],
    psi: '#fdf8f1',
  },
  {
    id: 'hive-06-refined-paper',
    label: '更克制：暖砂、深金、象牙、柔绿',
    fills: ['#dccdae', '#9a7448', '#fdf8f1', '#6f8f55', '#c39a52'],
    psi: '#3a3020',
  },
  {
    id: 'hive-06-refined-warm',
    label: '强调入口：暖金、陶土、深墨',
    fills: ['#c39a52', '#c9603f', '#3a3020', '#c9603f', '#eaddc4'],
    psi: '#fdf8f1',
  },
];

function hex(cx, cy, width, height, fill) {
  const halfW = width / 2;
  const halfH = height / 2;
  const shoulder = width * 0.23;
  const points = [
    [cx - halfW + shoulder, cy - halfH],
    [cx + halfW - shoulder, cy - halfH],
    [cx + halfW, cy],
    [cx + halfW - shoulder, cy + halfH],
    [cx - halfW + shoulder, cy + halfH],
    [cx - halfW, cy],
  ].map((point) => point.join(',')).join(' ');
  return `<polygon points="${points}" fill="${fill}" stroke="${fill}" stroke-width="18" stroke-linejoin="round" />`;
}

function logoSvg({ fills, psi }) {
  const [gold, ink, sage, terracottaLarge, terracottaSmall] = fills;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#f4edd9"/>
    <!-- Intentional asymmetry: preserve the approved large-left / small-right honeycomb balance. -->
    ${hex(282, 276, 330, 302, gold)}
    ${hex(642, 265, 186, 210, ink)}
    ${hex(180, 570, 190, 186, sage)}
    ${hex(770, 570, 246, 268, terracottaLarge)}
    ${hex(386, 774, 192, 170, terracottaSmall)}
    <!-- Georgia's canonical capital Psi is softened with a same-color round stroke to match the hex corners. -->
    <text x="482" y="666" text-anchor="middle" font-family="Georgia, 'PT Serif', serif" font-size="282" font-weight="700" fill="${psi}" stroke="${psi}" stroke-width="9" stroke-linejoin="round" paint-order="stroke">Ψ</text>
  </svg>`;
}

await mkdir(outputDir, { recursive: true });
for (const variant of variants) {
  await sharp(Buffer.from(logoSvg(variant))).png().toFile(path.join(outputDir, `${variant.id}.png`));
}

console.log(`Generated ${variants.length} refined honeycomb PNGs in ${outputDir}`);
