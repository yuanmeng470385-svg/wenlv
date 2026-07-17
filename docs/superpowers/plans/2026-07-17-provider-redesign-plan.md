# 商家系统改造实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对商家系统全面改造：Tab 栏重构、商家首页改版、头像/背景图管理（审核流）、注销身份、退出登录、删除作品、套餐图标、订单中文化、删除评级系统、管理员视图增强。

**Architecture:** 原生微信小程序 + 微信云开发（云函数 + 云数据库）。遵循现有 `{ code: 0, data: ..., message: "..." }` 返回格式。前端 services 层封装云函数调用。

**Tech Stack:** 微信小程序原生框架、wx-server-sdk、云数据库

## Global Constraints

- 云环境 ID: `cloud1-d1gv9n7j56c0a3448`
- 所有云函数返回 `{ code: 0, data: ..., message: "..." }`，code≠0 为错误
- 金额单位：分
- WXML 不支持 JS 函数调用，动态数据在 JS 中预计算
- 商家云函数通过 `providers` 表查 `userId === openid` 确认身份
- 管理员云函数通过 `users.roles` 包含 `admin` 确认权限

---

## Phase 1: 基础清理

### Task 1: TabBar 文本变更 + 删除评级系统

**Files:**
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/pages/index/index.wxml`
- Modify: `miniprogram/pages/index/index.js`
- Modify: `miniprogram/pages/index/index.wxss`
- Modify: `miniprogram/pages/serviceDetail/index.wxml`
- Modify: `miniprogram/pages/serviceDetail/index.wxss`
- Modify: `cloudfunctions/applyProvider/index.js`
- Modify: `cloudfunctions/approveProvider/index.js`
- Delete: `cloudfunctions/updateProviderLevel/` (整个目录)
- Modify: `cloudfunctions/getProviderDashboard/index.js`
- Modify: `cloudfunctions/getProviderDetail/index.js`

**Interfaces:**
- Produces: `providers` 表不再含 `level/levelName/rating/reviewCount`；Tab "订单"→"功能"；前端无评级展示

- [ ] **Step 1: 修改 `app.json` Tab 文案**

```diff
- "text": "订单",
+ "text": "功能",
```

- [ ] **Step 2: 修改 `applyProvider/index.js`** — 去掉 `level/levelName/rating/reviewCount` 初始化

```javascript
// 第55-70行附近，providers.add data 改为：
data: {
  userId: openid,
  categoryType,
  name,
  city: city || '',
  phone,
  description: description || '',
  featureTags: featureTags || [],
  coverImages: coverImages || [],
  avatar: '',
  backgroundImage: '',
  status: 'pending_review',
  isOpen: true,
  createTime: db.serverDate(),
  updateTime: db.serverDate(),
}
```

- [ ] **Step 3: 修改 `approveProvider/index.js`** — 删掉 `LEVEL_MAP` 和等级设置逻辑

```javascript
// 删掉第4行: const LEVEL_MAP = ...
// 第40-57行，"通过"分支简化为：
await db.collection('providers').doc(providerId).update({
  data: { status: 'active', updateTime: db.serverDate() }
});
// 第51行审计日志去掉 level：{ adminOpenid: openid, action: 'approveProvider', targetId: providerId, detail: {}, createTime: db.serverDate() }
// 第54-57行通知文案改为：
const catName = provider.categoryType === 'photographer' ? '摄影师' : provider.categoryType === 'makeup' ? '妆造师' : '汉服店';
await db.collection('notifications').add({ data: { userId: provider.userId, type: 'provider_approved', title: '申请已通过', content: `您的${catName}申请已通过审核`, relatedId: providerId, read: false, createTime: db.serverDate() } }).catch(() => {});
```

- [ ] **Step 4: 修改 `getProviderDashboard/index.js`** — 去掉 level/rating 返回

```javascript
// return 中删掉 providerLevel 和 providerLevelNum 字段，stats.rating 改为 0 或去掉
return {
  code: 0,
  data: {
    stats: {
      todayOrders: todayOrders.total,
      pendingOrders: pendingOrders.total,
      totalOrders: provider.orderCount || 0,
      totalRevenue,
      completedCount,
    },
    recentOrders: recentOrders.data,
    providerName: provider.name,
  },
  message: 'success',
};
```

- [ ] **Step 5: 修改 `getProviderDetail/index.js`** — 返回 `backgroundImage`

```javascript
// provider 对象不再做 maskPhone（保留 phone 脱敏），确认返回 backgroundImage 字段
// 不需要额外修改，providers 文档查询已包含所有字段
```

- [ ] **Step 6: 修改 `index/index.wxml` 用户模式** — 去掉等级和评分

```xml
<!-- 热门推荐卡片中 (第31-33行)，去掉 level tag 和 rating 行 -->
<view class="flex-row"><text class="text-bold text-ellipsis p-name">{{item.name}}</text></view>
<text class="text-sm text-secondary text-ellipsis mt-10">{{item.description}}</text>
```

- [ ] **Step 7: 修改 `index/index.wxml` 商家模式** — 去掉等级展示

```xml
<!-- 第46-50行身份条简化为 -->
<view class="dash-header">
  <text class="text-lg">👋 {{providerName}}</text>
</view>
```

- [ ] **Step 8: 修改 `serviceDetail/index.wxml`** — 去掉等级标签和评分

```xml
<!-- 第12-19行 p-info 区域改为： -->
<view class="p-info p-30">
  <view class="flex-row">
    <image class="p-avatar" src="{{provider.avatar}}" mode="aspectFill" />
    <view class="flex-1 ml-20">
      <view class="flex-row">
        <text class="text-xl text-bold">{{provider.name}}</text>
      </view>
    </view>
    <view class="fav-btn" bindtap="onToggleFavorite">
      <text class="fav-icon">{{isFavorited ? '❤️' : '🤍'}}</text>
    </view>
  </view>
  <view wx:if="{{provider.featureTags}}" class="tag-row mt-20">
    <text wx:for="{{provider.featureTags}}" wx:key="*this" class="feature-tag">{{item}}</text>
  </view>
</view>
```

- [ ] **Step 9: 修改 `serviceDetail/index.wxss`** — 删除等级样式

```css
/* 删除 .level-tag, .level-1 到 .level-5 的样式 (第9-10行) */
```

- [ ] **Step 10: 修改 `index/index.wxss`** — 删除等级样式（如有类似定义）

检查并删除 `.level-tag` / `.level-1`~`.level-5`。

- [ ] **Step 11: 删除云函数 `updateProviderLevel` 整个目录**

```bash
rm -rf cloudfunctions/updateProviderLevel/
```

- [ ] **Step 12: 提交**

```bash
git add -A
git commit -m "feat: Tab改名'功能' + 删除商家评级系统"
```

---

## Phase 2: 云函数变更

### Task 2: 入驻表单头像+背景图分离 (后端)

**Files:**
- Modify: `cloudfunctions/applyProvider/index.js`

**Interfaces:**
- Consumes: `avatar` (String, 必填), `backgroundImage` (String, 必填) — 新增参数
- Produces: providers 文档含 avatar 和 backgroundImage 字段

- [ ] **Step 1: 修改 `applyProvider/index.js` 参数校验和写入**

```javascript
// event 解构新增 avatar, backgroundImage
const { categoryType, name, city, phone, description, featureTags, coverImages, portfolioImages, avatar, backgroundImage } = event;

