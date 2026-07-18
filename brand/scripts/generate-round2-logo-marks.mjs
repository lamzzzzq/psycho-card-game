import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const out = path.join(root, 'public/brand/generated/round2');
const gold = '#c39a52';
const deepGold = '#9a7448';
const ink = '#3a3020';
const cream = '#fdf8f1';
const sage = '#6f8f55';
const terra = '#c9603f';

const wrap = (inner, label) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="${label}">
  <rect width="240" height="240" rx="30" fill="${cream}"/>
  <g stroke-linecap="round" stroke-linejoin="round">${inner}</g>
</svg>`;
const psi = (x = 120, y = 152, size = 110, color = gold) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="700" fill="${color}">Ψ</text>`;
const hex = (x, y, r = 28, attrs = '') => {
  const points = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 3 * i;
    return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${points}" ${attrs}/>`;
};
const dot = (x, y, color = gold, r = 7) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;

const names = {
  honeycomb: ['核心蜂巢', '开放蜂巢', '牌格蜂巢', '负形蜂巢', '聚合蜂巢', '蜂巢轨道', '节点蜂巢', '折线蜂巢', '极简蜂巢'],
  polyhedron: ['中心多面体', '金线多面体', '双层多面体', '切面 Ψ', '折纸多面体', '旋转多面体', '牌面多面体', '节点多面体', '极简多面体'],
  orbit: ['五点轨道', '开口轨道', '双轨 Ψ', '牌片轨道', '星群轨道', '环形关系', '行星轨道', '极简绕行', '印章轨道'],
  tree: ['人格树', '分枝 Ψ', '节点树', '根系 Ψ', '知识树', '双冠树', '生长印记', '枝叶轨道', '极简新芽'],
};

function honeycomb(i) {
  const cells = [[91,86],[149,86],[62,136],[120,136],[178,136],[91,186],[149,186]];
  const pattern = cells.map(([x,y], n) => hex(x, y, i === 2 && n === 3 ? 31 : 27, `fill="${i === 4 && n === 3 ? 'rgba(195,154,82,.24)' : 'none'}" stroke="${n === 3 ? gold : deepGold}" stroke-width="${n === 3 ? 5 : 3}" ${i === 7 && n % 2 ? 'stroke-dasharray="7 6"' : ''}`)).join('');
  const extra = [
    psi(120, 162, 74),
    `<path d="M53 166 C30 126 48 72 88 50 M187 166 C210 126 192 72 152 50" fill="none" stroke="${sage}" stroke-width="5"/>${psi(120, 160, 69)}`,
    `<rect x="51" y="49" width="138" height="142" rx="28" fill="none" stroke="${gold}" stroke-width="4"/>${psi(120, 161, 70)}`,
    `<circle cx="120" cy="136" r="40" fill="${cream}"/>${psi(120, 161, 74, deepGold)}`,
    psi(120, 161, 74),
    `<circle cx="120" cy="135" r="88" fill="none" stroke="${gold}" stroke-width="3"/>${psi(120, 161, 74)}`,
    `${dot(62,136,sage)}${dot(91,86,terra)}${dot(178,136,deepGold)}${psi(120,161,74)}`,
    psi(120, 161, 74),
    `<path d="M70 165 L95 178 L120 165 L145 178 L170 165" fill="none" stroke="${gold}" stroke-width="5"/>${psi(120, 145, 68)}`,
  ][i];
  return wrap(`${pattern}${extra}`, `Honeycomb ${i + 1}`);
}

