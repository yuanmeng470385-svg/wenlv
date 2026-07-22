/**
 * 图标组件 v3「细线白描」- 37 枚统一风格图标
 * 24 网格 / 1.5px 线宽 / 圆角收尾 / 无填充，SVG data-URI 实现
 * 旧图标名（camera/photo/kimono/shop...）自动映射到新图形，勿删
 */

function makeDataUri(body, opts) {
  opts = opts || {};
  var attrs;
  if (opts.fill) {
    attrs = 'fill="' + opts.fill + '" stroke="none"';
    body = body.replace(/currentColor/g, opts.fill);
  } else {
    var stroke = opts.stroke || '#29241D';
    attrs = 'fill="none" stroke="' + stroke + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
    body = body.replace(/currentColor/g, stroke);
  }
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ' + attrs + '>' + body + '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* ---- 图形库（body 片段） ---- */
var GLYPHS = {
  home: '<path d="M4.6 10.4 12 4.2l7.4 6.2"/><path d="M6.6 9v10a1 1 0 0 0 1 1h8.8a1 1 0 0 0 1-1V9"/><path d="M10 20v-5h4v5"/>',
  grid: '<rect x="5" y="5" width="6" height="6" rx="1.8"/><rect x="13" y="5" width="6" height="6" rx="1.8"/><rect x="5" y="13" width="6" height="6" rx="1.8"/><rect x="13" y="13" width="6" height="6" rx="3"/>',
  user: '<circle cx="12" cy="8.2" r="3.4"/><path d="M5.6 19.4c1.2-3.1 3.7-4.7 6.4-4.7s5.2 1.6 6.4 4.7"/>',
  camera: '<path d="M4 8.6A1.6 1.6 0 0 1 5.6 7h1.8L9 4.8h6L16.6 7h1.8A1.6 1.6 0 0 1 20 8.6v8.8a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.4z"/><circle cx="12" cy="12.6" r="3.2"/><circle cx="17.1" cy="10.2" r=".7" fill="currentColor" stroke="none"/>',
  lipstick: '<path d="M10 10V5.4c0-.7.6-1.1 1.2-.9l1.9.9c.3.1.4.4.4.7V10"/><rect x="8.6" y="10" width="6.8" height="3.6" rx="1"/><rect x="7.4" y="13.6" width="9.2" height="6.2" rx="1.4"/>',
  robe: '<path d="M9.6 4.4 6.1 6.4 4.3 13l2.6.8L8.3 10v9.6h7.4V10l1.4 3.8 2.6-.8-1.8-6.6-3.5-2"/><path d="M9.6 4.4c.9 1.7 3.9 1.7 4.8 0"/><path d="M9.9 4.8 13.2 9.4M14.1 4.8l-3.4 5"/>',
  pin: '<path d="M12 20.8s-6.4-5.2-6.4-10A6.4 6.4 0 0 1 12 4.4a6.4 6.4 0 0 1 6.4 6.4c0 4.8-6.4 10-6.4 10z"/><circle cx="12" cy="10.6" r="2.2"/>',
  compass: '<circle cx="12" cy="12" r="7.8"/><path d="m15.3 8.7-1.8 4.8-4.8 1.8 1.8-4.8z"/>',
  cal: '<rect x="4.5" y="5.8" width="15" height="14" rx="2"/><path d="M4.5 10.3h15M8.6 3.8v3.2M15.4 3.8v3.2"/><circle cx="9" cy="14.6" r=".9" fill="currentColor" stroke="none"/><circle cx="14.8" cy="14.6" r=".9" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="12" cy="12" r="7.8"/><path d="M12 7.6V12l3 1.8"/>',
  star: '<path d="m12 4.7 2.2 4.4 4.9.7-3.5 3.4.8 4.8-4.4-2.3-4.4 2.3.8-4.8-3.5-3.4 4.9-.7z"/>',
  heart: '<path d="M12 19.8S4.7 15.3 4.7 10.3A4.2 4.2 0 0 1 12 7.1a4.2 4.2 0 0 1 7.3 3.2c0 5-7.3 9.5-7.3 9.5z"/>',
  bmk: '<path d="M7 4.6h10a1 1 0 0 1 1 1v14l-6-3.8-6 3.8v-14a1 1 0 0 1 1-1z"/>',
  phone: '<path d="M7.2 4.6h2.8l1.5 3.9-1.9 1.5a12.5 12.5 0 0 0 4.4 4.4l1.5-1.9 3.9 1.5v2.8a1.9 1.9 0 0 1-2.1 1.9A16.3 16.3 0 0 1 5.3 6.7a1.9 1.9 0 0 1 1.9-2.1z"/>',
  search: '<circle cx="11" cy="11" r="5.8"/><path d="m15.7 15.7 4 4"/>',
  filter: '<path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15"/><circle cx="9.5" cy="7.5" r="1.7" fill="currentColor" stroke="none"/><circle cx="14.8" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="7.5" cy="16.5" r="1.7" fill="currentColor" stroke="none"/>',
  chevr: '<path d="m9.5 6 6 6-6 6"/>',
  chevd: '<path d="m6 9.5 6 6 6-6"/>',
  back: '<path d="M14.5 6l-6 6 6 6"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  pen: '<path d="m14.3 5.6 4.1 4.1L8 20.1l-4.6.9.9-4.6z"/><path d="m12.9 7 4.1 4.1"/>',
  trash: '<path d="M5 7h14M9.6 7V5h4.8v2M7.1 7l.7 12.1a1 1 0 0 0 1 .9h6.4a1 1 0 0 0 1-.9L16.9 7"/><path d="M10.2 10.4v5.8M13.8 10.4v5.8"/>',
  img: '<rect x="4.5" y="5.5" width="15" height="13" rx="2"/><circle cx="9.2" cy="10" r="1.3"/><path d="m5.5 16.3 4-4 3 3 3.4-3.4 3.6 3.6"/>',
  check: '<path d="m5 12.6 4.5 4.5L19 7.4"/>',
  x: '<path d="M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4"/>',
  bell: '<path d="M12 4.6a5.4 5.4 0 0 1 5.4 5.4c0 3.8 1.4 5.3 1.4 5.3H5.2s1.4-1.5 1.4-5.3A5.4 5.4 0 0 1 12 4.6z"/><path d="M10.1 18.3a1.9 1.9 0 0 0 3.8 0"/>',
  order: '<path d="M7 4.6h10a1 1 0 0 1 1 1v14l-2.4-1.6-2.4 1.6-1.2-.8-1.2.8-2.4-1.6L6 19.6v-14a1 1 0 0 1 1-1z"/><path d="M9.2 9.4h5.6M9.2 13h5.6"/>',
  coin: '<circle cx="12" cy="12" r="7.8"/><path d="m8.9 8 3.1 3.9L15.1 8M12 11.9v4.4M9.4 13.7h5.2"/>',
  chart: '<path d="M3.8 19.8h16.4"/><path d="M6.5 19.5v-5.5M11 19.5V9.5M15.5 19.5v-7.5M20 19.5V6"/>',
  gear: '<circle cx="12" cy="12" r="2.5"/><path d="M12 4.6v2M12 17.4v2M4.6 12h2M17.4 12h2M6.8 6.8l1.4 1.4M15.8 15.8l1.4 1.4M17.2 6.8l-1.4 1.4M8.2 15.8l-1.4 1.4"/>',
  out: '<path d="M13.5 4.6H7.2A1.6 1.6 0 0 0 5.6 6.2v11.6a1.6 1.6 0 0 0 1.6 1.6h6.3"/><path d="m16 8.4 3.6 3.6-3.6 3.6M9.8 12h9.6"/>',
  shield: '<path d="m12 3.9-6.4 2.3v5.2c0 4.1 2.7 7.1 6.4 8.6 3.7-1.5 6.4-4.5 6.4-8.6V6.2z"/><path d="m9.1 11.7 2.1 2.1 3.7-3.9"/>',
  store: '<path d="M5 9.4 6.6 5h10.8L19 9.4"/><path d="M5 9.4a2.3 2.3 0 0 0 4.6 0 2.35 2.35 0 0 0 4.7 0 2.3 2.3 0 0 0 4.7 0"/><path d="M6.3 12.4v6.4a1 1 0 0 0 1 1h9.4a1 1 0 0 0 1-1v-6.4"/><path d="M10.2 19.8v-4.6h3.6v4.6"/>',
  upload: '<path d="M12 15.4V5.6M7.6 9.6 12 5.2l4.4 4.4"/><path d="M5 15.4v2.8a1.6 1.6 0 0 0 1.6 1.6h10.8a1.6 1.6 0 0 0 1.6-1.6v-2.8"/>',
  users: '<circle cx="9.2" cy="8.4" r="3"/><path d="M3.9 18.9c.9-2.7 2.9-4.1 5.3-4.1s4.4 1.4 5.3 4.1"/><path d="M15.4 5.6a3 3 0 0 1 0 5.6M17.6 14.8c1.5.7 2.5 2 3 4.1"/>',
  swap: '<path d="M7 8.6h10.2l-3-3M17 15.4H6.8l3 3"/>',
  more: '<circle cx="6" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  msg: '<path d="M5 6.4a1.6 1.6 0 0 1 1.6-1.6h10.8A1.6 1.6 0 0 1 19 6.4v8.4a1.6 1.6 0 0 1-1.6 1.6H9.5L5.4 19.6a.4.4 0 0 1-.4-.4z"/><path d="M8.6 9.4h6.8M8.6 12.6h4.2"/>',
  warning: '<path d="M10.3 4.1 2.6 17.6a1.8 1.8 0 0 0 1.6 2.7h15.6a1.8 1.8 0 0 0 1.6-2.7L13.7 4.1a1.9 1.9 0 0 0-3.4 0z"/><path d="M12 9.4v3.8"/><circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none"/>'
};

/* ---- 旧名 → 新图形 映射（filled 标记实心填充） ---- */
var ALIAS = {
  'photo': 'img', 'calendar': 'cal', 'location': 'pin', 'shop': 'store',
  'package': 'order', 'edit': 'pen', 'lock': 'shield', 'logout': 'out',
  'wrench': 'gear', 'money': 'coin', 'refresh': 'swap', 'kimono': 'robe',
  'close': 'x', 'chevron-right': 'chevr', 'chevron-down': 'chevd',
  'star-filled': 'star', 'heart-filled': 'heart'
};
var FILLED = { 'star-filled': true, 'heart-filled': true };

var cache = {};

function resolve(name, color) {
  var key = name + '|' + color;
  if (cache[key]) return cache[key];
  var glyph = ALIAS[name] || name;
  var body = GLYPHS[glyph];
  if (!body) return '';
  var uri = FILLED[name]
    ? makeDataUri(body, { fill: color })
    : makeDataUri(body, { stroke: color });
  cache[key] = uri;
  return uri;
}

Component({
  properties: {
    name: { type: String, value: '' },
    size: { type: String, value: '44rpx' },
    color: { type: String, value: '#29241D' }
  },

  data: { iconSrc: '' },

  observers: {
    'name, color': function (name, color) {
      this.setData({ iconSrc: resolve(name, color || '#29241D') });
    }
  },

  lifetimes: {
    attached: function () {
      this.setData({ iconSrc: resolve(this.properties.name, this.properties.color || '#29241D') });
    }
  }
});