// 校验新增
if (!avatar || !backgroundImage) {
  return { code: 1001, message: '请上传头像和背景图' };
}

// providers.add data 中：
avatar: avatar || '',
backgroundImage: backgroundImage || '',
// 移除 coverImages 字段（不再使用旧封面图）
```

- [ ] **Step 2: 提交**

```bash
git add cloudfunctions/applyProvider/index.js
git commit -m "feat: 入驻申请支持独立头像和背景图"
```

### Task 3: 套餐图标 (后端)

**Files:**
- Modify: `cloudfunctions/saveServiceItem/index.js`

**Interfaces:**
- Consumes: `icon` (String, fileID) — 新增参数
- Produces: serviceItems 文档含 icon 字段

- [ ] **Step 1: 修改 `saveServiceItem/index.js`**

```javascript
// event 解构新增 icon
const { ..., icon } = event;

// data 对象新增
const data = {
  ...
  icon: icon || '',
  ...
};
```

- [ ] **Step 2: 提交**

```bash
git add cloudfunctions/saveServiceItem/index.js
git commit -m "feat: 套餐支持图标字段"
```

### Task 4: 删除作品云函数

**Files:**
- Create: `cloudfunctions/deletePortfolio/index.js`
- Create: `cloudfunctions/deletePortfolio/package.json`

**Interfaces:**
- Produces: `deletePortfolio({ portfolioId })` → 删除 portfolios 文档 + 云存储文件

- [ ] **Step 1: 创建 `deletePortfolio/package.json`**

```json
{
  "name": "deletePortfolio",
  "version": "1.0.0",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: 创建 `deletePortfolio/index.js`**

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { portfolioId } = event;
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    if (!portfolioId) return { code: 1001, message: '请提供作品ID' };

    // 查询作品确认所有权
    const portfolioRes = await db.collection('portfolios').doc(portfolioId).get();
    if (!portfolioRes.data) return { code: 1003, message: '作品不存在' };
    const portfolio = portfolioRes.data;

    // 确认是作品所属商家
    const providerRes = await db.collection('providers')
      .where({ userId: openid, _id: portfolio.providerId }).get();
    if (providerRes.data.length === 0) {
      return { code: 1002, message: '无权删除此作品' };
    }

    // 删除云存储中的图片
    if (portfolio.images && portfolio.images.length > 0) {
      await cloud.deleteFile({ fileList: portfolio.images }).catch(() => {});
    }

    // 删除文档
    await db.collection('portfolios').doc(portfolioId).remove();

    return { code: 0, message: '已删除' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
```

- [ ] **Step 3: 提交**

```bash
git add cloudfunctions/deletePortfolio/
git commit -m "feat: 删除作品云函数"
```

### Task 5: 头像/背景图修改审核云函数

**Files:**
- Create: `cloudfunctions/requestAvatarUpdate/index.js`
- Create: `cloudfunctions/requestAvatarUpdate/package.json`
- Create: `cloudfunctions/approveAvatarUpdate/index.js`
- Create: `cloudfunctions/approveAvatarUpdate/package.json`

**Interfaces:**
- `requestAvatarUpdate({ field: 'avatar'|'backgroundImage', fileID })` — 商家提交修改申请
- `approveAvatarUpdate({ providerId, field: 'avatar'|'backgroundImage', action: 'approve'|'reject' })` — 管理员审核

- [ ] **Step 1: 创建 `requestAvatarUpdate/package.json`**

```json
{ "name": "requestAvatarUpdate", "version": "1.0.0", "dependencies": { "wx-server-sdk": "latest" } }
```

- [ ] **Step 2: 创建 `requestAvatarUpdate/index.js`**

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { field, fileID } = event;

  try {
    if (!['avatar', 'backgroundImage'].includes(field)) {
      return { code: 1001, message: '无效的更新类型' };
    }
    if (!fileID) return { code: 1001, message: '请上传图片' };

    const providerRes = await db.collection('providers')
      .where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) {
      return { code: 1003, message: '您还不是服务商' };
    }
    const provider = providerRes.data[0];

    // 检查是否已有待审核的同类申请
    const pendingKey = field === 'avatar' ? 'pendingAvatar' : 'pendingBackgroundImage';
    if (provider[pendingKey]) {
      return { code: 2001, message: '您已有待审核的申请，请等待管理员处理' };
    }

    await db.collection('providers').doc(provider._id).update({
      data: { [pendingKey]: fileID, updateTime: db.serverDate() }
    });

    const label = field === 'avatar' ? '头像' : '背景图';
    // 通知所有管理员
    const admins = await db.collection('users').where({ roles: db.command.all(['admin']) }).get();
    for (const admin of admins.data) {
      await db.collection('notifications').add({
        data: {
          userId: admin._openid,
          type: 'avatar_update_request',
          title: `${label}修改申请`,
          content: `${provider.name} 申请修改${label}`,
          relatedId: provider._id,
          read: false,
          createTime: db.serverDate(),
        }
      }).catch(() => {});
    }

    return { code: 0, message: '已提交审核，请等待管理员处理' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
```

- [ ] **Step 3: 创建 `approveAvatarUpdate/package.json`**

```json
{ "name": "approveAvatarUpdate", "version": "1.0.0", "dependencies": { "wx-server-sdk": "latest" } }
```

- [ ] **Step 4: 创建 `approveAvatarUpdate/index.js`**

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    const admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(admin.data[0] && (admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }

    const { providerId, field, action } = event;
    if (!providerId || !field || !action) {
      return { code: 1001, message: '参数不完整' };
    }
    if (!['avatar', 'backgroundImage'].includes(field)) {
      return { code: 1001, message: '无效的类型' };
    }

    const providerRes = await db.collection('providers').doc(providerId).get();
    if (!providerRes.data) return { code: 1003, message: '服务商不存在' };
    const provider = providerRes.data;

    const pendingKey = field === 'avatar' ? 'pendingAvatar' : 'pendingBackgroundImage';
    const pendingValue = provider[pendingKey];
    if (!pendingValue) return { code: 2001, message: '没有待审核的申请' };

    const label = field === 'avatar' ? '头像' : '背景图';

    if (action === 'approve') {
      const updateData = { [field]: pendingValue, [pendingKey]: null, updateTime: db.serverDate() };
      await db.collection('providers').doc(providerId).update({ data: updateData });
    } else if (action === 'reject') {
      await db.collection('providers').doc(providerId).update({
        data: { [pendingKey]: null, updateTime: db.serverDate() }
      });
    } else {
      return { code: 1001, message: '无效的操作' };
    }

    // 通知商家
    if (provider.userId) {
      const statusText = action === 'approve' ? '已通过' : '已拒绝';
      await db.collection('notifications').add({
        data: {
          userId: provider.userId,
          type: 'avatar_update_result',
          title: `${label}修改${statusText}`,
          content: `您的${label}修改申请${statusText}`,
          relatedId: providerId,
          read: false,
          createTime: db.serverDate(),
        }
      }).catch(() => {});
    }

    return { code: 0, message: action === 'approve' ? '已通过' : '已拒绝' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
```

- [ ] **Step 5: 提交**

```bash
git add cloudfunctions/requestAvatarUpdate/ cloudfunctions/approveAvatarUpdate/
git commit -m "feat: 头像/背景图修改审核云函数"
```

### Task 6: 商家注销审核云函数

**Files:**
- Create: `cloudfunctions/requestDeregister/index.js`
- Create: `cloudfunctions/requestDeregister/package.json`
- Create: `cloudfunctions/approveDeregister/index.js`
- Create: `cloudfunctions/approveDeregister/package.json`

**Interfaces:**
- `requestDeregister()` — 商家申请注销
- `approveDeregister({ providerId, action: 'approve'|'reject' })` — 管理员审核

- [ ] **Step 1: 创建 `requestDeregister/package.json`**

```json
{ "name": "requestDeregister", "version": "1.0.0", "dependencies": { "wx-server-sdk": "latest" } }
```

- [ ] **Step 2: 创建 `requestDeregister/index.js`**

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    const providerRes = await db.collection('providers')
      .where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) {
      return { code: 1003, message: '您还不是服务商' };
    }
    const provider = providerRes.data[0];

    // 检查未完成订单
    const unfinishedOrders = await db.collection('orders')
      .where({
        'items.providerId': provider._id,
        orderStatus: db.command.nin(['completed', 'reviewed', 'cancelled']),
      }).count();
    if (unfinishedOrders.total > 0) {
      return { code: 2001, message: '您有未完成的订单，暂无法注销' };
    }

    await db.collection('providers').doc(provider._id).update({
      data: { status: 'pending_deregister', updateTime: db.serverDate() }
    });

    // 通知管理员
    const admins = await db.collection('users').where({ roles: db.command.all(['admin']) }).get();
    for (const admin of admins.data) {
      await db.collection('notifications').add({
        data: {
          userId: admin._openid,
          type: 'deregister_request',
          title: '商家注销申请',
          content: `${provider.name} 申请注销商家身份`,
          relatedId: provider._id,
          read: false,
          createTime: db.serverDate(),
        }
      }).catch(() => {});
    }

    return { code: 0, message: '注销申请已提交，等待管理员审核' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
```

- [ ] **Step 3: 创建 `approveDeregister/package.json`**

```json
{ "name": "approveDeregister", "version": "1.0.0", "dependencies": { "wx-server-sdk": "latest" } }
```

- [ ] **Step 4: 创建 `approveDeregister/index.js`**

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    const admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(admin.data[0] && (admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }

    const { providerId, action } = event;
    if (!providerId || !action) return { code: 1001, message: '参数不完整' };

    const providerRes = await db.collection('providers').doc(providerId).get();
    if (!providerRes.data) return { code: 1003, message: '服务商不存在' };
    const provider = providerRes.data;

    if (action === 'reject') {
      await db.collection('providers').doc(providerId).update({
        data: { status: 'active', updateTime: db.serverDate() }
      });
      if (provider.userId) {
        await db.collection('notifications').add({
          data: {
            userId: provider.userId, type: 'deregister_result',
            title: '注销申请被拒绝', content: '您的注销申请已被管理员拒绝',
            relatedId: providerId, read: false, createTime: db.serverDate(),
          }
        }).catch(() => {});
      }
      return { code: 0, message: '已拒绝' };
    }

    if (action !== 'approve') return { code: 1001, message: '无效操作' };

    // 级联删除
    await db.collection('portfolios').where({ providerId }).remove();
    await db.collection('serviceItems').where({ providerId }).remove();
    await db.collection('reviews').where({ providerId }).remove();

    // 标记订单
    const orderRes = await db.collection('orders')
      .where({ 'items.providerId': providerId }).get();
    for (const order of orderRes.data) {
      const items = (order.items || []).map(item => {
        if (item.providerId === providerId) {
          return { ...item, providerDeleted: true, providerNameSnapshot: provider.name };
        }
        return item;
      });
      await db.collection('orders').doc(order._id).update({
        data: { items, updateTime: db.serverDate() }
      });
    }

    // 删除 provider 文档
    await db.collection('providers').doc(providerId).remove();

    // 移除用户角色
    if (provider.userId && provider.categoryType) {
      const userRes = await db.collection('users').where({ _openid: provider.userId }).get();
      if (userRes.data.length > 0) {
        const user = userRes.data[0];
        const roles = (user.roles || []).filter(r => r !== provider.categoryType);
        await db.collection('users').doc(user._id).update({ data: { roles, updateTime: db.serverDate() } });
      }
    }

    // 通知用户
    if (provider.userId) {
      await db.collection('notifications').add({
        data: {
          userId: provider.userId, type: 'deregister_result',
          title: '商家已注销', content: `您的${provider.name}商家身份已注销`,
          relatedId: providerId, read: false, createTime: db.serverDate(),
        }
      }).catch(() => {});
    }

    return { code: 0, message: '商家已注销' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
```

- [ ] **Step 5: 提交**

```bash
git add cloudfunctions/requestDeregister/ cloudfunctions/approveDeregister/
git commit -m "feat: 商家注销审核云函数"
```

---

## Phase 3: 前端页面改造

### Task 7: 入驻表单改造 — 头像+背景图分离

**Files:**
- Modify: `miniprogram/pages/provider/register.wxml`
- Modify: `miniprogram/pages/provider/register.js`

**Interfaces:**
- Consumes: 云存储上传 `uploadFile`
- Produces: 调 `applyProvider` 时传 `avatar` + `backgroundImage`

- [ ] **Step 1: 修改 `register.wxml`** — 替换封面图区域

```xml
<!-- 替换第37-47行封面图区域为： -->
<view class="upload-section card">
  <text class="text-bold">商家头像（1张，必填）</text>
  <view class="upload-grid mt-20">
    <view wx:if="{{avatar}}" class="upload-item">
      <image src="{{avatar}}" mode="aspectFill" />
    </view>
    <view wx:else class="upload-btn" bindtap="onUploadAvatar">
      <text class="text-xl text-hint">+</text>
    </view>
  </view>
</view>

<view class="upload-section card">
  <text class="text-bold">背景图（1张，必填，建议750×400）</text>
  <view class="upload-grid mt-20">
    <view wx:if="{{backgroundImage}}" class="upload-item">
      <image src="{{backgroundImage}}" mode="aspectFill" />
    </view>
    <view wx:else class="upload-btn" bindtap="onUploadBackground">
      <text class="text-xl text-hint">+</text>
    </view>
  </view>
</view>
```

- [ ] **Step 2: 修改 `register.js`** — 拆分上传逻辑

```javascript
// data 中新增：
avatar: '',
backgroundImage: '',

// 替换 onUploadCover 为两个方法：
async onUploadAvatar() {
  const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] });
  wx.showLoading({ title: '上传中...' });
  const cloudPath = `providers/avatars/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const fileID = await uploadFile(cloudPath, res.tempFilePaths[0]);
  this.setData({ avatar: fileID });
  wx.hideLoading();
},

async onUploadBackground() {
  const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] });
  wx.showLoading({ title: '上传中...' });
  const cloudPath = `providers/backgrounds/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const fileID = await uploadFile(cloudPath, res.tempFilePaths[0]);
  this.setData({ backgroundImage: fileID });
  wx.hideLoading();
},

// onSubmit 中 applyProvider 参数改为：
await applyProvider({
  categoryType: this.data.categoryType,
  name: this.data.name, city: this.data.city,
  phone: this.data.phone,
  description: this.data.description,
  featureTags: this.data.featureTags.split(',').map(t => t.trim()).filter(Boolean),
  avatar: this.data.avatar,
  backgroundImage: this.data.backgroundImage,
  portfolioImages: this.data.portfolioImages,
});

// 校验新增：
if (!this.data.avatar || !this.data.backgroundImage) {
  wx.showToast({ title: '请上传头像和背景图', icon: 'none' }); return;
}
```

- [ ] **Step 3: 提交**

```bash
git add miniprogram/pages/provider/register.*
git commit -m "feat: 入驻表单拆分头像和背景图上传"
```

### Task 8: 套餐图标上传

**Files:**
- Modify: `miniprogram/pages/provider/editServiceItem.wxml`
- Modify: `miniprogram/pages/provider/editServiceItem.js`

- [ ] **Step 1: 修改 `editServiceItem.wxml`** — 新增图标上传

```xml
<!-- 第1行 form-section 之前，增加： -->
<view class="upload-section card">
  <text class="text-bold">套餐图标（1张）</text>
  <view class="upload-grid mt-20">
    <view wx:if="{{icon}}" class="upload-item">
      <image src="{{icon}}" mode="aspectFill" />
    </view>
    <view wx:else class="upload-btn" bindtap="onUploadIcon">
      <text class="text-xl text-hint">+</text>
    </view>
  </view>
</view>
```

- [ ] **Step 2: 修改 `editServiceItem.js`** — 新增图标上传逻辑

```javascript
// data.form 新增：
icon: '',

// data 顶层新增：
icon: '',

// 新增方法：
async onUploadIcon() {
  const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] });
  wx.showLoading({ title: '上传中...' });
  const { uploadFile } = require('../../services/cloud');
  const cloudPath = `serviceItems/icons/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const fileID = await uploadFile(cloudPath, res.tempFilePaths[0]);
  this.setData({ icon: fileID });
  wx.hideLoading();
},

// onSubmit 的 callFunction 参数新增：
icon: this.data.icon || (this.data.isEdit ? undefined : ''),

// onLoad 编辑回填时新增：
icon: item.icon || '',
```

- [ ] **Step 3: 提交**

```bash
git add miniprogram/pages/provider/editServiceItem.*
git commit -m "feat: 套餐图标上传"
```

### Task 9: 商家首页改造 (`index` 页商家模式)

**Files:**
- Modify: `miniprogram/pages/index/index.wxml`
- Modify: `miniprogram/pages/index/index.js`
- Modify: `miniprogram/pages/index/index.wxss`

**Interfaces:**
- Consumes: `getProviderDetail` (获取自己的商家详情), `requestAvatarUpdate` (修改头像/背景图申请)
- Produces: 商家模式渲染为 serviceDetail 风格，含编辑入口

- [ ] **Step 1: 重写 `index.wxml` 商家模式区块**

```xml
<!-- 商家模式 — 自己的店铺详情页 -->
<block wx:else>
<view class="page-detail" wx:if="{{provider}}">
  <!-- 背景图（可编辑） -->
  <view class="cover-section">
    <image class="cover-img" src="{{provider.backgroundImage}}" mode="aspectFill" />
    <view class="cover-edit-btn" bindtap="onEditBackground">
      <text class="edit-icon">✏️ 更换背景</text>
    </view>
  </view>

  <!-- 商家信息 -->
  <view class="p-info p-30">
    <view class="flex-row">
      <view class="avatar-wrap">
        <image class="p-avatar" src="{{provider.avatar}}" mode="aspectFill" />
        <view class="avatar-edit-btn" bindtap="onEditAvatar">
          <text class="edit-icon-sm">✏️</text>
        </view>
      </view>
      <view class="flex-1 ml-20">
        <text class="text-xl text-bold">{{provider.name}}</text>
      </view>
    </view>
    <view wx:if="{{provider.featureTags}}" class="tag-row mt-20">
      <text wx:for="{{provider.featureTags}}" wx:key="*this" class="feature-tag">{{item}}</text>
    </view>
  </view>

  <!-- Tab 切换 -->
  <view class="tab-bar">
    <view class="tab-item {{activeTab==='service'?'active':''}}" data-tab="service" bindtap="onTabChange"><text>服务项目</text></view>
    <view class="tab-item {{activeTab==='works'?'active':''}}" data-tab="works" bindtap="onTabChange"><text>作品展示</text></view>
    <view class="tab-item {{activeTab==='reviews'?'active':''}}" data-tab="reviews" bindtap="onTabChange"><text>用户评价</text></view>
  </view>

  <!-- 服务项目 -->
  <view wx:if="{{activeTab==='service'}}" class="tab-content">
    <view wx:for="{{serviceItems}}" wx:key="_id" class="service-card card">
      <image wx:if="{{item.icon}}" class="s-cover" src="{{item.icon}}" mode="aspectFill" />
      <view wx:else class="s-cover s-cover-ph">{{item.categoryType === 'photographer' ? '📷' : (item.categoryType === 'makeup' ? '💄' : '👘')}}</view>
      <view class="s-info">
        <text class="text-lg text-bold">{{item.name}}</text>
        <text class="text-sm text-secondary mt-10">{{item.description}}</text>
        <view class="flex-between mt-10">
          <text class="text-price text-lg">¥{{item.price/100}}</text>
          <text class="text-sm text-secondary">时长 {{item.duration}}分钟</text>
        </view>
      </view>
    </view>
  </view>

  <!-- 作品展示 -->
  <view wx:if="{{activeTab==='works'}}" class="tab-content">
    <view class="work-grid">
      <view wx:for="{{portfolios}}" wx:key="_id" class="work-item">
        <image src="{{item.images[0]}}" mode="aspectFill" class="work-img" />
        <view class="work-overlay">
          <text class="work-title text-ellipsis">{{item.title}}</text>
          <text class="text-sm">❤️ {{item.likeCount || 0}}</text>
        </view>
      </view>
    </view>
  </view>

  <!-- 用户评价 -->
  <view wx:if="{{activeTab==='reviews'}}" class="tab-content">
    <view wx:for="{{reviews}}" wx:key="_id" class="review-card card">
      <view class="flex-between">
        <text class="text-sm text-price">⭐ {{item.rating}}</text>
        <text class="text-sm text-hint">{{item.createTime}}</text>
      </view>
      <text class="mt-10">{{item.content}}</text>
    </view>
  </view>
</view>
</block>
```

- [ ] **Step 2: 修改 `index.js`** — 商家模式下加载自己的详情

```javascript
// data 新增：
provider: null,
serviceItems: [],
portfolios: [],
reviews: [],
activeTab: 'service',

// loadData 商家分支改为：
const { getProviderDetail } = require('../../services/serviceService');
// 先获取自己的 providerId
const { callFunction } = require('../../services/cloud');
const myRes = await callFunction('getMyProvider');
if (myRes && myRes._id) {
  const detail = await getProviderDetail(myRes._id);
  this.setData({
    provider: detail.provider,
    serviceItems: detail.serviceItems || [],
    portfolios: detail.portfolios || [],
    reviews: detail.reviews || [],
    providerName: myRes.name || '',
  });
}

// 新增方法：
onTabChange(e) {
  this.setData({ activeTab: e.currentTarget.dataset.tab });
},

async onEditAvatar() {
  const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] });
  wx.showLoading({ title: '上传中...' });
  const { uploadFile, callFunction } = require('../../services/cloud');
  const cloudPath = `providers/avatars/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const fileID = await uploadFile(cloudPath, res.tempFilePaths[0]);
  wx.hideLoading();
  try {
    await callFunction('requestAvatarUpdate', { field: 'avatar', fileID });
    wx.showToast({ title: '已提交审核', icon: 'success' });
  } catch (err) {
    wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
  }
},