function polyhedron(i) {
  const facets = [
    '120,38 172,74 120,112','120,38 68,74 120,112','68,74 54,137 120,112','172,74 186,137 120,112',
    '54,137 90,196 120,112','186,137 150,196 120,112','90,196 150,196 120,112',
  ].map((p,n) => `<polygon points="${p}" fill="${[gold,'#ead7ab','#f4edd9','#dfc27e'][(i + n) % 4]}" fill-opacity="${i === 2 ? '.55' : '.23'}" stroke="${n === 0 ? gold : deepGold}" stroke-width="${i === 1 ? 4 : 3}"/>`).join('');
  const extra = [
    psi(120,151,68),
    psi(120,151,68,deepGold),
    `<circle cx="120" cy="119" r="85" fill="none" stroke="${gold}" stroke-width="2" stroke-dasharray="5 7"/>${psi(120,151,68)}`,
    `<polygon points="120,72 142,112 120,152 98,112" fill="${cream}" stroke="${gold}" stroke-width="3"/>${psi(120,145,56)}`,
    `<path d="M120 38 L120 196 M54 137 L186 137 M68 74 L150 196 M172 74 L90 196" fill="none" stroke="${deepGold}" stroke-width="3"/>${psi(120,151,63)}`,
    `<path d="M59 137 C80 76 156 53 184 137" fill="none" stroke="${sage}" stroke-width="5"/>${psi(120,151,68)}`,
    `<rect x="56" y="48" width="128" height="144" rx="26" fill="none" stroke="${gold}" stroke-width="4"/>${psi(120,151,65)}`,
    `${dot(120,38,terra)}${dot(54,137,sage)}${dot(186,137,deepGold)}${psi(120,151,68)}`,
    `<polygon points="120,58 171,93 151,170 89,170 69,93" fill="none" stroke="${gold}" stroke-width="5"/>${psi(120,151,70)}`,
  ][i];
  return wrap(`${facets}${extra}`, `Polyhedron ${i + 1}`);
}

function orbit(i) {
  const rings = [
    `<circle cx="120" cy="120" r="77" fill="none" stroke="${gold}" stroke-width="4"/>`,
    `<path d="M57 167 A78 78 0 1 1 184 166" fill="none" stroke="${gold}" stroke-width="5"/>`,
    `<ellipse cx="120" cy="120" rx="84" ry="51" fill="none" stroke="${gold}" stroke-width="3"/><ellipse cx="120" cy="120" rx="51" ry="84" fill="none" stroke="${sage}" stroke-width="3"/>`,
    `<circle cx="120" cy="120" r="77" fill="none" stroke="${gold}" stroke-width="3" stroke-dasharray="1 10"/>`,
    `<path d="M43 120 C76 42 164 42 197 120 C164 198 76 198 43 120Z" fill="none" stroke="${gold}" stroke-width="3"/>`,
    `<circle cx="120" cy="120" r="77" fill="none" stroke="${deepGold}" stroke-width="3"/><circle cx="120" cy="120" r="57" fill="none" stroke="${gold}" stroke-width="3"/>`,
    `<ellipse cx="120" cy="120" rx="84" ry="41" fill="none" stroke="${gold}" stroke-width="3"/>`,
    `<path d="M55 160 C66 193 102 207 136 197" fill="none" stroke="${gold}" stroke-width="5"/>`,
    `<circle cx="120" cy="120" r="82" fill="rgba(195,154,82,.08)" stroke="${gold}" stroke-width="4"/>`,
  ][i];
  const nodes = [
    [[120,43,gold],[188,103,sage],[160,183,terra],[80,183,deepGold],[52,103,gold]],
    [[73,69,sage],[168,61,terra],[196,135,deepGold],[120,197,gold]],
    [[38,120,terra],[202,120,sage],[120,36,gold],[120,204,deepGold]],
    [[120,43,gold],[185,79,sage],[185,161,terra],[120,197,deepGold],[55,161,gold],[55,79,sage]],
    [[43,120,terra],[120,43,gold],[197,120,sage],[120,197,deepGold]],
    [[120,43,gold],[188,120,terra],[120,197,sage],[52,120,deepGold]],
    [[49,120,sage],[191,120,terra]],
    [[72,70,gold],[174,92,terra],[159,181,sage]],
    [[120,38,gold],[191,120,terra],[120,202,sage],[49,120,deepGold]],
  ][i].map(([x,y,c]) => dot(x,y,c, i === 3 ? 6 : 7)).join('');
  const center = i === 3 ? `<rect x="92" y="92" width="56" height="56" rx="14" fill="${cream}" stroke="${gold}" stroke-width="3"/>${psi(120,142,58)}` : psi(120,151,75, i === 7 ? deepGold : gold);
  return wrap(`${rings}${nodes}${center}`, `Orbit ${i + 1}`);
}

