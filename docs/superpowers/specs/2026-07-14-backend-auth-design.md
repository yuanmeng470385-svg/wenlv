# 后端统一身份校验 — 设计文档

- 日期：2026-07-14
- 范围：文旅摄影预约小程序云开发后端（`cloudfunctions/`）
- 目标：给管理端函数补 admin 鉴权、给写操作补 OPENID 硬校验，消除"任何人可调用管理接口 / 越权读订单"这一类资损与篡改风险。
- 不涉及：微信支付相关函数（本次不动，留待支付模块统一处理）。

## 背景与约束

审计确认（2026-07-14）：

- 44 个云函数中，**没有一个做 OPENID 硬校验**（`if (!openid) return`）。26 个读取 OPENID 并用它查库（读接口空 openid 会自然查不到、失败关闭；写接口空 openid 会写出归属为空串的脏数据）；18 个**根本不取调用者身份**。
- 其中约 **10 个管理端函数完全不认身份**：任何拿到函数名的人都能批准商家、通过退款、审核作品、改服务商等级、看管理仪表盘。这是全项目 No.1 风险。
- `initTestData` 无任何防护，任何人可调用往正式库灌 36 条测试数据。
- `getOrderDetail` 只收 `orderId`、不校验调用者，任何人可读任意订单（含联系人手机号）——越权读 + PII 泄露。

关键技术约束：

- 微信云开发中每个云函数是独立目录、独立 `package.json`（仅依赖 `wx-server-sdk`），**部署时只上传该函数自身文件夹**。因此 `require('../common/auth')` 跨目录引用在云端会失效。
- 项目当前零共享代码，所有逻辑内联。

据此，鉴权复用方式选定为 **内联守卫**（与现有"一切内联"风格一致、部署无坑），而非共享 helper 文件。

## 分档与要改的函数

统一原则：不改函数签名、不改返回格式 `{code, data, message}`、不改前端。

### A 档 · 管理端 → 加 `requireAdmin`

校验 OPENID 存在 + 查 `users.roles` 含 `'admin'`：

- approveProvider
- approveRefund
- reviewPortfolio
- reviewServiceItem
- updateProviderLevel
- getAdminDashboard
- getPendingProviders
- getPendingPortfolios
- getPendingRefunds
- getPendingServiceItems
- initTestData（相邻修复：加 admin 门禁）

### B 档 · 用户写操作 → 加登录硬守卫

`if (!openid) return { code: 1002, message: '未登录' }`：

- createOrder
- createReview
- cancelOrder
- toggleLike
- toggleFavorite
- updateUserInfo
- applyProvider
- switchRole
- getOrderList
- getFavorites
- login

### C 档 · 商家端 → 补登录硬守卫（保留现有查 providers 表逻辑）

这些函数已有 `providers.where({ userId: openid, status: 'active' })` 身份校验，空 openid 已经失败关闭；补 OPENID 硬守卫是为了返回更明确的"未登录"语义：

- providerHandleOrder
- saveServiceItem
- uploadPortfolio
- getMyProvider
- getMyPortfolios
- getMyServiceItems
- getMyTimeSlots
- getProviderDashboard
- getProviderOrders
- updateSchedule
- updateServiceItem
- toggleTimeSlot

### 相邻修复 · getOrderDetail → 加访问控制

该函数当前不取调用者身份，需先加登录守卫取到 `openid`（模板①），再在取到 order 后做访问控制：仅"下单用户 / 订单内商家 / admin"三者之一可读，否则 `1002 无权查看此订单`。

### 不改动

- 公共读（保持开放）：getCategoryList、getProviderList、getProviderDetail、getPortfolioDetail、getReviews
- 支付桶（本次不碰）：payOrder、mockPay、mockCompleteOrder、payCallback

合计改动 35 个函数（A 档 11 + B 档 11 + C 档 12 + getOrderDetail 1）。

## 内联守卫模板

### ① 登录守卫（B / C 档）

取 openid 后紧跟一行：

```js
const openid = cloud.getWXContext().OPENID;
if (!openid) return { code: 1002, message: '未登录' };
```

### ② 管理员守卫（A 档，置于业务逻辑最前）

```js
const openid = cloud.getWXContext().OPENID;
if (!openid) return { code: 1002, message: '未登录' };
const _admin = await db.collection('users').where({ _openid: openid }).get();
if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
  return { code: 1002, message: '无管理员权限' };
}
```

### ③ 订单访问守卫（getOrderDetail，取到 order 后）

```js
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
```

## 约定

- **错误码统一 `1002`**：对齐现有"1002 权限不足"，未登录与无权限均用 1002。前端已有 code≠0 处理，无需改前端。
- **admin 判定**沿用现有设计：`users.roles[]` 数组含 `'admin'`，在 DB 中手动追加，不新建集合。
- **`_openid` 查询**沿用现有写法 `where({ _openid: openid })`（login/switchRole/updateUserInfo 一致）。
- A 档函数原本多数不查 users 表，本方案为其新增一次按 `_openid` 的索引查询作为鉴权，延迟可忽略。

## 验证方式

微信云函数无法本地跑自动化测试（依赖云端运行时 + DevTools 部署），验证靠两条：

1. **静态核对**（改完执行）：
   - A 档 11 个函数均含"无管理员权限"守卫；
   - B/C 档函数均含"未登录"守卫；
   - getOrderDetail 含"无权查看此订单"；
   - 5 个公共读函数一处未动；
   - 4 个支付函数一处未动。
2. **手动冒烟**（DevTools 云函数本地调试）：
   - 非 admin 账号调一个管理函数 → 期望 `1002 无管理员权限`；
   - admin 账号调同一函数 → 期望通过；
   - 未下单用户调 getOrderDetail 读他人订单 → 期望 `1002 无权查看此订单`。

## 不在本次范围

- 接口限流 / 防刷（独立议题）
- 图片上传格式 / 大小校验、内容安全 API（独立议题）
- 测试 / 生产环境隔离、支付分账、mockPay 环境门禁（支付与运维桶）
- `approveRefund` 驳回时 items 状态不一致的逻辑 bug（留待订单模块）