async onEditBackground() {
  const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] });
  wx.showLoading({ title: '上传中...' });
  const { uploadFile, callFunction } = require('../../services/cloud');
  const cloudPath = `providers/backgrounds/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const fileID = await uploadFile(cloudPath, res.tempFilePaths[0]);
  wx.hideLoading();
  try {
    await callFunction('requestAvatarUpdate', { field: 'backgroundImage', fileID });
    wx.showToast({ title: '已提交审核', icon: 'success' });
  } catch (err) {
    wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
  }
},

// 删除旧的快捷入口方法保留引用（功能Tab仍需要）：
goUploadWork, goMyWorks, goSchedule, goServiceItems, goEditProfile 保持不变
```

- [ ] **Step 3: 修改 `index.wxss`** — 添加商家首页样式

```css
/* 商家模式样式（复用 serviceDetail 样式 + 新增编辑相关） */
.page-detail { background: var(--bg-page); padding-bottom: 40rpx; }
.cover-section { width: 100%; height: 400rpx; position: relative; }
.cover-img { width: 100%; height: 100%; }
.cover-edit-btn { position: absolute; top: 16rpx; right: 16rpx; background: rgba(0,0,0,0.5); border-radius: 20rpx; padding: 8rpx 16rpx; }
.edit-icon { color: #fff; font-size: 24rpx; }
.p-info { background: var(--bg-white); }
.p-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; flex-shrink: 0; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar-edit-btn { position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.5); border-radius: 50%; width: 36rpx; height: 36rpx; display: flex; align-items: center; justify-content: center; }
.edit-icon-sm { color: #fff; font-size: 20rpx; }
.tag-row { display: flex; flex-wrap: wrap; gap: 10rpx; }
.feature-tag { padding: 6rpx 16rpx; font-size: 22rpx; border-radius: 8rpx; background: #FBF6F0; color: #C48B5C; }
.tab-bar { display: flex; background: var(--bg-white); margin-top: 20rpx; }
.tab-item { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: var(--text-secondary); border-bottom: 4rpx solid transparent; }
.tab-item.active { color: #C48B5C; border-bottom-color: #C48B5C; font-weight: 600; }
.tab-content { padding: 20rpx; }
.service-card { display: flex; margin: 0 0 16rpx; }
.s-cover { width: 160rpx; height: 160rpx; border-radius: 12rpx; margin-right: 20rpx; flex-shrink: 0; }
.s-cover-ph { background: var(--bg-page); display: flex; align-items: center; justify-content: center; font-size: 48rpx; }
.s-info { flex: 1; overflow: hidden; }
.work-grid { display: flex; flex-wrap: wrap; gap: 12rpx; }
.work-item { width: calc(50% - 6rpx); position: relative; border-radius: 12rpx; overflow: hidden; }
.work-img { width: 100%; height: 260rpx; }
.work-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 16rpx; background: linear-gradient(transparent, rgba(0,0,0,0.6)); color: #fff; }
.work-title { display: block; margin-bottom: 4rpx; }
.review-card { margin: 0 0 12rpx; }
```

