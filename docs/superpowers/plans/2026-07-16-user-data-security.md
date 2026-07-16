# 用户数据安全加固 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 5 个公共读云函数加调用者日志、6 个云函数加手机号脱敏、新增 getContactPhone 云函数 + 前端双向一键拨号。

**Architecture:** 纯内联改动（微信云开发跨目录 require 失效约束）。后端最小侵入：每个函数加 2-10 行，不改签名/返回格式/前端协议。前端加拨号按钮，先调 getContactPhone 解号码再 wx.makePhoneCall。每个 Task 一次提交。

**Tech Stack:** 微信云开发（wx-server-sdk）、微信小程序原生框架。

## Global Constraints

- 所有云函数统一返回 `{ code: 0, data, message }`，不改签名、不改返回格式
- 共享代码必须内联（跨目录 require 云端失效）
- 错误码沿用现有体系：`1002` 权限不足/未登录，`1001` 参数错误
- 手机号存储不脱敏，仅返回时脱敏
- 数据库不做任何改动
- `_openid` 查询写法固定为 `db.collection('users').where({ _openid: openid }).get()`

---

### Task 1: 公开读接口加调用者日志（5 个函数）

**Files（均 Modify `cloudfunctions/<fn>/index.js`）:**
- getCategoryList
- getProviderList
- getProviderDetail
- getPortfolioDetail
- getReviews

**Interfaces:**
- Consumes: 无
- Produces: 每个函数在 try 块首行取 OPENID 并 console.log，不影响返回值

- [ ] **Step 1: 修改 getCategoryList**

`cloudfunctions/getCategoryList/index.js` — 在 `try {` 下一行插入 2 行：

```js
exports.main = async (event, context) => {
  try {
    const openid = cloud.getWXContext().OPENID;
    console.log(`[getCategoryList] caller=${openid || 'anonymous'}`, JSON.stringify(event));
    const res = await db.collection('categories')...
```

- [ ] **Step 2: 修改 getProviderList**

`cloudfunctions/getProviderList/index.js` — 在 `try {` 下一行插入 2 行：

```js
  try {
    const openid = cloud.getWXContext().OPENID;
    console.log(`[getProviderList] caller=${openid || 'anonymous'}`, JSON.stringify(event));
    const where = { status: 'active' };
```

- [ ] **Step 3: 修改 getProviderDetail**

`cloudfunctions/getProviderDetail/index.js` — 在 `try {` 下一行插入 2 行：

```js
  try {
    const openid = cloud.getWXContext().OPENID;
    console.log(`[getProviderDetail] caller=${openid || 'anonymous'}`, JSON.stringify(event));
    // 参数校验
```

- [ ] **Step 4: 修改 getPortfolioDetail**

`cloudfunctions/getPortfolioDetail/index.js` — 在 `try {` 下一行插入 2 行：

```js
  try {
    const openid = cloud.getWXContext().OPENID;
    console.log(`[getPortfolioDetail] caller=${openid || 'anonymous'}`, JSON.stringify(event));
    const res = await db.collection('portfolios').doc(portfolioId).get();
```

- [ ] **Step 5: 修改 getReviews**

`cloudfunctions/getReviews/index.js` — 在 `try {` 下一行插入 2 行：

```js
  try {
    const openid = cloud.getWXContext().OPENID;
    console.log(`[getReviews] caller=${openid || 'anonymous'}`, JSON.stringify(event));
    const where = {};
```

- [ ] **Step 6: 提交**

```bash
git add cloudfunctions/getCategoryList cloudfunctions/getProviderList cloudfunctions/getProviderDetail cloudfunctions/getPortfolioDetail cloudfunctions/getReviews
git commit -m "feat: 5个公共读云函数加调用者OPENID日志"
```

---

### Task 2: 手机号脱敏（6 个函数）

**Files（均 Modify `cloudfunctions/<fn>/index.js`）:**
- login
- getOrderDetail
- getOrderList
- getProviderOrders
- getProviderDetail
- getProviderList

