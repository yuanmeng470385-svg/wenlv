# 商家系统改造设计文档

**日期**: 2026-07-17
**项目**: 文旅摄影预约小程序 (wenlv)
**状态**: 设计中

---

## 概述

对商家（Provider）系统进行全面改造，涵盖底部 Tab 栏重构、商家首页 UI 改版、头像/背景图管理、注销身份、退出登录、删除作品、套餐图标、订单中文化、删除评级系统、管理员视图增强等功能。

---

## 1. 底部 Tab 栏改造

### 变更

中间 Tab 文案从"订单"改为"功能"（所有用户统一），指向 `pages/orderList/index`。

Tab 配置：
- 首页 (`pages/index/index`)
- 功能 (`pages/orderList/index`)
- 我的 (`pages/profile/index`)

### 首页（`index`）- 商家模式

复用 `serviceDetail` 页面布局，展示商家自己店铺的详情页 UI。

布局结构：
- 封面图 Swiper（`backgroundImage`），400rpx 高度
- 头像（`avatar`，圆形 100rpx）+ 商家名称 + 特色标签
- 三个 Tab：服务项目 / 作品展示 / 用户评价
- 封盖图和头像右上角各有一个编辑图标，点击触发修改申请

与用户端 `serviceDetail` 的区别：
- 去掉收藏按钮
- 去掉底部"电话咨询"和"立即预约"按钮
- 增加封面图和头像的编辑入口

### 功能（`orderList`）- 商家模式

合并旧仪表盘 + 订单列表：

布局结构（从上到下）：
1. 数据看板（3列）：今日预约 / 待处理 / 总订单
2. 快捷入口行：上传作品 / 作品管理 / 套餐管理 / 档期管理 / 编辑资料
3. 订单状态筛选 Tab
4. 订单卡片列表（可滚动加载更多）

普通用户模式下该页仍为纯订单列表（不变）。

---

## 2. 入驻时头像 + 背景图分离

### 前端变更 (`provider/register`)

拆分原来的"封面图（最多3张）"为：
- 商家头像（1张，圆形展示，必填）
- 背景图（1张，详情页顶部，必填）
- 代表作品（最多9张，不变）

### 数据库变更 (`providers`)

`avatar` 字段入驻时必填（之前为空）。新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `backgroundImage` | String | 背景图 fileID |

### 后端变更 (`applyProvider`)

接收新参数 `avatar`（必填）和 `backgroundImage`（必填）。

---

## 3. 商家修改头像 & 背景图（管理员审核）

### 入口

商家首页（`index` 页商家模式）中，头像和封面图右上角编辑图标。

### 审核机制

`providers` 新增 pending 字段：

| 字段 | 说明 |
|------|------|
| `pendingAvatar` | 待审核新头像（null = 无申请） |
| `pendingBackgroundImage` | 待审核新背景图（null = 无申请） |

流程：
1. 商家点击编辑 → 选择图片 → 上传 → 写入对应 pending 字段
2. 页面继续显示旧图（审核通过前不替换）
3. 管理员在审核列表看到新旧图对比 → 同意/拒绝
4. 同意：旧图 = pending 值，pending = null
5. 拒绝：pending = null（旧图不变）

### 新增云函数

- `requestAvatarUpdate({ type: 'avatar'|'backgroundImage', fileID })` — 商家提交修改申请
- `approveAvatarUpdate({ providerId, field: 'avatar'|'backgroundImage', action: 'approve'|'reject' })` — 管理员审核

---

## 4. 商家注销身份

### 入口

`profile` 页面，商家模式下增加"注销商家身份"按钮（红色警告色）。

### 流程

1. 商家点击 → 二次确认弹窗
2. 后端检查：有未完成订单（非 completed/cancelled）→ 拒绝
3. 无未完成订单 → `status` 改为 `pending_deregister` → 通知管理员
4. 管理员审核：
   - 同意 → 级联删除 + 标记订单 + 移除角色
   - 拒绝 → 恢复 `status` 为 `active`

### 同意后的数据处理

| 数据 | 处理方式 |
|------|----------|
| `providers` 文档 | 删除 |
| `portfolios`（作品）| 删除全部 |
| `serviceItems`（套餐）| 删除全部 |
| `reviews`（评价）| 删除全部 |
| `orders`（订单）| 保留，新增 `providerDeleted: true` + `providerNameSnapshot` |
| `users.roles` | 移除该商家角色 |

### 数据库变更

- `providers.status` 新增枚举值 `pending_deregister`
- `orders` 新增字段 `providerDeleted: Boolean`, `providerNameSnapshot: String`

### 新增云函数

- `requestDeregister({ providerId })` — 商家申请注销
- `approveDeregister({ providerId, action: 'approve'|'reject' })` — 管理员审核

---

## 5. 用户退出登录

### 入口

`profile` 页面底部增加"退出登录"按钮。

### 逻辑

- 清除 `app.globalData`（userInfo, openid, hasLogin, activeRole）
- `wx.clearStorageSync()`
- 跳回首页

---

## 6. 商家删除作品

### 位置

`provider/myWorks` 作品管理页，每个作品卡片增加删除按钮。

### 逻辑

- 二次确认后直接删除，不需管理员同意
- 删除 `portfolios` 文档 + 对应云存储图片文件