- [ ] **Step 4: 提交**

```bash
git add miniprogram/pages/index/
git commit -m "feat: 商家首页改为店铺详情页风格"
```

### Task 10: 功能 Tab 改造 (`orderList` 商家模式)

**Files:**
- Modify: `miniprogram/pages/orderList/index.wxml`
- Modify: `miniprogram/pages/orderList/index.js`

- [ ] **Step 1: 修改 `orderList/index.wxml`** — 商家模式增加仪表盘

```xml
<!-- 第22行 <block wx:else> 之前，商家订单列表前面增加仪表盘区域： -->
<block wx:else>
  <!-- 仪表盘区域（仅商家） -->
  <view class="dash-top">
    <view class="stats-row">
      <view class="stat-card"><text class="stat-num">{{dashboard.todayOrders}}</text><text class="stat-label">今日预约</text></view>
      <view class="stat-card"><text class="stat-num highlight">{{dashboard.pendingOrders}}</text><text class="stat-label">待处理</text></view>
      <view class="stat-card"><text class="stat-num">{{dashboard.totalOrders}}</text><text class="stat-label">总订单</text></view>
    </view>
    <view class="quick-row">
      <view class="quick-item" bindtap="goUploadWork"><text class="quick-icon">📤</text><text class="quick-label">上传作品</text></view>
      <view class="quick-item" bindtap="goMyWorks"><text class="quick-icon">🖼️</text><text class="quick-label">作品管理</text></view>
      <view class="quick-item" bindtap="goServiceItems"><text class="quick-icon">📦</text><text class="quick-label">套餐管理</text></view>
      <view class="quick-item" bindtap="goSchedule"><text class="quick-icon">📅</text><text class="quick-label">档期管理</text></view>
      <view class="quick-item" bindtap="goEditProfile"><text class="quick-icon">✏️</text><text class="quick-label">编辑资料</text></view>
    </view>
  </view>

  <scroll-view class="tab-scroll" scroll-x>
    <!-- 状态筛选 Tab（保持原样） -->
  </scroll-view>

  <!-- 订单列表（保持原样） -->
  ...
```

