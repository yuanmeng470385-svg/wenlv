/**
 * 构建 SVG Data URI
 * @param {string} body   - SVG 内部元素（path/circle/rect 等）
 * @param {object} opts   - { stroke, fill }
 */
function makeDataUri(body, opts) {
  opts = opts || {};
  var attrs;
  if (opts.fill) {
    attrs = 'fill="' + opts.fill + '" stroke="none"';
  } else {
    var stroke = opts.stroke || '#666666';
    attrs = 'fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  }
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ' + attrs + '>' + body + '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

var ICONS = {
  // 1. 相机
  'camera': makeDataUri(
    '<rect x="2" y="5" width="20" height="14" rx="2"/>' +
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M8 5V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1"/>'
  ),

  // 2. 图片/风景框
  'photo': makeDataUri(
    '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
    '<circle cx="8.5" cy="8.5" r="1.5"/>' +
    '<path d="M21 15l-5-5L5 21"/>'
  ),

  // 3. 空心星
  'star': makeDataUri(
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'
  ),

  // 4. 实心星
  'star-filled': makeDataUri(
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    { fill: '#666666' }
  ),

  // 5. 空心心
  'heart': makeDataUri(
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'
  ),

  // 6. 实心心（红色）
  'heart-filled': makeDataUri(
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    { fill: '#E8563A' }
  ),

  // 7. 电话
  'phone': makeDataUri(
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/>'
  ),

  // 8. 日历
  'calendar': makeDataUri(
    '<rect x="3" y="4" width="18" height="18" rx="2"/>' +
    '<path d="M16 2v4"/>' +
    '<path d="M8 2v4"/>' +
    '<path d="M3 10h18"/>'
  ),

  // 9. 时钟
  'clock': makeDataUri(
    '<circle cx="12" cy="12" r="10"/>' +
    '<path d="M12 6v6l4 2"/>'
  ),

  // 10. 定位图钉
  'location': makeDataUri(
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>' +
    '<circle cx="12" cy="10" r="3"/>'
  ),

  // 11. 用户
  'user': makeDataUri(
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>' +
    '<circle cx="12" cy="7" r="4"/>'
  ),

  // 12. 店铺
  'shop': makeDataUri(
    '<path d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>' +
    '<path d="M7 9V7a5 5 0 0 1 10 0v2"/>'
  ),

  // 13. 包裹
  'package': makeDataUri(
    '<path d="M16.5 9.4 7.55 4.24"/>' +
    '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>' +
    '<path d="M3.29 7 12 12l8.71-5"/>' +
    '<path d="M12 22V12"/>'
  ),

  // 14. 上传
  'upload': makeDataUri(
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
    '<path d="M17 8l-5-5-5 5"/>' +
    '<path d="M12 3v12"/>'
  ),

  // 15. 编辑/铅笔
  'edit': makeDataUri(
    '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>' +
    '<path d="M15 5l4 4"/>'
  ),

  // 16. 通知铃铛
  'bell': makeDataUri(
    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>' +
    '<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'
  ),

  // 17. 锁
  'lock': makeDataUri(
    '<rect x="3" y="11" width="18" height="11" rx="2"/>' +
    '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  ),

  // 18. 退出
  'logout': makeDataUri(
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>' +
    '<path d="M16 17l5-5-5-5"/>' +
    '<path d="M21 12H9"/>'
  ),

  // 19. 警告三角
  'warning': makeDataUri(
    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>' +
    '<line x1="12" y1="9" x2="12" y2="13"/>' +
    '<line x1="12" y1="17" x2="12.01" y2="17"/>'
  ),

  // 20. 扳手/工具
  'wrench': makeDataUri(
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>'
  ),

  // 21. 金钱
  'money': makeDataUri(
    '<circle cx="12" cy="12" r="10"/>' +
    '<path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>' +
    '<path d="M12 18v2"/>' +
    '<path d="M12 4v2"/>'
  ),

  // 22. 刷新
  'refresh': makeDataUri(
    '<path d="M21 2v6h-6"/>' +
    '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>' +
    '<path d="M3 22v-6h6"/>' +
    '<path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>'
  ),

  // 23. 主页
  'home': makeDataUri(
    '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>' +
    '<path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'
  ),

  // 24. 和服/衣物
  'kimono': makeDataUri(
    '<path d="M12 2h0a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/>' +
    '<path d="M8 4 3 8"/>' +
    '<path d="M16 4l5 4"/>' +
    '<path d="M12 10v12"/>' +
    '<path d="M6 22h12"/>' +
    '<path d="M6 14h12"/>'
  ),

  // 25. 搜索
  'search': makeDataUri(
    '<circle cx="11" cy="11" r="8"/>' +
    '<path d="M21 21l-4.3-4.3"/>'
  ),

  // 26. 关闭
  'close': makeDataUri(
    '<path d="M18 6 6 18"/>' +
    '<path d="M6 6l12 12"/>'
  ),

  // 27. 向下箭头
  'chevron-down': makeDataUri(
    '<path d="M6 9l6 6 6-6"/>'
  ),

  // 28. 向右箭头
  'chevron-right': makeDataUri(
    '<path d="M9 18l6-6-6-6"/>'
  )
};

Component({
  properties: {
    name: {
      type: String,
      value: ''
    },
    size: {
      type: String,
      value: '44rpx'
    },
    color: {
      type: String,
      value: ''
    }
  },

  data: {
    iconSrc: ''
  },

  observers: {
    'name': function (name) {
      this.setData({
        iconSrc: ICONS[name] || ''
      });
    }
  },

  lifetimes: {
    attached: function () {
      this.setData({
        iconSrc: ICONS[this.properties.name] || ''
      });
    }
  }
});
