# 文旅摄影预约 - 微信小程序

摄影 + 妆造 + 汉服 O2O 预约平台。支持三种定价模式、组合套餐、微信支付、技术分级、多角色身份切换与后台审核。

## 技术栈
- **前端**: 原生微信小程序
- **后端**: 微信云开发（云函数 + 云数据库 + 云存储）
- **支付**: 微信支付 JSAPI (`cloud.cloudPay`)，另提供模拟支付用于测试

## 目录结构
```
wenlv/
├── miniprogram/              # 小程序前端代码
│   ├── pages/                # 24 个页面（用户端 / 商家端 provider / 管理端 admin）
│   ├── components/           # 组件目录
│   ├── services/             # 云函数调用封装 (cloud/user/service/order)
│   ├── utils/                # 工具函数 (金额、时间、校验)
│   ├── styles/               # 全局样式
│   └── images/               # 图标资源
├── cloudfunctions/           # 44 个云函数（+ quickstartFunctions 模板）
├── project.config.json       # 开发者工具配置
└── cloudbaserc.js            # 云开发环境配置
```

## 快速开始

### 1. 环境准备
- 注册微信小程序（需 AppID）
- 开通微信云开发（获取环境 ID）
- 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

### 2. 配置调整
1. 修改 `project.config.json` 中的 `appid` 为你的 AppID
2. 修改 `miniprogram/app.js` 中的云环境 ID: `env: '你的环境ID'`
3. 修改 `cloudbaserc.js` 中的 `envId` 为你的环境 ID

> 当前配置：云环境 ID `cloud1-d1gv9n7j56c0a3448`，AppID `wxce7801ec430c768e`

### 3. 云开发初始化
1. 在微信开发者工具中打开项目
2. 点击「云开发」按钮开通云开发
3. 创建下方「数据库集合」中列出的 11 个集合
4. 右键各云函数文件夹 →「创建并部署：云端安装依赖（不上传 node_modules）」
5. 在云开发控制台调用 `initTestData` 云函数注入测试数据

### 4. TabBar 图标
需要为 `miniprogram/images/` 添加以下 6 个图标文件 (建议 81x81 像素，未选中 `#999`，选中暖色 `#C48B5C`):
- `tab-home.png` / `tab-home-active.png` (首页)
- `tab-order.png` / `tab-order-active.png` (订单)
- `tab-mine.png` / `tab-mine-active.png` (我的)

### 5. 支付与测试
- **模拟支付（推荐测试用）**: 下单后选「模拟支付(测试模式)」，调用 `mockPay` 云函数，跳过真实微信支付；`mockCompleteOrder` 可快速将订单推进到已完成
- **真实微信支付**: 在 `payOrder` 云函数中填入商户号 `subMchId`，为 `payCallback` 配置 HTTP 触发器，并在微信支付商户平台配置回调地址

## 角色与身份系统

4 种角色存储在 `users.roles[]` 数组中，一个用户可有多身份，`activeRole` 控制当前视角：

| 角色 | 说明 |
|------|------|
| `user` | 普通用户 —— 浏览 / 预约 / 评价 |
| `photographer` | 摄影师 —— 商家后台，1–5 星等级 |
| `makeup` | 妆造师 —— 商家后台，1–5 星等级 |
| `hanfu_shop` | 汉服店 —— 商家后台，无等级 |
| `admin` | 管理员 —— 审核服务商 / 作品 / 套餐 / 退款（在 DB 中手动追加 `roles:["user","admin"]`）|

3 个 TabBar 页面（首页 / 订单 / 我的）按 `activeRole` 切换用户模式（浏览预约）与商家模式（仪表盘 / 接单管理）。

## 核心功能
- 三种服务类型：摄影师(5 级分级)、妆造师(5 级分级)、汉服店(无等级)
- 三种定价：固定套餐(fixed) / 按时计费(hourly) / 按项目(project)
- 组合套餐：一次下单多服务项（`orders.items[]`）
- 作品墙：上传 + 审核 + 点赞 + 收藏
- 商家排期：时间段（`timeSlots`）管理与开关
- 后台审核：服务商入驻、作品、套餐、退款均需管理员审批
- 身份切换：小程序内切换用户 / 商家 / 管理员视角

## 订单状态机
```
pending_pay → paid → confirmed → in_progress → completed → reviewed
    ↓           ↓         ↓             ↓
cancelled   pending_refund (管理员 approveRefund 通过后 → cancelled)
```
- 用户取消：<24h 全额退款；24h 内退 50%；已过期不可取消。退款需管理员审批
- 商家操作：`providerHandleOrder` (confirm / start / complete)，拒绝时自动标记退款

## 数据库集合 (11 个)
`users` | `providers` | `serviceItems` | `orders` | `payments` | `portfolios` | `reviews` | `favorites` | `likes` | `categories` | `timeSlots`

- 金额单位统一为**分**（`utils/priceUtil.js` 提供 `fenToYuan` / `formatPrice`）
- 审核状态：`pending_review` → `approved` / `rejected`（套餐与服务商均需审核）

## 云函数 (44 个)

**用户 / 身份**
`login` | `switchRole` | `updateUserInfo` | `applyProvider`

**浏览 / 发现**
`getCategoryList` | `getProviderList` | `getProviderDetail` | `getPortfolioDetail` | `getReviews`

**互动**
`toggleLike` | `toggleFavorite` | `getFavorites`

**下单 / 支付 / 评价**
`createOrder` | `payOrder` | `mockPay` | `payCallback` | `mockCompleteOrder` | `cancelOrder` | `getOrderList` | `getOrderDetail` | `createReview`

**商家后台**
`getProviderDashboard` | `getProviderOrders` | `providerHandleOrder` | `getMyProvider` | `uploadPortfolio` | `getMyPortfolios` | `getMyServiceItems` | `saveServiceItem` | `updateServiceItem` | `updateSchedule` | `getMyTimeSlots` | `toggleTimeSlot`

**管理员审核**
`getAdminDashboard` | `getPendingProviders` | `approveProvider` | `getPendingPortfolios` | `reviewPortfolio` | `getPendingServiceItems` | `reviewServiceItem` | `getPendingRefunds` | `approveRefund` | `updateProviderLevel`

**数据 / 测试**
`initTestData`

> 所有云函数统一返回 `{ code: 0, data, message }`，`code ≠ 0` 表示错误。前端由 `services/` 层封装调用，页面不直接调 `wx.cloud.callFunction`。
