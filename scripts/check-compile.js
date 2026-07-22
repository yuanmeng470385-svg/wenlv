/**
 * 编译诊断：连接 DevTools 自动化端口，收集控制台错误与页面加载错误
 * 前置：cli.bat auto --project <proj> --auto-port 9420 已在运行
 * 用法：node check-compile.js
 */
const automator = require('miniprogram-automator');

(async () => {
  let mini;
  try {
    mini = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
  } catch (e) {
    console.error('CONNECT FAIL:', e.message);
    process.exit(1);
  }
  console.log('connected');

  const logs = [];
  mini.on('console', (msg) => {
    if (msg.type === 'error' || msg.type === 'warning') {
      logs.push(`[${msg.type}] ${msg.text || (msg.args || []).map(a => a.preview || a.value).join(' ')}`);
    }
  });

  // 等首页加载
  await new Promise(r => setTimeout(r, 6000));

  // 依次打开关键页面，收集错误
  const pages = [
    'pages/index/index',
    'pages/orderList/index',
    'pages/profile/index',
    'pages/serviceList/index?type=photographer',
    'pages/serviceDetail/index?id=test',
    'pages/provider/myWorks',
    'pages/provider/serviceItems',
    'pages/provider/schedule',
    'pages/admin/dashboard',
    'pages/admin/providers',
  ];
  for (const p of pages) {
    try {
      await mini.reLaunch('/' + p);
      await new Promise(r => setTimeout(r, 1500));
      const page = await mini.currentPage();
      console.log('OPEN OK:', p, '->', page.path);
    } catch (e) {
      console.log('OPEN FAIL:', p, '->', e.message);
    }
  }

  console.log('--- console errors/warnings ---');
  logs.forEach(l => console.log(l));
  console.log(`--- total ${logs.length} ---`);

  await mini.disconnect();
  process.exit(0);
})();
