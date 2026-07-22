/**
 * tabBar 图标生成器：把「细线白描」SVG 渲染成 81x81 PNG
 * 用法：cd scripts && npm install && node gen-tabbar-icons.js
 * 产物覆盖 miniprogram/images/tab-{home,order,mine}[-active].png
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const GLYPHS = {
  home: '<path d="M4.6 10.4 12 4.2l7.4 6.2"/><path d="M6.6 9v10a1 1 0 0 0 1 1h8.8a1 1 0 0 0 1-1V9"/><path d="M10 20v-5h4v5"/>',
  order: '<rect x="5" y="5" width="6" height="6" rx="1.8"/><rect x="13" y="5" width="6" height="6" rx="1.8"/><rect x="5" y="13" width="6" height="6" rx="1.8"/><rect x="13" y="13" width="6" height="6" rx="3"/>',
  mine: '<circle cx="12" cy="8.2" r="3.4"/><path d="M5.6 19.4c1.2-3.1 3.7-4.7 6.4-4.7s5.2 1.6 6.4 4.7"/>'
};

const INACTIVE = '#A79E8F'; // 灰墨
const ACTIVE = '#29241D';   // 墨
const DOT = '#BE3F2C';      // 朱砂指示点（仅 active）

function buildSvg(glyph, stroke, active) {
  const dot = active ? `<circle cx="40.5" cy="70" r="4.6" fill="${DOT}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="81" height="81" viewBox="0 0 81 81">
  <g transform="translate(16.5 13.5) scale(2)" fill="none" stroke="${stroke}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${glyph.replace(/currentColor/g, stroke)}</g>${dot}
</svg>`;
}

const outDir = path.join(__dirname, '..', 'miniprogram', 'images');

for (const [name, glyph] of Object.entries(GLYPHS)) {
  for (const active of [false, true]) {
    const svg = buildSvg(glyph, active ? ACTIVE : INACTIVE, active);
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 81 } });
    const png = resvg.render().asPng();
    const file = path.join(outDir, `tab-${name}${active ? '-active' : ''}.png`);
    fs.writeFileSync(file, png);
    console.log('written', file);
  }
}
console.log('done: 6 tabbar icons generated');
