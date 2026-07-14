# 后端统一身份校验 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 35 个云函数补内联身份校验，消除"任何人可调用管理接口 / 越权读订单 / 裸调 initTestData"的资损与篡改风险。

**Architecture:** 纯内联守卫（微信云开发跨目录 require 会失效，不能用共享 helper）。管理端加 admin 校验、写函数加 OPENID 硬校验、getOrderDetail 加访问控制。不改函数签名、不改返回格式、不改前端。用一个 node 脚本 `scripts/verify-auth.js` 静态核验每个函数是否含对应守卫标记串，作为可运行的测试闭环；真机行为再靠 DevTools 手动冒烟。

**Tech Stack:** 微信云开发（wx-server-sdk）、Node.js、Git Bash。

## Global Constraints

- 错误码统一 `1002`（对齐现有"1002 权限不足"），未登录与无权限均用 1002；前端不改。
- admin 判定：`users` 集合按 `_openid` 查到的文档，其 `roles` 数组含 `'admin'`。不新建集合。
- `_openid` 查询写法固定为 `db.collection('users').where({ _openid: openid }).get()`。
- 不改动的函数：支付 4 个（payOrder、mockPay、mockCompleteOrder、payCallback）、公共读 5 个（getCategoryList、getProviderList、getProviderDetail、getPortfolioDetail、getReviews）。
- 每个云函数模块顶部已有 `const cloud = require('wx-server-sdk')` 与 `const db = cloud.database()`，守卫代码可直接用 `cloud` / `db`。
- 提交粒度：每档一次提交。

---

### Task 1: 验证脚本（测试闭环）

**Files:**
- Create: `scripts/verify-auth.js`

**Interfaces:**
- Produces: 命令 `node scripts/verify-auth.js`，退出码 0 = 全部通过，非 0 = 有未通过项。后续每个任务都用它验证。

- [ ] **Step 1: 写验证脚本**

创建 `scripts/verify-auth.js`：

```js
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
```

- [ ] **Step 2: 运行，确认基线失败**

Run: `node scripts/verify-auth.js`
Expected: 输出多条 `FAIL ...: 缺少 ... 守卫`，结尾 `35 项未通过 ❌`，退出码非 0（ADMIN 11 + LOGIN 23 + getOrderDetail 1 = 35 项 FAIL；UNTOUCHED 9 项 ok）。

- [ ] **Step 3: 提交脚本**

```bash
git add scripts/verify-auth.js
git commit -m "test: 新增后端鉴权静态验证脚本"
```

---

### Task 2: A 档 · 管理端 admin 守卫（11 个函数）

**Files（均 Modify `cloudfunctions/<fn>/index.js`）:** approveProvider、approveRefund、reviewPortfolio、reviewServiceItem、updateProviderLevel、getAdminDashboard、getPendingProviders、getPendingPortfolios、getPendingRefunds、getPendingServiceItems、initTestData

**Interfaces:**
- Consumes: `node scripts/verify-auth.js`（Task 1）
- Produces: 11 个函数在业务逻辑前拒绝非 admin，返回 `{ code: 1002, message: '无管理员权限' }`

- [ ] **Step 1: 逐个插入 admin 守卫**

对上述 11 个函数，在 `exports.main = async (event, context) => {` 内的 **`try {` 之后紧接**插入以下代码块（这 11 个函数当前都不取 openid，全块插入；守卫在 try 内，DB 异常会被既有 catch 兜住）：

```js
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }
```

插入位置示例（approveProvider）——原代码：

```js
exports.main = async (event, context) => {
  const { providerId, action, level = 1, reason } = event;
  try {
    if (!providerId) return { code: 1001, message: '请提供 providerId' };
```

改为：

```js
exports.main = async (event, context) => {
  const { providerId, action, level = 1, reason } = event;
  try {
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }
    if (!providerId) return { code: 1001, message: '请提供 providerId' };
```

其余 10 个函数同理：找到该函数 `exports.main` 里的第一个 `try {`，在其后作为首条语句插入同一块。

- [ ] **Step 2: 运行验证脚本**

