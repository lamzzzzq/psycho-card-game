import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const out = path.join(root, 'public/brand/generated/round3');
const CREAM = '#fdf8f1';
const INK = '#3a3020';
const GOLD = '#c39a52';
const DEEP = '#805c30';
const SAGE = '#6f8f55';
const TERRACOTTA = '#c9603f';

const svg = (label, content) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${label}">
  <rect width="320" height="320" rx="42" fill="${CREAM}"/>
  <g stroke-linecap="round" stroke-linejoin="round">${content}</g>
</svg>`;
const hex = (x, y, r, attrs = '') => {
  const points = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 3 * i;
    return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${points}" ${attrs}/>`;
};
const dot = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const psi = (x, y, size, fill = GOLD) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="700" fill="${fill}">Ψ</text>`;

/* 01: Honeycomb is a silhouette / negative-space system, not a Ψ pasted onto a grid. */
function hive(index) {
  const cells = [
    [96,88],[160,88],[224,88], [64,144],[128,144],[192,144],[256,144], [96,200],[160,200],[224,200], [128,256],[192,256],
  ];
  if (index === 0) {
    return svg('Hive Glyph A', `${cells.map(([x,y], i) => hex(x,y,35, `fill="${[4,5,7,8].includes(i) ? GOLD : CREAM}" stroke="${[4,5,7,8].includes(i) ? GOLD : DEEP}" stroke-width="5"`)).join('')}
      <path d="M160 85 V245 M112 136 C112 188 208 188 208 136" fill="none" stroke="${CREAM}" stroke-width="15"/>
      <path d="M123 255 H197" stroke="${DEEP}" stroke-width="7"/>`);
  }
  if (index === 1) {
    return svg('Hive Glyph B', `<path d="M80 113 L160 66 L240 113 L240 207 L160 254 L80 207 Z" fill="none" stroke="${DEEP}" stroke-width="9"/>
      ${[[120,112],[160,135],[200,112],[120,158],[200,158],[120,204],[160,181],[200,204]].map(([x,y]) => hex(x,y,25, `fill="none" stroke="${GOLD}" stroke-width="5"`)).join('')}
      <path d="M160 111 V221 M130 139 C130 179 190 179 190 139" fill="none" stroke="${GOLD}" stroke-width="12"/>`);
  }
  return svg('Hive Glyph C', `<path d="M62 173 C62 104 103 65 157 65 C211 65 258 106 258 173" fill="none" stroke="${GOLD}" stroke-width="10"/>
    ${[[96,124],[135,101],[177,101],[216,124],[116,163],[160,163],[204,163]].map(([x,y],i) => hex(x,y,26, `fill="${i === 5 ? GOLD : CREAM}" stroke="${i === 5 ? GOLD : DEEP}" stroke-width="4"`)).join('')}
    <path d="M160 148 V238 M129 174 C129 207 191 207 191 174" fill="none" stroke="${DEEP}" stroke-width="10"/>`);
}

/* 02: a single polyhedral body; Ψ comes from a cutout or facet, never a pasted label. */
function poly(index) {
  const body = `<polygon points="160,43 250,104 221,225 99,225 70,104" fill="#f3e7c9" stroke="${DEEP}" stroke-width="8"/>
    <path d="M160 43 V225 M70 104 L221 225 M250 104 L99 225 M70 104 L250 104 M99 225 L221 225" fill="none" stroke="${DEEP}" stroke-width="6"/>`;
  if (index === 0) {
    return svg('Polyhedron Glyph A', `${body}<polygon points="160,86 196,147 160,208 124,147" fill="${GOLD}"/>
      <path d="M160 111 V190 M140 137 C140 169 180 169 180 137" fill="none" stroke="${CREAM}" stroke-width="10"/>`);
  }
  if (index === 1) {
    return svg('Polyhedron Glyph B', `${body}<polygon points="160,43 250,104 160,147" fill="#e3ca91"/><polygon points="70,104 160,147 99,225" fill="#ecd9ac"/>
      <polygon points="250,104 221,225 160,147" fill="#f7eedb"/><path d="M160 96 V205 M129 130 C129 174 191 174 191 130" fill="none" stroke="${GOLD}" stroke-width="12"/>`);
  }
  return svg('Polyhedron Glyph C', `<path d="M160 42 L251 105 L216 239 H104 L69 105 Z" fill="none" stroke="${GOLD}" stroke-width="10"/>
    <path d="M160 42 L160 239 M69 105 L216 239 M251 105 L104 239 M69 105 L251 105" fill="none" stroke="${DEEP}" stroke-width="5"/>
    <path d="M160 103 V215 M130 141 C130 183 190 183 190 141" fill="none" stroke="${DEEP}" stroke-width="12"/>${dot(160,42,12,TERRACOTTA)}`);
}

/* 03: orbit has a recognisable outer silhouette; node count deliberately stays variable. */
function orbit(index) {
  if (index === 0) {
    return svg('Orbit Glyph A', `<path d="M64 176 C65 94 138 46 215 76 C277 100 282 180 218 217" fill="none" stroke="${GOLD}" stroke-width="10"/>
      <path d="M86 226 C42 149 104 76 182 91" fill="none" stroke="${SAGE}" stroke-width="8"/>
      ${dot(215,76,12,TERRACOTTA)}${dot(86,226,11,SAGE)}${dot(218,217,10,DEEP)}${psi(160,211,116,DEEP)}`);
  }
  if (index === 1) {
    return svg('Orbit Glyph B', `<ellipse cx="160" cy="158" rx="118" ry="67" fill="none" stroke="${GOLD}" stroke-width="9" transform="rotate(-25 160 158)"/>
      <ellipse cx="160" cy="158" rx="68" ry="118" fill="none" stroke="${DEEP}" stroke-width="6" transform="rotate(28 160 158)"/>
      ${dot(59,169,12,TERRACOTTA)}${dot(220,61,11,SAGE)}${dot(260,151,10,GOLD)}${psi(160,210,112,GOLD)}`);
  }
  return svg('Orbit Glyph C', `<circle cx="160" cy="158" r="111" fill="none" stroke="${DEEP}" stroke-width="7"/>
    <path d="M80 210 A104 104 0 0 0 239 218" fill="none" stroke="${GOLD}" stroke-width="13"/>
    ${dot(160,47,13,GOLD)}${dot(259,158,11,TERRACOTTA)}${dot(77,158,11,SAGE)}<path d="M160 111 V228 M127 143 C127 187 193 187 193 143" fill="none" stroke="${GOLD}" stroke-width="13"/>`);
}

/* 04: an organic tree whose trunk is the Ψ itself — no stock icon plus a letter. */
function tree(index) {
  if (index === 0) {
    return svg('Tree Glyph A', `<path d="M160 259 V180 M160 204 C129 185 108 160 93 122 M160 204 C190 184 211 154 228 105 M118 159 L88 93 M200 158 L205 71" fill="none" stroke="${GOLD}" stroke-width="14"/>
      <path d="M160 162 V260 M128 190 C128 224 192 224 192 190" fill="none" stroke="${DEEP}" stroke-width="13"/>
      ${dot(88,93,13,SAGE)}${dot(205,71,14,TERRACOTTA)}${dot(93,122,10,GOLD)}${dot(228,105,11,DEEP)}<path d="M113 264 Q160 242 207 264" fill="none" stroke="${DEEP}" stroke-width="7"/>`);
  }
  if (index === 1) {
    return svg('Tree Glyph B', `<path d="M160 264 V170 M160 196 C121 184 99 145 83 93 M160 196 C198 178 221 137 237 86" fill="none" stroke="${DEEP}" stroke-width="13"/>
      <path d="M160 147 V257 M130 175 C130 213 190 213 190 175" fill="none" stroke="${GOLD}" stroke-width="14"/>
      ${dot(83,93,16,SAGE)}${dot(237,86,16,TERRACOTTA)}${dot(108,143,11,GOLD)}${dot(212,139,11,GOLD)}<circle cx="160" cy="154" r="116" fill="none" stroke="${GOLD}" stroke-width="6" opacity=".85"/>`);
  }
  return svg('Tree Glyph C', `<path d="M160 264 V169 M160 196 C132 177 106 148 80 100 M160 196 C188 177 214 148 240 100" fill="none" stroke="${GOLD}" stroke-width="14"/>
    <path d="M160 145 V259 M130 178 C130 216 190 216 190 178" fill="none" stroke="${DEEP}" stroke-width="14"/>
    ${dot(80,100,15,SAGE)}${dot(240,100,15,TERRACOTTA)}${dot(119,160,10,GOLD)}${dot(201,160,10,GOLD)}<path d="M102 264 Q160 242 218 264" fill="none" stroke="${GOLD}" stroke-width="8"/>`);
}

const families = [
  ['hive', hive], ['polyhedron', poly], ['orbit', orbit], ['tree', tree],
];
for (const [family, create] of families) {
  const folder = path.join(out, family);
  await fs.mkdir(folder, { recursive: true });
  for (let index = 0; index < 3; index++) {
    const name = `${family}-${String(index + 1).padStart(2, '0')}`;
    const mark = create(index);
    await fs.writeFile(path.join(folder, `${name}.svg`), mark);
    await sharp(Buffer.from(mark)).png().resize(960, 960).toFile(path.join(folder, `${name}.png`));
  }
}
console.log('Generated 12 round-three master logo marks.');