- [ ] **Step 2: 修改 `orderList/index.js`** — 商家模式下加载仪表盘数据

```javascript
// data 新增：
dashboard: { todayOrders: 0, pendingOrders: 0, totalOrders: 0 },

// onShow 中，如果是商家模式，额外加载仪表盘：
onShow() {
  this.setData({ activeRole: app.getActiveRole(), page: 1, orders: [], hasMore: true });
  this.loadOrders();
  if (this.data.activeRole !== 'user') {
    this.loadDashboard();
  }
},

// 新增方法：
async loadDashboard() {
  try {
    const { callFunction } = require('../../services/cloud');
    const res = await callFunction('getProviderDashboard');
    this.setData({ dashboard: res.stats || this.data.dashboard });
  } catch (e) { /* ignore */ }
},

// 快捷入口方法（从 index.js 搬过来或直接 navigator）：
goUploadWork() { wx.navigateTo({ url: '/pages/provider/uploadWork' }); },
goMyWorks() { wx.navigateTo({ url: '/pages/provider/myWorks' }); },
goServiceItems() { wx.navigateTo({ url: '/pages/provider/serviceItems' }); },
goSchedule() { wx.navigateTo({ url: '/pages/provider/schedule' }); },
goEditProfile() { wx.navigateTo({ url: '/pages/provider/editProfile' }); },
```