**Interfaces:**
- Consumes: 无
- Produces: 返回数据中的 phone/contactPhone 字段统一变成 `138****5678`

- [ ] **Step 1: login — 脱敏 userInfo.phone**

`cloudfunctions/login/index.js`：在 `cloud.init` 之后、`exports.main` 之前加 maskPhone；在 return 前脱敏。

```js
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

exports.main = async (event, context) => {
```

return 前脱敏：
```js
    const user = await db.collection('users').where({ _openid: openid }).get();
    const userInfo = user.data[0];
    if (userInfo && userInfo.phone) {
      userInfo.phone = maskPhone(userInfo.phone);
    }
    return {
      code: 0,
      data: { userInfo },
      message: 'success',
    };
```

- [ ] **Step 2: getOrderDetail — 脱敏 order.contactPhone**

`cloudfunctions/getOrderDetail/index.js`：加 maskPhone + return 前脱敏。

```js
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
```

return 前（第 35 行附近）：
```js
    if (order.contactPhone) {
      order.contactPhone = maskPhone(order.contactPhone);
    }

    return {
      code: 0,
      data: { order, providers },
      message: 'success',
    };
```

- [ ] **Step 3: getOrderList — 脱敏列表中每条 contactPhone**

`cloudfunctions/getOrderList/index.js`：加 maskPhone + return 前脱敏。

```js
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
```

return 前（第 44 行附近）：
```js
    const maskedList = list.data.map(order => ({
      ...order,
      contactPhone: order.contactPhone ? maskPhone(order.contactPhone) : order.contactPhone,
    }));

    return {
      code: 0,
      data: { list: maskedList, total: totalRes.total, page, pageSize },
      message: 'success',
    };
```

- [ ] **Step 4: getProviderOrders — 脱敏列表中每条 contactPhone**

`cloudfunctions/getProviderOrders/index.js`：加 maskPhone + return 前脱敏。

```js
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
```

return 前（第 28 行附近）：
```js
    const maskedList = list.data.map(order => ({
      ...order,
      contactPhone: order.contactPhone ? maskPhone(order.contactPhone) : order.contactPhone,
    }));

    return { code: 0, data: { list: maskedList, total, page, pageSize }, message: 'success' };
```

- [ ] **Step 5: getProviderDetail — 脱敏 provider.phone**

`cloudfunctions/getProviderDetail/index.js`：已在 Task 1 加过日志。现加 maskPhone + return 前脱敏。

maskPhone 加在 `const db = cloud.database();` 之后（已有代码后另起一行）：

```js
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
```

return 前（第 40 行附近）：
```js
    // 脱敏服务商手机号
    const provider = providerRes.data;
    if (provider && provider.phone) {
      provider.phone = maskPhone(provider.phone);
    }

    return {
      code: 0,
      data: {
        provider,
        serviceItems: serviceItems.data,
        portfolios: portfolios.data,
        reviews: reviews.data,
      },
      message: 'success',
    };
```

- [ ] **Step 6: getProviderList — 脱敏列表中每条 phone**

`cloudfunctions/getProviderList/index.js`：已在 Task 1 加过日志。现加 maskPhone + return 前脱敏。

maskPhone 加在 `const _ = db.command;` 之后：

```js
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
```

return 前（第 34 行附近）：
```js
    const maskedList = list.data.map(p => ({
      ...p,
      phone: p.phone ? maskPhone(p.phone) : p.phone,
    }));

    return {
      code: 0,
      data: { list: maskedList, total, page, pageSize },
      message: 'success',
    };
```

- [ ] **Step 7: 提交**

```bash
git add cloudfunctions/login cloudfunctions/getOrderDetail cloudfunctions/getOrderList cloudfunctions/getProviderOrders cloudfunctions/getProviderDetail cloudfunctions/getProviderList
git commit -m "feat: 6个云函数手机号返回脱敏"
```

---

### Task 3: 新增 getContactPhone 云函数

**Files:**
- Create: `cloudfunctions/getContactPhone/index.js`
- Create: `cloudfunctions/getContactPhone/package.json`