Run: `node scripts/verify-auth.js`
Expected: 11 个 ADMIN 函数从 FAIL 变 ok；LOGIN 23 + getOrderDetail 仍 FAIL；UNTOUCHED 9 仍 ok；结尾 `24 项未通过 ❌`。

- [ ] **Step 3: 提交**

```bash
git add cloudfunctions/approveProvider cloudfunctions/approveRefund cloudfunctions/reviewPortfolio cloudfunctions/reviewServiceItem cloudfunctions/updateProviderLevel cloudfunctions/getAdminDashboard cloudfunctions/getPendingProviders cloudfunctions/getPendingPortfolios cloudfunctions/getPendingRefunds cloudfunctions/getPendingServiceItems cloudfunctions/initTestData
git commit -m "feat: A档11个管理云函数补 admin 鉴权"
```

---

### Task 3: B 档 · 用户写操作登录守卫（11 个函数）

**Files（均 Modify `cloudfunctions/<fn>/index.js`）:** createOrder、createReview、cancelOrder、toggleLike、toggleFavorite、updateUserInfo、applyProvider、switchRole、getOrderList、getFavorites、login

**Interfaces:**
- Consumes: `node scripts/verify-auth.js`
- Produces: 11 个函数空 openid 时立即返回 `{ code: 1002, message: '未登录' }`

- [ ] **Step 1: 逐个插入登录守卫**

这 11 个函数当前都有这一行：

```js
  const openid = wxContext.OPENID;
```

在该行**之后**插入：

```js
  if (!openid) return { code: 1002, message: '未登录' };
```

示例（createOrder）——原代码：

```js
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { items, contactName, contactPhone, remark } = event;
```

改为：

```js
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { items, contactName, contactPhone, remark } = event;
```

- [ ] **Step 2: 运行验证脚本**

Run: `node scripts/verify-auth.js`
Expected: 这 11 个 LOGIN 函数变 ok；剩 C 档 12 + getOrderDetail 仍 FAIL；结尾 `13 项未通过 ❌`。

- [ ] **Step 3: 提交**

```bash
git add cloudfunctions/createOrder cloudfunctions/createReview cloudfunctions/cancelOrder cloudfunctions/toggleLike cloudfunctions/toggleFavorite cloudfunctions/updateUserInfo cloudfunctions/applyProvider cloudfunctions/switchRole cloudfunctions/getOrderList cloudfunctions/getFavorites cloudfunctions/login
git commit -m "feat: B档11个用户写函数补 OPENID 登录守卫"
```

---

### Task 4: C 档 · 商家端登录守卫（12 个函数）

**Files（均 Modify `cloudfunctions/<fn>/index.js`）:** providerHandleOrder、saveServiceItem、uploadPortfolio、getMyProvider、getMyPortfolios、getMyServiceItems、getMyTimeSlots、getProviderDashboard、getProviderOrders、updateSchedule、updateServiceItem、toggleTimeSlot

**Interfaces:**
- Consumes: `node scripts/verify-auth.js`
- Produces: 12 个函数空 openid 时立即返回 `{ code: 1002, message: '未登录' }`（原有 `providers.where({ userId: openid, status: 'active' })` 身份校验保留不动）

- [ ] **Step 1: 逐个插入登录守卫**

同 Task 3：这 12 个函数都有 `const openid = wxContext.OPENID;`，在其后插入：

```js
  if (!openid) return { code: 1002, message: '未登录' };
```

示例（providerHandleOrder）——原代码：

```js
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { orderId, action, reason } = event;
```

改为：

```js
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { orderId, action, reason } = event;
```

- [ ] **Step 2: 运行验证脚本**

Run: `node scripts/verify-auth.js`
Expected: 这 12 个 LOGIN 函数变 ok；仅 getOrderDetail 仍 FAIL；结尾 `1 项未通过 ❌`。

- [ ] **Step 3: 提交**

```bash
git add cloudfunctions/providerHandleOrder cloudfunctions/saveServiceItem cloudfunctions/uploadPortfolio cloudfunctions/getMyProvider cloudfunctions/getMyPortfolios cloudfunctions/getMyServiceItems cloudfunctions/getMyTimeSlots cloudfunctions/getProviderDashboard cloudfunctions/getProviderOrders cloudfunctions/updateSchedule cloudfunctions/updateServiceItem cloudfunctions/toggleTimeSlot
git commit -m "feat: C档12个商家云函数补 OPENID 登录守卫"
```