- [ ] **Step 3: 提交**

```bash
git add miniprogram/pages/orderList/
git commit -m "feat: 功能Tab商家模式增加仪表盘和快捷入口"
```

### Task 11: Profile 页 — 退出登录 + 注销身份

**Files:**
- Modify: `miniprogram/pages/profile/index.wxml`
- Modify: `miniprogram/pages/profile/index.js`

- [ ] **Step 1: 修改 `profile/index.wxml`** — 商家模式增加注销按钮 + 底部退出登录

```xml
<!-- 在商家模式菜单底部 (第53行 </block> 前) 增加： -->
<view class="menu-card danger-card" bindtap="onDeregister">
  <view class="flex-between"><text>⚠️ 注销商家身份</text><text class="text-secondary">></text></view>
</view>

<!-- 在 </view> 最外层闭合前，增加退出登录按钮： -->
<view class="logout-section safe-bottom">
  <button class="logout-btn" bindtap="onLogout">退出登录</button>
</view>
```

- [ ] **Step 2: 修改 `profile/index.js`** — 新增方法

```javascript
onDeregister() {
  wx.showModal({
    title: '注销商家身份',
    content: '注销后将永久删除您的店铺及所有数据（作品、套餐、评价），且不可恢复。确定继续吗？',
    confirmText: '确定注销',
    confirmColor: '#E74C3C',
    success: async (res) => {
      if (!res.confirm) return;
      wx.showLoading({ title: '提交中...' });
      try {
        const { callFunction } = require('../../services/cloud');
        await callFunction('requestDeregister');
        wx.hideLoading();
        wx.showToast({ title: '已提交审核', icon: 'success' });
      } catch (err) {
        wx.hideLoading();
        wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
      }
    }
  });
},

onLogout() {
  wx.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        const app = getApp();
        app.globalData = {};
        wx.clearStorageSync();
        wx.reLaunch({ url: '/pages/index/index' });
      }
    }
  });
},
```

- [ ] **Step 3: 提交**

```bash
git add miniprogram/pages/profile/
git commit -m "feat: 退出登录 + 商家注销身份申请"
```

### Task 12: 管理员仪表盘 + 审核页面增强

**Files:**
- Modify: `miniprogram/pages/admin/dashboard.wxml`
- Modify: `miniprogram/pages/admin/dashboard.js`
- Modify: `miniprogram/pages/admin/providers.wxml`
- Modify: `miniprogram/pages/admin/providers.js`
- Create: `miniprogram/pages/admin/avatarUpdates.wxml`
- Create: `miniprogram/pages/admin/avatarUpdates.js`
- Create: `miniprogram/pages/admin/avatarUpdates.json`
- Create: `miniprogram/pages/admin/avatarUpdates.wxss`
- Create: `miniprogram/pages/admin/deregistrations.wxml`
- Create: `miniprogram/pages/admin/deregistrations.js`
- Create: `miniprogram/pages/admin/deregistrations.json`
- Create: `miniprogram/pages/admin/deregistrations.wxss`
- Modify: `cloudfunctions/getAdminDashboard/index.js`
- Create: `cloudfunctions/getPendingAvatarUpdates/index.js`
- Create: `cloudfunctions/getPendingAvatarUpdates/package.json`
- Create: `cloudfunctions/getPendingDeregistrations/index.js`
- Create: `cloudfunctions/getPendingDeregistrations/package.json`
- Modify: `miniprogram/app.json`

- [ ] **Step 1: 修改 `getAdminDashboard/index.js`** — 增加头像审核和注销计数

```javascript
// 在 Promise.all 中新增两项：
const [pendingProviders, pendingPortfolios, pendingServiceItems, pendingRefunds,
       pendingAvatars, pendingDeregistrations, totalOrders, totalUsers] = await Promise.all([
  // ... 原有 count + 新增：
  db.collection('providers').where(
    db.command.or([
      { pendingAvatar: db.command.neq(null) },
      { pendingBackgroundImage: db.command.neq(null) },
    ])
  ).count(),
  db.collection('providers').where({ status: 'pending_deregister' }).count(),
  ...
]);

// return data 新增：
pendingAvatarUpdates: pendingAvatars.total,
pendingDeregistrations: pendingDeregistrations.total,
```

