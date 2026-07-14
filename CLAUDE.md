# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

文旅摄影预约微信小程序 — 摄影师/妆造师/汉服店 O2O 预约平台。前端原生微信小程序 + 后端微信云开发。目录 `D:\gongsi\wenlv`。

## 开发环境

- 微信开发者工具打开项目根目录 `D:\gongsi\wenlv`
- 云环境 ID: `cloud1-d1gv9n7j56c0a3448`（配置在 `miniprogram/app.js` 和 `cloudbaserc.js`）
- AppID: `wxce7801ec430c768e`
- 云函数部署：右键云函数文件夹 →「创建并部署：云端安装依赖（不上传 node_modules）」
- 测试数据：云开发控制台 → 云函数 → `initTestData` → 测试
- 模拟支付：下单后选「模拟支付(测试模式)」，调用 `mockPay` 云函数，跳过真实微信支付

## 架构

```
miniprogram/              前端
  services/cloud.js       云函数统一调用封装 (callFunction)
  services/userService.js 用户相关
  services/serviceService.js 服务商/作品
  services/orderService.js 订单/支付/评价/互动

cloudfunctions/           后端 (44个云函数)
  无外部API，全部使用 wx-server-sdk 操作云数据库
```

## 角色与身份系统

4种角色存储在 `users.roles[]` 数组中，一个用户可有多身份。`activeRole` 控制当前视角。

```
user (普通用户) → 浏览/预约/评价
photographer (摄影师) → 商家后台，有 1-5 星等级
makeup (妆造师) → 商家后台，有 1-5 星等级
hanfu_shop (汉服店) → 商家后台，无等级
admin (管理员) → 在 DB 中手动添加 roles:["user","admin"]，审核所有业务
```

3个 TabBar 页面（`index`, `orderList`, `profile`）按 `activeRole` 切换显示内容：用户模式(浏览预约) vs 商家模式(仪表盘/接单管理)。

## 订单状态机

```
pending_pay → paid → confirmed → in_progress → completed → reviewed
    ↓           ↓         ↓             ↓
cancelled   pending_refund(管理员审批通过后→cancelled)
```

- 用户取消：<24h 全额退，<0h(过期)不可取消，其余退50%；退款需管理员 `approveRefund` 审批
- 商家操作：`providerHandleOrder` (confirm/start/complete)；拒绝时自动标记退款

## 数据库集合 (10个)

`users`, `providers`, `serviceItems`, `orders`, `payments`, `portfolios`, `reviews`, `favorites`, `likes`, `categories`, `timeSlots`

- 金额单位：**分**（price/priceUtil.js 提供 fenToYuan/formatPrice）
- 审核状态：`pending_review` → `approved`/`rejected`；套餐和服务商都需审核
- `orders.items[]` 是数组，支持一次下单多个服务项（组合套餐）

## 关键设计模式

- 页面文件用 Bash `cat > file << 'ENDOFFILE'` 创建（Write 工具对新文件需先用 Bash 建）
- 所有云函数统一返回 `{ code: 0, data: ..., message: "..." }`；code≠0 为错误
- 云函数通过 `wxContext.OPENID` 获取用户身份，商家云函数查 `providers` 表确认身份
- 前端 services 层封装所有云函数调用，页面不直接调 `wx.cloud.callFunction`
- WXML 不支持 JS 函数调用，角色图标/标签需在 JS 中预计算为数据字段（见 `profile/index.js` 的 `roleList`）
- 测试数据中图片字段为空，页面用 `wx:if/wx:else` 显示 emoji 占位

## TabBar 图标

`miniprogram/images/tab-*.png` 是 Python 生成的简单形状 PNG。如需替换：6个文件，未选中灰色 #999，选中暖色 #C48B5C，建议 81x81。