---

### Task 5: getOrderDetail 访问控制

**Files:**
- Modify: `cloudfunctions/getOrderDetail/index.js`

**Interfaces:**
- Consumes: `node scripts/verify-auth.js`
- Produces: getOrderDetail 仅"下单用户 / 订单内商家 / admin"三者之一可读，否则返回 `{ code: 1002, message: '无权查看此订单' }`

- [ ] **Step 1: 加登录守卫 + 访问控制**

原代码：

```js
exports.main = async (event, context) => {
  const { orderId } = event;
  try {
    const orderRes = await db.collection('orders').doc(orderId).get();
    if (!orderRes.data) return { code: 1003, message: '订单不存在' };
    const order = orderRes.data;
    const providerIds = [...new Set(order.items.map(i => i.providerId))];
```

改为：

```js
exports.main = async (event, context) => {
  const { orderId } = event;
  try {
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const orderRes = await db.collection('orders').doc(orderId).get();
    if (!orderRes.data) return { code: 1003, message: '订单不存在' };
    const order = orderRes.data;
    let allowed = order.userId === openid;
    if (!allowed) {
      const me = (await db.collection('users').where({ _openid: openid }).get()).data[0];
      if (me && (me.roles || []).includes('admin')) allowed = true;
    }
    if (!allowed) {
      const mine = (await db.collection('providers').where({ userId: openid }).get()).data.map(p => p._id);
      if (order.items.some(i => mine.includes(i.providerId))) allowed = true;
    }
    if (!allowed) return { code: 1002, message: '无权查看此订单' };
    const providerIds = [...new Set(order.items.map(i => i.providerId))];
```

- [ ] **Step 2: 运行验证脚本**

Run: `node scripts/verify-auth.js`
Expected: 全部 ok，结尾 `全部通过 ✅`，退出码 0。

- [ ] **Step 3: 提交**

```bash
git add cloudfunctions/getOrderDetail
git commit -m "feat: getOrderDetail 加访问控制（防越权读订单）"
```

---

### Task 6: 全量核验 + 手动冒烟 + 部署

**Files:** 无（验证与部署）

- [ ] **Step 1: 全量静态核验**

Run: `node scripts/verify-auth.js`
Expected: `全部通过 ✅`，退出码 0（35 项守卫 ok + 9 项 untouched ok）。

- [ ] **Step 2: 复核未改动文件**

Run: `git log --oneline -5 && git diff --stat HEAD~4 -- cloudfunctions/payOrder cloudfunctions/mockPay cloudfunctions/mockCompleteOrder cloudfunctions/payCallback cloudfunctions/getCategoryList cloudfunctions/getProviderList cloudfunctions/getProviderDetail cloudfunctions/getPortfolioDetail cloudfunctions/getReviews`
Expected: 后 9 个文件 diff 为空（一处未动）。

- [ ] **Step 3: 部署到云端**

在微信开发者工具中，对本次改动的 35 个云函数逐个右键 →「创建并部署：云端安装依赖（不上传 node_modules）」。（无法用命令行完成，需在 DevTools 操作。）

- [ ] **Step 4: 手动冒烟（DevTools 云函数本地调试 / 云端测试）**

1. 用**非 admin** 账号调 `getAdminDashboard` → 期望 `{ code: 1002, message: '无管理员权限' }`。
2. 给某 users 文档 `roles` 加 `'admin'`，用该账号再调 `getAdminDashboard` → 期望 `code: 0` 正常返回。
3. 用户 A 下单得到 orderId，用**用户 B** 账号调 `getOrderDetail({ orderId })` → 期望 `{ code: 1002, message: '无权查看此订单' }`；用户 A 自己调 → 期望 `code: 0`。
4. 用非 admin 账号调 `initTestData` → 期望 `{ code: 1002, message: '无管理员权限' }`。

- [ ] **Step 5: 推送**

```bash
git push
```