- [ ] **Step 2: 创建 `getPendingAvatarUpdates/index.js`**

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const admin = await db.collection('users').where({ _openid: openid }).get();
  if (!(admin.data[0] && (admin.data[0].roles || []).includes('admin'))) {
    return { code: 1002, message: '无管理员权限' };
  }

  try {
    const res = await db.collection('providers').where(
      db.command.or([
        { pendingAvatar: db.command.neq(null) },
        { pendingBackgroundImage: db.command.neq(null) },
      ])
    ).get();

    const list = res.data.map(p => ({
      _id: p._id,
      name: p.name,
      categoryType: p.categoryType,
      phone: p.phone,
      avatar: p.avatar || '',
      backgroundImage: p.backgroundImage || '',
      pendingAvatar: p.pendingAvatar || null,
      pendingBackgroundImage: p.pendingBackgroundImage || null,
      updateTime: p.updateTime,
    }));

    return { code: 0, data: { list }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
```

- [ ] **Step 3: 创建 `getPendingDeregistrations/index.js`**

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const admin = await db.collection('users').where({ _openid: openid }).get();
  if (!(admin.data[0] && (admin.data[0].roles || []).includes('admin'))) {
    return { code: 1002, message: '无管理员权限' };
  }

  try {
    const res = await db.collection('providers')
      .where({ status: 'pending_deregister' }).get();

    const list = [];
    for (const p of res.data) {
      const totalOrders = await db.collection('orders')
        .where({ 'items.providerId': p._id }).count();
      const unfinishedOrders = await db.collection('orders')
        .where({
          'items.providerId': p._id,
          orderStatus: db.command.nin(['completed', 'reviewed', 'cancelled']),
        }).count();
      list.push({
        _id: p._id,
        name: p.name,
        categoryType: p.categoryType,
        phone: p.phone,
        totalOrders: totalOrders.total,
        unfinishedOrders: unfinishedOrders.total,
        updateTime: p.updateTime,
      });
    }

    return { code: 0, data: { list }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
```

- [ ] **Step 4: 修改 `admin/dashboard.wxml`** — 增加审核入口

```xml
<!-- 第15-16行退款审核之后，增加： -->
<view class="stat-card warn" bindtap="goAvatarUpdates">
  <text class="stat-num">{{stats.pendingAvatarUpdates||0}}</text><text class="stat-label">待审头像/背景</text>
</view>
<view class="stat-card warn" bindtap="goDeregistrations">
  <text class="stat-num">{{stats.pendingDeregistrations||0}}</text><text class="stat-label">待审注销</text>
</view>

<!-- 菜单区域增加： -->
<view class="menu-item flex-between" bindtap="goAvatarUpdates"><text>🖼️ 头像/背景图修改审核</text><text class="text-secondary">></text></view>
<view class="menu-item flex-between" bindtap="goDeregistrations"><text>⚠️ 商家注销审核</text><text class="text-secondary">></text></view>
```

- [ ] **Step 5: 修改 `admin/dashboard.js`** — 跳转方法

```javascript
goAvatarUpdates() { wx.navigateTo({ url: '/pages/admin/avatarUpdates' }); },
goDeregistrations() { wx.navigateTo({ url: '/pages/admin/deregistrations' }); },
```

- [ ] **Step 6: 创建 `admin/avatarUpdates` 页面**（wxml + js + json + wxss）

**avatarUpdates.wxml:**
```xml
<view class="page-review">
  <view wx:if="{{!list.length}}" class="empty-hint"><text class="text-secondary">暂无待审核申请</text></view>
  <view wx:for="{{list}}" wx:key="_id" class="review-card card">
    <text class="text-bold text-lg">{{item.name}}</text>
    <text class="text-sm text-secondary">{{item.categoryType === 'photographer' ? '摄影师' : (item.categoryType === 'makeup' ? '妆造师' : '汉服店')}}</text>

    <view wx:if="{{item.pendingAvatar}}" class="mt-20">
      <text class="text-sm text-bold">申请更换头像</text>
      <view class="img-compare">
        <view class="img-col"><text class="text-sm text-hint">当前</text>
          <image wx:if="{{item.avatar}}" src="{{item.avatar}}" mode="aspectFill" class="review-img" data-url="{{item.avatar}}" bindtap="previewImage" />
          <text wx:else class="text-sm text-hint">无</text>
        </view>
        <view class="img-col"><text class="text-sm text-hint">新头像</text>
          <image src="{{item.pendingAvatar}}" mode="aspectFill" class="review-img" data-url="{{item.pendingAvatar}}" bindtap="previewImage" />
        </view>
      </view>
      <view class="action-btns mt-20">
        <button class="btn-reject" data-id="{{item._id}}" data-field="avatar" bindtap="onReject">拒绝</button>
        <button class="btn-pass" data-id="{{item._id}}" data-field="avatar" bindtap="onApprove">通过</button>
      </view>
    </view>

    <view wx:if="{{item.pendingBackgroundImage}}" class="mt-20">
      <text class="text-sm text-bold">申请更换背景图</text>
      <view class="img-compare">
        <view class="img-col"><text class="text-sm text-hint">当前</text>
          <image wx:if="{{item.backgroundImage}}" src="{{item.backgroundImage}}" mode="aspectFill" class="review-img" data-url="{{item.backgroundImage}}" bindtap="previewImage" />
          <text wx:else class="text-sm text-hint">无</text>
        </view>
        <view class="img-col"><text class="text-sm text-hint">新背景图</text>
          <image src="{{item.pendingBackgroundImage}}" mode="aspectFill" class="review-img" data-url="{{item.pendingBackgroundImage}}" bindtap="previewImage" />
        </view>
      </view>
      <view class="action-btns mt-20">
        <button class="btn-reject" data-id="{{item._id}}" data-field="backgroundImage" bindtap="onReject">拒绝</button>
        <button class="btn-pass" data-id="{{item._id}}" data-field="backgroundImage" bindtap="onApprove">通过</button>
      </view>
    </view>
  </view>
</view>
```

**avatarUpdates.js:**
```javascript
Page({
  data: { list: [] },
  onShow() { this.loadList(); },
  async loadList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      const res = await callFunction('getPendingAvatarUpdates');
      this.setData({ list: res.list || [] });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { wx.hideLoading(); }
  },
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },
  async onApprove(e) {
    const { id, field } = e.currentTarget.dataset;
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('approveAvatarUpdate', { providerId: id, field, action: 'approve' });
      wx.showToast({ title: '已通过', icon: 'success' });
      this.loadList();
    } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },
  async onReject(e) {
    const { id, field } = e.currentTarget.dataset;
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('approveAvatarUpdate', { providerId: id, field, action: 'reject' });
      wx.showToast({ title: '已拒绝', icon: 'success' });
      this.loadList();
    } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },
});
```

**avatarUpdates.json:**
```json
{ "usingComponents": {}, "navigationBarTitleText": "头像/背景图审核" }
```

**avatarUpdates.wxss:**
```css
.page-review { padding: 20rpx; background: var(--bg-page); min-height: 100vh; }
.review-card { margin-bottom: 20rpx; }
.img-compare { display: flex; gap: 20rpx; }
.img-col { flex: 1; }
.review-img { width: 100%; height: 200rpx; border-radius: 12rpx; margin-top: 10rpx; }
.action-btns { display: flex; gap: 16rpx; justify-content: flex-end; }
.btn-reject { background: #f5f5f5; color: #999; border: 1rpx solid #ddd; font-size: 26rpx; padding: 12rpx 32rpx; border-radius: 8rpx; }
.btn-pass { background: #C48B5C; color: #fff; font-size: 26rpx; padding: 12rpx 32rpx; border-radius: 8rpx; }
```

- [ ] **Step 7: 创建 `admin/deregistrations` 页面**

**deregistrations.wxml:**
```xml
<view class="page-review">
  <view wx:if="{{!list.length}}" class="empty-hint"><text class="text-secondary">暂无待审核注销申请</text></view>
  <view wx:for="{{list}}" wx:key="_id" class="review-card card">
    <view class="flex-row">
      <text class="text-bold text-lg">{{item.name}}</text>
      <text class="text-sm text-secondary ml-10">
        {{item.categoryType === 'photographer' ? '摄影师' : (item.categoryType === 'makeup' ? '妆造师' : '汉服店')}}
      </text>
    </view>
    <view class="mt-10">
      <text class="text-sm text-secondary">📞 {{item.phone}}</text>
    </view>
    <view class="flex-between mt-10">
      <text class="text-sm text-secondary">总订单: {{item.totalOrders}}</text>
      <text class="text-sm" style="color: {{item.unfinishedOrders > 0 ? '#E74C3C' : '#52C41A'}}">
        未完成: {{item.unfinishedOrders}}
      </text>
    </view>
    <text class="text-sm text-hint mt-10">申请时间: {{item.updateTime}}</text>
    <view class="action-btns mt-20">
      <button class="btn-reject" data-id="{{item._id}}" bindtap="onReject">拒绝</button>
      <button class="btn-pass" data-id="{{item._id}}" bindtap="onApprove">同意注销</button>
    </view>
  </view>
</view>
```

**deregistrations.js:**
```javascript
Page({
  data: { list: [] },
  onShow() { this.loadList(); },
  async loadList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      const res = await callFunction('getPendingDeregistrations');
      this.setData({ list: res.list || [] });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { wx.hideLoading(); }
  },
  async onApprove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认注销', content: '将永久删除该商家所有数据，此操作不可撤销。',
      confirmText: '确认注销', confirmColor: '#E74C3C',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          const { callFunction } = require('../../services/cloud');
          await callFunction('approveDeregister', { providerId: id, action: 'approve' });
          wx.hideLoading();
          wx.showToast({ title: '已注销', icon: 'success' });
          this.loadList();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '操作失败', icon: 'none' });
        }
      }
    });
  },
  async onReject(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('approveDeregister', { providerId: id, action: 'reject' });
      wx.showToast({ title: '已拒绝', icon: 'success' });
      this.loadList();
    } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },
});
```

**deregistrations.json:**
```json
{ "usingComponents": {}, "navigationBarTitleText": "商家注销审核" }
```

**deregistrations.wxss:**
```css
.page-review { padding: 20rpx; background: var(--bg-page); min-height: 100vh; }
.review-card { margin-bottom: 20rpx; }
.action-btns { display: flex; gap: 16rpx; justify-content: flex-end; }
.btn-reject { background: #f5f5f5; color: #999; border: 1rpx solid #ddd; font-size: 26rpx; padding: 12rpx 32rpx; border-radius: 8rpx; }
.btn-pass { background: #E74C3C; color: #fff; font-size: 26rpx; padding: 12rpx 32rpx; border-radius: 8rpx; }
```

- [ ] **Step 8: 注册新页面到 `app.json`**

```json
"pages": [
  ...
  "pages/admin/avatarUpdates",
  "pages/admin/deregistrations",
  ...
]
```

- [ ] **Step 9: 修改 `admin/providers.wxml`** — 展示完整入驻信息（头像、背景图）

```xml
<!-- 在封面图区域 (第24行) 替换为显示头像和背景图： -->
<view class="mt-10">
  <text class="text-sm text-secondary">头像</text>
  <image wx:if="{{item.avatar}}" src="{{item.avatar}}" mode="aspectFill" class="review-img-sm" />
  <text wx:else class="text-sm text-hint">无</text>
</view>
<view class="mt-10">
  <text class="text-sm text-secondary">背景图</text>
  <image wx:if="{{item.backgroundImage}}" src="{{item.backgroundImage}}" mode="aspectFill" class="review-img" />
  <text wx:else class="text-sm text-hint">无</text>
</view>
```

- [ ] **Step 10: 提交**

```bash
git add cloudfunctions/getAdminDashboard/ cloudfunctions/getPendingAvatarUpdates/ cloudfunctions/getPendingDeregistrations/
git add miniprogram/pages/admin/ miniprogram/app.json
git commit -m "feat: 管理员审核页面增强 - 头像/背景 + 注销审核"
```

---

## Phase 4: 订单中文化 + 最终集成

### Task 13: 订单编号中文化

**Files:**
- Modify: `cloudfunctions/createOrder/index.js`
- Modify: `miniprogram/pages/orderList/index.wxml`（用户和商家模式）
- Modify: `miniprogram/pages/orderDetail/index.wxml`

- [ ] **Step 1: 修改 `createOrder/index.js`** — 生成中文订单号

```javascript
// 原本的 orderNo 生成逻辑，改为包含商家名+套餐名
const provider = providerRes.data;
const itemNames = items.map(i => i.name).join('+');
const orderNo = `${provider.name}-${itemNames}`;
```

- [ ] **Step 2: 修改订单列表和详情页状态显示中文**

确保所有 `orderStatus` 映射为中文。在 `orderList/index.wxml` 和 `orderDetail/index.wxml` 中使用一致的中文映射。

- [ ] **Step 3: 商家注销后在用户订单中显示标记**

```xml
<!-- 在 orderDetail 和 orderList 中订单项增加： -->
<text wx:if="{{si.providerDeleted}}" class="text-sm text-hint">(商家已注销)</text>
```

- [ ] **Step 4: 提交**

```bash
git add cloudfunctions/createOrder/ miniprogram/pages/orderList/ miniprogram/pages/orderDetail/
git commit -m "feat: 订单编号中文化 + 商家已注销标记"
```

---

## Phase 5: 验证与收尾

### Task 14: 全面功能验证

- [ ] **Step 1: 部署所有云函数** — 在微信开发者工具中逐个右键云函数文件夹 → 「上传并部署：云端安装依赖」

需要部署的新云函数：
- `deletePortfolio`
- `requestAvatarUpdate`
- `approveAvatarUpdate`
- `requestDeregister`
- `approveDeregister`
- `getPendingAvatarUpdates`
- `getPendingDeregistrations`

需要更新部署的已有云函数：
- `applyProvider`
- `approveProvider`
- `saveServiceItem`
- `getAdminDashboard`
- `getProviderDashboard`
- `createOrder`

删除的云函数：
- `updateProviderLevel`（需在云开发控制台删除）

- [ ] **Step 2: 验证清单**

按以下清单逐项测试：

| # | 测试项 | 角色 | 预期 |
|---|--------|------|------|
| 1 | Tab "功能" 正常显示 | 所有 | 底部栏中间显示"功能" |
| 2 | 首页浏览/分类/列表 | 普通用户 | 无等级评分展示 |
| 3 | 商家详情页 | 普通用户 | 有头像、背景图、无星级 |
| 4 | 入驻流程 | 普通用户 | 头像+背景图分开上传 |
| 5 | 商家首页 | 商家 | 显示自己店铺详情页 |
| 6 | 修改头像申请 | 商家 | 选图→上传→提交→提示等待审核 |
| 7 | 修改背景图申请 | 商家 | 同上 |
| 8 | 功能Tab | 商家 | 看板+快捷入口+订单列表 |
| 9 | 删除作品 | 商家 | 确认→删除→刷新列表 |
| 10 | 注销申请 | 商家 | 确认→检查订单→提交审核 |
| 11 | 有未完成订单时注销 | 商家 | 提示无法注销 |
| 12 | 管理后台-头像/背景审核 | 管理员 | 新旧图对比→同意/拒绝 |
| 13 | 管理后台-注销审核 | 管理员 | 显示信息→同意/拒绝 |
| 14 | 退出登录 | 所有 | 清除数据→回首页 |
| 15 | 套餐图标上传 | 商家 | 上传→保存→显示 |
| 16 | 订单编号 | 用户 | 中文格式 |
| 17 | 商家已注销订单 | 用户 | 显示"商家已注销" |

- [ ] **Step 3: 修 bug + 提交**

```bash
git add -A
git commit -m "fix: 全面验证后修复"
```

---

## 完成标准

- 所有 17 项验证通过
- 无 JS 报错、无空白页面
- 管理员审核流完整可用
- 旧等级/评分相关代码无残留
