# 用户数据持久化与安全加固 — 设计文档

- 日期：2026-07-16
- 范围：文旅摄影预约小程序云开发后端（`cloudfunctions/`）+ 前端拨号入口
- 目标：公开读接口加调用者日志追溯 + 手机号统一脱敏 + 双向一键拨号

## 背景

上一轮后端鉴权（2026-07-14）已给 35 个写/管理函数补了 OPENID 守卫和 admin 鉴权。但仍有两点不足：

1. **5 个公共读函数完全匿名**：任何人调用无记录，出问题无法追溯
2. **手机号原样返回**：`users.phone`、`orders.contactPhone`、`providers.phone` 在多个函数返回中明文暴露

本次改动补齐这两个缺口，并新增双向一键拨号入口：最小侵入、不改函数签名、不改返回格式。

---

## 一、公开读接口加调用者日志

### 范围（5 个函数）

`getCategoryList`、`getProviderList`、`getProviderDetail`、`getPortfolioDetail`、`getReviews`

### 做法

每个函数在 `exports.main` 入口取 OPENID，`console.log` 一行记录调用者与参数。不做任何鉴权拦截，不影响原有业务逻辑。

```js
const openid = cloud.getWXContext().OPENID;
console.log(`[函数名] caller=${openid || 'anonymous'}`, JSON.stringify(event));
```

### 设计原则

- 不加 `if (!openid) return`——这些是公开内容，匿名也应可读
- 不写数据库——避免增加延迟和费用，控制台日志足够追溯
- `console.log` 在云函数日志中可检索，出问题时靠 OPENID 定位调用者

---

## 二、手机号脱敏（后端返回层）

### 脱敏函数（内联）

```js
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
// "13812345678" → "138****5678"
```

由于微信云开发跨目录 require 会失效，`maskPhone` 在每个需要的云函数中内联定义。

### 涉及函数

| 函数 | 脱敏字段 | 说明 |
|------|----------|------|
| `login` | `userInfo.phone` | 返回的 user 对象中 phone 脱敏 |
| `getOrderDetail` | `order.contactPhone` | 所有人统一看到脱敏版 |
| `getOrderList` | 列表中每条 `contactPhone` | 用户端订单列表 |
| `getProviderOrders` | 同上 | 商家端订单列表 |
| `getProviderDetail` | `provider.phone` | 服务商详情页 |
| `getProviderList` | 列表中每条 `phone` | 服务商列表 |

共 6 个函数。`getMyProvider` 不脱敏（商家看自己的信息）。

### 设计原则

- 数据库存储不脱敏——存原文，仅返回时处理
- 不改函数签名、不改返回格式、不改数据库

---

## 三、一键拨号（新增云函数 + 前端入口）

### 新增云函数 `getContactPhone`

```
输入: { target: 'order', orderId }
  → 校验调用者是 下单用户 / 订单内商家 / admin
  → 返回 { code: 0, data: { phone: "13812345678" } }

输入: { target: 'provider', providerId }
  → 校验调用者已登录（openid 非空）
  → 返回 { code: 0, data: { phone: "13912345678" } }
```

权限矩阵：

| target | 谁能拿 |
|--------|--------|
| `order` | 下单用户本人 / 订单关联的商家 / admin |
| `provider` | 任意已登录用户（商家电话是公开业务联系方式） |

两种 target 均记录 `console.log` 调用者 OPENID 便于审计。

### 前端改动

| 页面 | 改动 | 说明 |
|------|------|------|
| `serviceDetail/index.js` | `onCallPhone` 改为先调 `getContactPhone({target:'provider', providerId})` 再 `wx.makePhoneCall` | 原代码直接用 `provider.phone`，脱敏后需先解 |
| `orderDetail/index.wxml+js` | 联系信息区加 `📞 拨打` 按钮 | 用户/商家均可拨客户电话；服务商列表每项加拨号 |
| `orderList/index.wxml+js` | 商家视图每条订单的联系人旁加 `📞` 按钮 | 商家直接拨客户 |

按钮交互流程：
```
点击 📞 → wx.showLoading → 调 getContactPhone → wx.hideLoading
  → 成功: wx.makePhoneCall({ phoneNumber })
  → 失败: wx.showToast('获取失败')
```

---

## 改动汇总

### 后端（云函数）

| 文件 | 改动 |
|------|------|
| `cloudfunctions/getCategoryList/index.js` | +2行日志 |
| `cloudfunctions/getProviderList/index.js` | +2行日志 + maskPhone |
| `cloudfunctions/getProviderDetail/index.js` | +2行日志 + maskPhone |
| `cloudfunctions/getPortfolioDetail/index.js` | +2行日志 |
| `cloudfunctions/getReviews/index.js` | +2行日志 |
| `cloudfunctions/login/index.js` | +maskPhone + 返回前脱敏 |
| `cloudfunctions/getOrderDetail/index.js` | +maskPhone + 返回前脱敏 |
| `cloudfunctions/getOrderList/index.js` | +maskPhone + 返回前脱敏 |
| `cloudfunctions/getProviderOrders/index.js` | +maskPhone + 返回前脱敏 |
| `cloudfunctions/getContactPhone/` | **新增** |

### 前端（小程序）

| 文件 | 改动 |
|------|------|
| `miniprogram/pages/serviceDetail/index.js` | `onCallPhone` 接入 getContactPhone |
| `miniprogram/pages/orderDetail/index.js+wxml` | 联系信息加拨号按钮 + 服务商列表加拨号 |
| `miniprogram/pages/orderList/index.js+wxml` | 商家视图每条订单加拨号按钮 |
| `miniprogram/services/orderService.js` | 新增 `getContactPhone` 封装 |

---

## 不在本次范围

- 数据库自动备份（需付费，暂不做）
- 接口限流 / 防刷（独立议题）