### 云函数

新增 `deletePortfolio({ portfolioId })`。

---

## 7. 服务套餐图标

### 变更

- `serviceItems` 集合新增 `icon` 字段（String，fileID）
- `editServiceItem` 页面增加图标上传项
- 用户端 `serviceDetail` 服务项目卡片中显示图标

---

## 8. 订单信息中文化

### 订单编号

订单编号格式从 `WO202401011234` 改为 `{商家名}-{套餐名}` 拼接。

### 订单状态

确保所有订单状态在前端显示为中文（补齐映射表）。

---

## 9. 删除商家评级系统

### 涉及范围

| 位置 | 变更 |
|------|------|
| `providers` 表 | 移除 `level`, `levelName`, `rating`, `reviewCount` 字段 |
| `applyProvider` | 去掉 `level:0, levelName:''` 初始化 |
| `approveProvider` | 去掉等级设置逻辑，去掉 LEVEL_MAP |
| `updateProviderLevel` | 删除整个云函数 |
| `serviceDetail/index.wxml` | 去掉星级标签和评分展示 |
| `serviceDetail/index.wxss` | 去掉 `.level-tag`, `.level-1`~`.level-5` 样式 |
| `index/index.wxml`（用户模式）| 去掉热门推荐中的等级标签和评分 |
| `profile/index.wxml` | 去掉商家等级显示（如有） |
| `provider/dashboard` | 去掉评级相关展示 |

---

## 10. 管理员审核列表增强

管理员后台各审核页面需展示完整的申请信息：

| 审核类型 | 展示字段 |
|---------|---------|
| 商家入驻审核 | 名称、类型、电话、头像、背景图、简介、标签、代表作品 |
| 头像/背景修改审核 | **新旧图对比**、申请人名称、申请时间 |
| 商家注销审核 | 商家名称、类型、订单总数（含未完成数）、申请时间 |
| 套餐审核 | 图标、名称、价格、时长、描述 |

### 新增管理员页面/云函数

- 新增云函数 `getPendingAvatarUpdates` — 获取待审核的头像/背景图修改列表
- 新增云函数 `getPendingDeregistrations` — 获取待审核的注销申请列表
- 管理员 dashboard 增加对应的入口

---

## 11. 全局检查清单

实现完成后逐项验证：

- [ ] 普通用户：首页浏览、分类筛选、商家详情、预约流程、订单管理
- [ ] 商家：首页展示（新 UI）、功能页（仪表盘+订单）、头像/背景修改申请
- [ ] 商家：入驻流程（头像+背景分离上传）
- [ ] 商家：删除作品、注销身份申请
- [ ] 管理员：审核入驻、审核头像/背景修改、审核注销
- [ ] 管理员：审核列表展示完整信息
- [ ] 用户：退出登录、角色切换
- [ ] 订单：编号中文化、状态中文化、商家注销后订单标记显示
- [ ] 评级系统相关：所有页面无残留的 level/rating 引用
- [ ] 套餐图标：上传、展示

---

## 数据库变更汇总

### `providers` 集合

| 操作 | 字段 |
|------|------|
| 新增 | `backgroundImage` (String) |
| 新增 | `pendingAvatar` (String, nullable) |
| 新增 | `pendingBackgroundImage` (String, nullable) |
| 新增 status 值 | `pending_deregister` |
| 删除 | `level`, `levelName`, `rating`, `reviewCount` |

### `serviceItems` 集合

| 操作 | 字段 |
|------|------|
| 新增 | `icon` (String) |

### `orders` 集合

| 操作 | 字段 |
|------|------|
| 新增 | `providerDeleted` (Boolean) |
| 新增 | `providerNameSnapshot` (String) |

---

## 新增云函数清单

| 云函数 | 用途 |
|--------|------|
| `requestAvatarUpdate` | 商家提交头像/背景图修改申请 |
| `approveAvatarUpdate` | 管理员审核头像/背景图修改 |
| `requestDeregister` | 商家申请注销身份 |
| `approveDeregister` | 管理员审核注销申请 |
| `deletePortfolio` | 商家删除作品 |
| `getPendingAvatarUpdates` | 获取待审核头像/背景图修改列表 |
| `getPendingDeregistrations` | 获取待审核注销列表 |

## 删除云函数

| 云函数 | 原因 |
|--------|------|
| `updateProviderLevel` | 评级系统删除 |

---

## 前端页面变更清单

| 页面/组件 | 变更 |
|-----------|------|
| `app.json` | Tab "订单" → "功能" |
| `index/index` | 商家模式重新渲染为 serviceDetail 风格 |
| `orderList/index` | 商家模式增加仪表盘 + 快捷入口 |
| `profile/index` | 增加"退出登录"、"注销商家身份"按钮 |
| `provider/register` | 头像+背景图分离上传 |
| `provider/editProfile` | 增加头像、背景图字段（如有编辑资料） |
| `provider/myWorks` | 增加删除按钮 |
| `provider/editServiceItem` | 增加套餐图标上传 |
| `serviceDetail/index` | 去掉等级评级展示、套餐图标 |
| `admin/dashboard` | 新增头像/背景审核、注销审核入口 |
| `admin/providers` | 审核列表展示完整信息 |
