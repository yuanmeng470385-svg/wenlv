const fs = require('fs');
const path = require('path');
const CF = path.join(__dirname, '..', 'cloudfunctions');
const read = (fn) => fs.readFileSync(path.join(CF, fn, 'index.js'), 'utf8');

const ADMIN = ['approveProvider','approveRefund','reviewPortfolio','reviewServiceItem','updateProviderLevel','getAdminDashboard','getPendingProviders','getPendingPortfolios','getPendingRefunds','getPendingServiceItems','initTestData'];
const LOGIN = ['createOrder','createReview','cancelOrder','toggleLike','toggleFavorite','updateUserInfo','applyProvider','switchRole','getOrderList','getFavorites','login','providerHandleOrder','saveServiceItem','uploadPortfolio','getMyProvider','getMyPortfolios','getMyServiceItems','getMyTimeSlots','getProviderDashboard','getProviderOrders','updateSchedule','updateServiceItem','toggleTimeSlot'];
const ORDER_DETAIL = 'getOrderDetail';
const UNTOUCHED = ['payOrder','mockPay','mockCompleteOrder','payCallback','getCategoryList','getProviderList','getProviderDetail','getPortfolioDetail','getReviews'];

let fail = 0;
const check = (name, cond, msg) => {
  if (cond) { console.log(`ok   ${name}`); }
  else { console.log(`FAIL ${name}: ${msg}`); fail++; }
};

for (const fn of ADMIN) check(fn, read(fn).includes('无管理员权限'), '缺少 admin 守卫');
for (const fn of LOGIN) check(fn, read(fn).includes('未登录'), '缺少登录守卫');
check(ORDER_DETAIL, read(ORDER_DETAIL).includes('未登录') && read(ORDER_DETAIL).includes('无权查看此订单'), '缺少登录/越权守卫');
for (const fn of UNTOUCHED) {
  const s = read(fn);
  check(`${fn}(untouched)`, !s.includes('无管理员权限') && !s.includes('无权查看此订单') && !s.includes('未登录'), '不应被改动');
}

console.log(fail === 0 ? '\n全部通过 ✅' : `\n${fail} 项未通过 ❌`);
process.exit(fail === 0 ? 0 : 1);