**Interfaces:**
- Consumes: 无
- Produces: `{ code: 0, data: { phone } }`，调用方通过 target 字段区分取订单联系人电话或商家电话

- [ ] **Step 1: 创建 package.json**

```bash
mkdir -p cloudfunctions/getContactPhone
cat > cloudfunctions/getContactPhone/package.json << 'ENDOFFILE'
{
  "name": "getContactPhone",
  "version": "1.0.0",
  "description": "获取完整手机号（需权限校验）",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
ENDOFFILE
```

- [ ] **Step 2: 创建 index.js**

```bash
cat > cloudfunctions/getContactPhone/index.js << 'ENDOFFILE'
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  const { target, orderId, providerId } = event;

  try {
    // target=order: 获取订单联系人电话（需权限校验）
    if (target === 'order') {
      if (!orderId) return { code: 1001, message: '缺少 orderId' };

      const orderRes = await db.collection('orders').doc(orderId).get();
      if (!orderRes.data) return { code: 1003, message: '订单不存在' };
      const order = orderRes.data;

      // 权限校验：下单用户 / admin / 订单内商家
      let allowed = order.userId === openid;
      if (!allowed) {
        const me = (await db.collection('users').where({ _openid: openid }).get()).data[0];
        if (me && (me.roles || []).includes('admin')) allowed = true;
      }
      if (!allowed) {
        const mine = (await db.collection('providers').where({ userId: openid }).get()).data.map(p => p._id);
        if (order.items.some(i => mine.includes(i.providerId))) allowed = true;
      }
      if (!allowed) return { code: 1002, message: '无权查看此电话' };

      console.log(`[getContactPhone] target=order orderId=${orderId} caller=${openid}`);
      return { code: 0, data: { phone: order.contactPhone || '' }, message: 'success' };
    }

    // target=provider: 获取商家联系电话（已登录用户均可查看）
    if (target === 'provider') {
      if (!providerId) return { code: 1001, message: '缺少 providerId' };

      const providerRes = await db.collection('providers').doc(providerId).get();
      if (!providerRes.data) return { code: 1003, message: '服务商不存在' };

      console.log(`[getContactPhone] target=provider providerId=${providerId} caller=${openid}`);
      return { code: 0, data: { phone: providerRes.data.phone || '' }, message: 'success' };
    }

    return { code: 1001, message: 'target 必须为 order 或 provider' };
  } catch (err) {
    console.error('[getContactPhone]', err);
    return { code: 9999, message: err.message };
  }
};
ENDOFFILE
```

- [ ] **Step 3: 提交**

```bash
git add cloudfunctions/getContactPhone
git commit -m "feat: 新增 getContactPhone 云函数（权限校验+双向解号码）"
```

---

### Task 4: 前端 service 层 + 页面拨号入口

**Files:**
- Modify: `miniprogram/services/orderService.js`
- Modify: `miniprogram/pages/serviceDetail/index.js`
- Modify: `miniprogram/pages/orderDetail/index.js`
- Modify: `miniprogram/pages/orderDetail/index.wxml`
- Modify: `miniprogram/pages/orderList/index.js`
- Modify: `miniprogram/pages/orderList/index.wxml`

**Interfaces:**
- Consumes: Task 3 的 `getContactPhone` 云函数
- Produces: 4 处页面新增 📞 一键拨号入口

- [ ] **Step 1: orderService.js 新增 getContactPhone 封装**

在 `miniprogram/services/orderService.js` 末尾（`module.exports` 之前）加：

```js
/** 获取完整手机号（需权限校验） */
const getContactPhone = (target, targetId) =>
  callFunction('getContactPhone', { target, [target === 'order' ? 'orderId' : 'providerId']: targetId });
```

然后把 `getContactPhone` 加入 `module.exports`：

```js
module.exports = {
  createOrder,
  payOrder,
  getOrderList,
  getOrderDetail,
  cancelOrder,
  createReview,
  getReviews,
  toggleLike,
  toggleFavorite,
  getFavorites,
  getContactPhone,
};
```

