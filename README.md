# 文旅摄影预约 - 微信小程序

摄影 + 妆造 + 汉服 O2O 预约平台。支持固定套餐/按时计费两种定价、组合套餐、微信支付、多角色身份切换、汉服店位置发现与全链路后台审核。

> **当前状态（2026-07-22）：** UI 重设计完成，活跃分支 `feat/ui-redesign`（~50 commits ahead of main）。新增套餐详情中间页，预约流程重构为 3 步（商家→套餐→下单），多项安全与体验修复。

## 技术栈
- **前端**: 原生微信小程序
- **后端**: 微信云开发（云函数 + 云数据库 + 云存储）
- **支付**: 微信支付 JSAPI (`cloud.cloudPay`)，另提供模拟支付用于测试
- **地图**: 腾讯地图地点搜索 API（汉服店周边发现）

## 目录结构
```
wenlv/
├── miniprogram/              # 小程序前端代码
│   ├── pages/                # 30 个页面（用户端 / 商家端 provider / 管理端 admin）
│   ├── components/           # 5 个共享组件（icon / empty-state / error-state / loading-skeleton / cloudTipModal）
│   ├── services/             # 云函数调用封装 (cloud / user / service / order)
│   ├── utils/                # 工具函数 (金额、时间、校验、通用)
│   ├── styles/               # 全局样式（CSS 变量设计系统）
│   └── images/               # 图标资源
├── cloudfunctions/           # 70 个云函数
├── scripts/                  # 工具脚本
│   ├── verify-auth.js        # 云函数鉴权守卫校验
│   ├── check-compile.js      # 编译检查
│   └── gen-tabbar-icons.js   # Tab 图标生成（依赖 @resvg/resvg-js）
├── docs/
│   ├── superpowers/          # 设计文档 (specs/) 与实施计划 (plans/)
│   └── ui-redesign/          # UI 重设计参考素材
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
3. 创建下方「数据库集合」中列出的 15 个集合
4. 右键各云函数文件夹 →「创建并部署：云端安装依赖（不上传 node_modules）」（或用 CLI 批量部署，见下）
5. 在云开发控制台调用 `initTestData` 云函数注入测试数据（需先给自己加 admin 角色）

### 4. 支付与测试
- **模拟支付（推荐测试用）**: 下单后选「模拟支付(测试模式)」，调用 `mockPay` 云函数，跳过真实微信支付；`mockCompleteOrder` 可快速将订单推进到已完成
- **真实微信支付**: 在 `payOrder` 云函数中填入商户号 `subMchId`，为 `payCallback` 配置 HTTP 触发器，并在微信支付商户平台配置回调地址

### 5. 汉服店位置功能（可选）
- `searchNearbyShops` 云函数需配置腾讯地图 WebService API Key
- 小程序后台需开通 `wx.getLocation` 权限（`app.json` 已声明 `scope.userLocation`）

### 6. 命令行部署（可选）
```bash
# 批量部署云函数（需开启开发者工具服务端口）
cli.bat cloud functions deploy --env <环境ID> --names fn1 fn2 ... --remote-npm-install --project <项目路径>
```

## 角色与身份系统

角色存储在 `users.roles[]` 数组中，一个用户可持有多身份，`activeRole` 控制当前视角：

| 角色 | 说明 |
|------|------|
| `user` | 普通用户 —— 浏览 / 预约 / 评价 / 收藏 |
| `photographer` | 摄影师 —— 商家后台（套餐/作品/档期/接单） |
| `makeup` | 妆造师 —— 商家后台（同上） |
| `hanfu_shop` | 汉服店 —— 商家后台（同上） |
| `admin` | 管理员 —— 审核入驻/作品/套餐/退款/头像变更/注销，管理用户与 Banner（在 DB 中手动追加 `roles:["user","admin"]`，默认密码 `admin123`，可在 `config` 集合修改） |

3 个 TabBar 页面（首页 / 订单 / 我的）按身份切换模式：
- **首页**：用户模式为浏览发现；商家模式为自己店铺的详情页（含头像/背景图编辑入口）
- **订单**：用户模式为订单列表；商家模式为数据看板 + 快捷入口 + 订单管理
- **我的**：登录、身份切换、管理员入口、退出登录、注销商家身份

## 核心功能
- 三类服务商：摄影师 / 妆造师 / 汉服店
- 预约流程：商家详情→套餐详情（大图+描述）→立即预约→4步下单（确认套餐/选时间/填信息/支付）
- 两种定价：固定套餐(`fixed`) / 按时计费(`hourly`)（原「按项目(`project`)」已移除）
- 组合套餐：一次下单多服务项（`orders.items[]`）
- 作品墙：上传 + 审核 + 点赞 + 收藏 + 精选（作品级精选已替代旧商家级精选）
- 汉服店位置发现：自动定位 + 手动选城市 + 附近未入驻店铺混合展示
- 商家排期：时间段（`timeSlots`）管理与开关
- 订单编号中文化：`{商家名}-{套餐名}`；订单状态全中文映射
- 双向一键拨号：手机号统一脱敏返回，通过 `getContactPhone` 按需获取完整号码
- 消息通知：审核结果、订单变更等写入 `notifications`，「消息」页查看
- 全链路后台审核：商家入驻、作品、套餐（`pending_review → active/rejected`）、退款、头像/背景图变更、商家注销
- 商家注销：管理员审批后级联清理，历史订单保留并标记「商家已注销」
- 身份切换：小程序内切换用户 / 商家 / 管理员视角；支持退出登录
- 评价评分：1–5 星评价，自动计算商家平均分（`providers.rating`）（旧等级系统已删除）
- 管理员系统：密码门禁 + 用户封禁 + Banner 管理 + 审核工作台

## 订单状态机
```
pending_pay → paid → confirmed → in_progress → pending_complete → completed → reviewed
    ↓           ↓         ↓             ↓