function tree(i) {
  const branches = [
    'M120 190 L120 126 M120 147 L75 108 M120 143 L164 99 M93 122 L69 75 M148 116 L174 66',
    'M120 191 L120 126 M120 148 L83 99 M120 144 L154 93 M94 117 L70 57 M146 112 L174 54',
    'M120 191 L120 128 M120 151 L78 119 M120 148 L163 114 M96 133 L78 76 M145 128 L161 68',
    'M120 191 L120 124 M120 154 L79 112 M120 148 L162 102 M95 127 L66 70 M147 122 L178 68',
    'M120 191 L120 126 M120 151 L85 108 M120 144 L154 101 M92 117 L61 77 M148 116 L180 77',
    'M120 191 L120 126 M120 148 L75 105 M120 148 L165 105 M82 112 L61 60 M158 112 L179 60',
    'M120 191 L120 130 M120 151 L83 114 M120 147 L158 107 M95 128 L79 73 M146 122 L164 71',
    'M120 191 L120 129 M120 151 L80 111 M120 149 L160 108 M95 126 L68 67 M146 124 L173 66',
    'M120 191 L120 136 M120 157 L87 121 M120 153 L153 116',
  ][i];
  const tips = [
    [[69,75,gold],[174,66,terra],[75,108,sage],[164,99,deepGold]],
    [[70,57,sage],[174,54,terra],[83,99,gold],[154,93,deepGold]],
    [[78,76,gold],[161,68,sage],[78,119,terra],[163,114,deepGold]],
    [[66,70,terra],[178,68,gold],[79,112,sage],[162,102,deepGold]],
    [[61,77,sage],[180,77,terra],[85,108,gold],[154,101,deepGold]],
    [[61,60,gold],[179,60,terra],[75,105,sage],[165,105,deepGold]],
    [[79,73,gold],[164,71,terra],[83,114,sage],[158,107,deepGold]],
    [[68,67,sage],[173,66,terra],[80,111,gold],[160,108,deepGold]],
    [[87,121,sage],[153,116,terra]],
  ][i].map(([x,y,c]) => dot(x,y,c, i === 8 ? 8 : 7)).join('');
  const base = [
    `<path d="M76 191 Q120 176 164 191" fill="none" stroke="${gold}" stroke-width="5"/>`,
    `<circle cx="120" cy="120" r="84" fill="none" stroke="${gold}" stroke-width="3"/>`,
    `<rect x="53" y="43" width="134" height="154" rx="28" fill="none" stroke="${gold}" stroke-width="4"/>`,
    `<path d="M73 193 Q120 182 167 193" fill="none" stroke="${deepGold}" stroke-width="4"/>`,
    `<path d="M120 191 C102 181 91 175 79 165 M120 191 C139 181 150 175 162 165" fill="none" stroke="${sage}" stroke-width="4"/>`,
    `<circle cx="120" cy="120" r="86" fill="rgba(195,154,82,.08)" stroke="${gold}" stroke-width="3"/>`,
    `<path d="M80 191 H160" fill="none" stroke="${gold}" stroke-width="5"/>`,
    `<path d="M67 184 C91 209 149 209 173 184" fill="none" stroke="${gold}" stroke-width="4"/>`,
    `<path d="M95 191 Q120 179 145 191" fill="none" stroke="${gold}" stroke-width="5"/>`,
  ][i];
  return wrap(`${base}<path d="${branches}" fill="none" stroke="${i === 4 ? sage : gold}" stroke-width="6"/>${tips}${psi(120,173,66, deepGold)}`, `Tree ${i + 1}`);
}

const generators = { honeycomb, polyhedron, orbit, tree };
await fs.mkdir(out, { recursive: true });
for (const [family, make] of Object.entries(generators)) {
  const folder = path.join(out, family);
  await fs.mkdir(folder, { recursive: true });
  const tiles = [];
  for (let i = 0; i < 9; i++) {
    const svg = make(i);
    const base = `${family}-${String(i + 1).padStart(2, '0')}`;
    await fs.writeFile(path.join(folder, `${base}.svg`), svg);
    await sharp(Buffer.from(svg)).png().resize(640, 640).toFile(path.join(folder, `${base}.png`));
    tiles.push({
      input: path.join(folder, `${base}.png`),
      left: (i % 3) * 480,
      top: Math.floor(i / 3) * 480,
    });
  }
  await sharp({ create: { width: 1440, height: 1440, channels: 4, background: cream } })
    .composite(tiles)
    .png()
    .toFile(path.join(out, `${family}-contact-sheet.png`));
}
console.log('Generated 36 SVG and PNG marks in public/brand/generated/round2');