- [ ] **Step 2: serviceDetail — onCallPhone 接入 getContactPhone**

`miniprogram/pages/serviceDetail/index.js` — 修改 `onCallPhone`：

原代码：
```js
  onCallPhone() {
    if (this.data.provider && this.data.provider.phone) {
      wx.makePhoneCall({ phoneNumber: this.data.provider.phone });
    }
  },
```

改为：
```js
  async onCallPhone() {
    if (!this.data.providerId) return;
    wx.showLoading({ title: '获取中...' });
    try {
      const { getContactPhone } = require('../../services/orderService');
      const res = await getContactPhone('provider', this.data.providerId);
      wx.hideLoading();
      if (res && res.phone) {
        wx.makePhoneCall({ phoneNumber: res.phone });
      } else {
        wx.showToast({ title: '暂无电话', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '获取失败', icon: 'none' });
    }
  },
```

- [ ] **Step 3: orderDetail — 加拨号按钮（客户电话 + 商家电话）**

`miniprogram/pages/orderDetail/index.wxml` — 在"联系信息"区手机号行后面加拨号按钮：

原代码（第 29 行）：
```html
<view class="flex-between mt-10"><text>手机号</text><text>{{order.contactPhone}}</text></view>
```

改为：
```html
<view class="flex-between mt-10">
  <text>手机号</text>
  <view class="flex-row">
    <text>{{order.contactPhone}}</text>
    <text class="call-icon ml-10" bindtap="onCallCustomer">📞</text>
  </view>
</view>
```

同时在服务商列表每项加拨号（第 20-22 行区域）：
```html
<view wx:for="{{providers}}" wx:key="_id" class="provider-row mt-10">
  <text class="text-bold">{{item.name}}</text>
  <text wx:if="{{item.level>0}}" class="level-tag level-{{item.level}}">{{item.levelName}}</text>
  <text class="text-sm text-secondary ml-10">⭐ {{item.rating||0}}</text>
  <text class="call-icon ml-10" bindtap="onCallProvider" data-id="{{item._id}}">📞</text>
</view>
```

`miniprogram/pages/orderDetail/index.js` — 加两个方法：

```js
  async onCallCustomer() {
    if (!this.data.orderId) return;
    wx.showLoading({ title: '获取中...' });
    try {
      const { getContactPhone } = require('../../services/orderService');
      const res = await getContactPhone('order', this.data.orderId);
      wx.hideLoading();
      if (res && res.phone) {
        wx.makePhoneCall({ phoneNumber: res.phone });
      } else {
        wx.showToast({ title: '暂无电话', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '获取失败', icon: 'none' });
    }
  },

  async onCallProvider(e) {
    const providerId = e.currentTarget.dataset.id;
    if (!providerId) return;
    wx.showLoading({ title: '获取中...' });
    try {
      const { getContactPhone } = require('../../services/orderService');
      const res = await getContactPhone('provider', providerId);
      wx.hideLoading();
      if (res && res.phone) {
        wx.makePhoneCall({ phoneNumber: res.phone });
      } else {
        wx.showToast({ title: '暂无电话', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '获取失败', icon: 'none' });
    }
  },
```

- [ ] **Step 4: orderList — 商家视图加拨号按钮**

`miniprogram/pages/orderList/index.wxml` — 第 32 行，手机号旁加 📞：

原代码：
```html
<text class="text-sm text-secondary mt-10">{{item.contactName}} {{item.contactPhone}}</text>
```

改为：
```html
<view class="flex-row mt-10">
  <text class="text-sm text-secondary">{{item.contactName}} {{item.contactPhone}}</text>
  <text class="call-icon ml-10" catchtap="onCallCustomer" data-id="{{item._id}}">📞</text>
</view>
```

`miniprogram/pages/orderList/index.js` — 加 `onCallCustomer` 方法（放在 `onProviderAction` 后面）：