cancelled   pending_refund (管理员 approveRefund 通过后 → cancelled)
```
- 用户取消：<24h 全额退款；24–48h 退 50%；已过期不可取消。退款需管理员审批
- 商家操作：`providerHandleOrder` (confirm / reject / start / complete)，拒绝时自动标记退款
- 双方都可 `confirmComplete` 将 `pending_complete` 推进到 `completed`
- 未支付订单过期自动取消（`cancelExpiredOrders`）；已支付 24h 未接单自动取消

## 数据库集合 (15 个)
`users` | `providers` | `serviceItems` | `orders` | `payments` | `portfolios` | `reviews` | `favorites` | `likes` | `categories` | `timeSlots` | `banners` | `notifications` | `config` | `auditLogs`

- 金额单位统一为**分**（`utils/priceUtil.js` 提供 `fenToYuan` / `formatPrice`）
- 审核状态：`pending_review` → `approved`/`active` / `rejected`（作品、套餐、商家均需审核）
- 手机号数据库存明文、接口返回脱敏（`138****5678`），完整号码经 `getContactPhone` 鉴权获取
- 管理员操作写 `auditLogs`；用户通知写 `notifications`

## 云函数 (70 个)

**用户 / 身份 (4)**
`login` | `switchRole` | `updateUserInfo` | `applyProvider`

**浏览 / 发现 (10)**
`getCategoryList` | `getProviderList` | `getProviderDetail` | `getPortfolioDetail` | `getReviews` | `getBanners` | `getFeaturedProviders` | `getFeaturedPortfolios` | `getProviderPortfolios` | `searchNearbyShops`

**互动 (3)**
`toggleLike` | `toggleFavorite` | `getFavorites`

**下单 / 支付 / 评价 (12)**
`createOrder` | `payOrder` | `mockPay` | `payCallback` | `mockCompleteOrder` | `cancelOrder` | `cancelExpiredOrders` | `getOrderList` | `getOrderDetail` | `confirmComplete` | `createReview` | `getContactPhone`

**商家后台 (17)**
`getProviderDashboard` | `getProviderOrders` | `providerHandleOrder` | `getMyProvider` | `uploadPortfolio` | `getMyPortfolios` | `deletePortfolio` | `getMyServiceItems` | `saveServiceItem` | `updateServiceItem` | `deleteServiceItem` | `updateSchedule` | `getMyTimeSlots` | `toggleTimeSlot` | `toggleProviderOpen` | `requestAvatarUpdate` | `requestDeregister`

**管理员 (21)**
`adminLogin` | `getAdminDashboard` | `getPendingProviders` | `approveProvider` | `getPendingPortfolios` | `reviewPortfolio` | `getPendingServiceItems` | `reviewServiceItem` | `getPendingRefunds` | `approveRefund` | `adminGetUsers` | `banUser` | `banProvider` | `getPendingAvatarUpdates` | `approveAvatarUpdate` | `getPendingDeregistrations` | `approveDeregister` | `saveBanner` | `deleteBanner` | `toggleFeatured` | `togglePortfolioFeatured`

**通知 (2)**
`getNotifications` | `markNotificationRead`

**数据 / 测试 (1)**
`initTestData`

> 所有云函数统一返回 `{ code: 0, data, message }`，`code ≠ 0` 表示错误。前端由 `services/` 层封装调用，页面不直接调 `wx.cloud.callFunction`。写/管理类函数均带内联身份校验守卫（可用 `node scripts/verify-auth.js` 校验）。

## 仓库与分支

- GitHub：`https://github.com/yuanmeng470385-svg/wenlv`
- 活跃开发分支：`feat/ui-redesign`（~50 commits ahead of main）；`main` 落后于 `feat/backend-auth`，最新功能尚未合回
- 设计文档见 `docs/superpowers/specs/`，实施计划见 `docs/superpowers/plans/`
- UI 重设计参考素材见 `docs/ui-redesign/`

## 设计系统

暖色中国风：主色 `#C48B5C`，深主色 `#A0703E`，浅主色 `#E8C9A0`，价格红 `#E8563A`。全局 CSS 变量定义在 `miniprogram/styles/variables.wxss`，页面背景 `#F6F1E7`，卡片白 `#FFFFFF`，Tab 栏背景 `#FBF8F0`。

WXSS 兼容注意：旧版微信不支持 flexbox `gap` 属性（应用 `justify-content: space-between` + margin/padding 替代）；`calc()` 在手机端可能有舍入误差（优先用百分比+`box-sizing: border-box`）。

## 相关文档

- [CLAUDE.md](./CLAUDE.md) — AI 辅助开发指引（含完整架构、模式、约束、云函数索引）
- [docs/superpowers/](./docs/superpowers/) — 设计规格与实施计划