```js
  async onCallCustomer(e) {
    const orderId = e.currentTarget.dataset.id;
    if (!orderId) return;
    wx.showLoading({ title: '获取中...' });
    try {
      const { getContactPhone } = require('../../services/orderService');
      const res = await getContactPhone('order', orderId);
      wx.hideLoading();
      if (res && res.phone) {
        wx.makePhoneCall({ phoneNumber: res.phone });
      } else {
        wx.showToast({ title: '暂无电话', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '获取失败', icon: 'none' });
    }
  },
```

> **注意**: `catchtap` 用于阻止事件冒泡到父级 `bindtap="onOrderTap"`，防止点 📞 时同时触发跳转订单详情。

- [ ] **Step 5: 提交**

```bash
git add miniprogram/services/orderService.js miniprogram/pages/serviceDetail/index.js miniprogram/pages/orderDetail/index.js miniprogram/pages/orderDetail/index.wxml miniprogram/pages/orderList/index.js miniprogram/pages/orderList/index.wxml
git commit -m "feat: 前端双向一键拨号（商家⇄客户）接入getContactPhone"
```

---

### Task 5: 验证

**Files:** 无（手动验证 + git 检查）

- [ ] **Step 1: 检查未改动文件**

确认 9 个不该动的文件一处未碰：
```bash
git diff --stat HEAD~4 -- cloudfunctions/payOrder cloudfunctions/mockPay cloudfunctions/mockCompleteOrder cloudfunctions/payCallback cloudfunctions/getMyProvider cloudfunctions/approveProvider cloudfunctions/approveRefund cloudfunctions/reviewPortfolio cloudfunctions/reviewServiceItem
```

- [ ] **Step 2: 复核日志 marker**

```bash
grep -rn "caller=" cloudfunctions/getCategoryList cloudfunctions/getProviderList cloudfunctions/getProviderDetail cloudfunctions/getPortfolioDetail cloudfunctions/getReviews
```
Expected: 5 个函数各有一行 `console.log(...caller=...)`。

- [ ] **Step 3: 复核脱敏 marker**

```bash
grep -rn "maskPhone" cloudfunctions/login cloudfunctions/getOrderDetail cloudfunctions/getOrderList cloudfunctions/getProviderOrders cloudfunctions/getProviderDetail cloudfunctions/getProviderList
```
Expected: 6 个函数各定义了 `maskPhone` + 在 return 前调用了 `maskPhone`。

- [ ] **Step 4: 复核 getContactPhone**

```bash
grep -rn "getContactPhone" cloudfunctions/getContactPhone/index.js miniprogram/services/orderService.js miniprogram/pages/serviceDetail/index.js miniprogram/pages/orderDetail/index.js miniprogram/pages/orderList/index.js
```
Expected: 云函数 exports、service 封装、3 个页面调用的完整链路。

- [ ] **Step 5: 部署到云端（在微信开发者工具中操作）**

对本次新增/修改的云函数逐个右键 →「创建并部署：云端安装依赖（不上传 node_modules）」：
- 修改的：getCategoryList, getProviderList, getProviderDetail, getPortfolioDetail, getReviews, login, getOrderDetail, getOrderList, getProviderOrders
- 新增的：getContactPhone

共 10 个。

- [ ] **Step 6: 手动冒烟**

1. **日志验证**：打开任意公共页（首页/服务商列表/作品详情）→ 云开发控制台 → 云函数日志 → 能看到 `caller=xxx` 记录。
2. **脱敏验证**：登录后看"我的"页面 → 手机号显示 `138****5678`；查看订单详情 → 联系人手机号脱敏。
3. **拨号验证（商家→客户）**：商家身份进入订单列表 → 点 📞 → `wx.makePhoneCall` 弹出拨打确认（号码为完整原文）。
4. **拨号验证（客户→商家）**：用户身份进入服务商详情 → 点 📞 电话咨询 → 弹出拨打确认。
5. **权限验证**：用户 A 打开用户 B 的订单，调 `getContactPhone({target:'order', orderId})` → 期望 `1002 无权查看此电话`。

- [ ] **Step 7: 推送**

```bash
git push
```
