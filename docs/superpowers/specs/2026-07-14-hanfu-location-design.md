# 汉服店位置选择 + 混合展示

**日期**: 2026-07-14 | **状态**: 已确认

## 背景

汉服店有地域属性（租赁/试穿需到店），当前所有品类统一走"全量列表→详情→下单"流程，不支持按位置筛选，也没有外部汉服店黄页。此需求为汉服店新增位置选择流程，并整合地图 API 搜周边的未入驻店铺。

## 用户流程

```
首页点"汉服店"分类
  → 进入"位置选择页"（新页面 hanfuLocation）
     ├─ 顶部位置栏：显示当前城市名 + [📍自动定位]按钮
     ├─ 点击城市名可手动切换城市
     ├─ 页面加载时自动尝试 wx.getLocation 获取定位
     └─ 定位/选城后，下方两区混合展示：
        ├─ 🏠 平台已入住（该城市的入驻汉服店）
        │     → 点击进入 serviceDetail → booking 正常下单
        └─ 📍 附近汉服店（腾讯地图 API 搜的外部 POI）
              → 展示名称/地址/电话/评分 → 一键拨号
```

## 修改清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `pages/hanfuLocation/index.{js,wxml,wxss,json}` | **新增** | 位置选择 + 混合列表页面 |
| `cloudfunctions/searchNearbyShops/` | **新增** | 封装腾讯地图地点搜索 API |
| `pages/index/index.js` `onCategoryTap` | 修改 | type=hanfu_shop 时跳到新页面 |
| `cloudfunctions/getProviderList/index.js` | 修改 | 增加可选 `city` 筛选参数 |
| `app.json` | 修改 | 注册新页面路径 |

## 页面设计

### hanfuLocation 页面

**位置栏**
- 左侧：当前城市名（默认"定位中..."）
- 右侧：`📍 自动定位` 按钮
- 点击城市名 → `wx.chooseLocation` 或弹出城市选择器
- 自动定位流程：
  1. `wx.getLocation({type:'gcj02'})` 获取经纬度
  2. `wx.getFuzzyLocation` 或反向地理编码得城市名
  3. 填入顶部栏，触发结果加载
  4. 失败则保持"请选择城市"状态

**已入住列表** (平台商家)
- 调用 `getProviderList({categoryType:'hanfu_shop', city, pageSize:10})`
- 每项 card：头像/封面、名称、等级/评分、简介、城市
- 点击 → `navigateTo serviceDetail` → booking 下单

**附近汉服店列表** (地图 POI)
- 云函数 `searchNearbyShops({city})` 调腾讯地图 API
- 每项 card：名称、地址、电话、评分（无头像则用默认图）
- 底部 `📞 一键拨号` 按钮 → `wx.makePhoneCall`
- 标记"外部商家"角标以示区别

**状态处理**
- 定位加载中 → skeleton/loading
- 定位失败 → 提示"定位失败，请手动选择城市"
- 两区都空 → "该城市暂无汉服店信息"
- 网络错误 → 各区域独立错误提示+重试

## 云函数设计

### searchNearbyShops

```js
// 输入: { city: "杭州", keyword: "汉服店"(默认), page: 1 }
// 调用: https://apis.map.qq.com/ws/place/v1/search
//   ?keyword=汉服店&boundary=region(杭州,0)&page_size=10&page_index=1&key=XXX
// 输出: { code: 0, data: { list: [...], total } }
// list 每项: { name, address, phone, lat, lng, category, _id(原始uid) }
// Key 硬编码于云函数内（不上传前端）
// 无 phone 的 POI 不过滤，card 上不显示拨号按钮；\n 替换为空格
```

### getProviderList (修改)

在原参数基础上增加可选 `city` 字段：
```js
const where = { categoryType, status: 'active' };
if (city) where.city = city;                // 精确匹配
if (!city) where.city = db.command.neq(''); // 无 city 筛选时只取有城市的（兼容旧行为：已有数据均有 city）
```

参数列表更新：`{ categoryType, page, pageSize, sortBy, level, keyword, city? }` —— `city` 不做模糊，仅精确匹配。

## 首页入口修改

`pages/index/index.js` → `onCategoryTap`:
```js
onCategoryTap(e) {
  const type = e.currentTarget.dataset.type;
  if (type === 'hanfu_shop') {
    wx.navigateTo({ url: '/pages/hanfuLocation/index' });
  } else {
    wx.navigateTo({ url: `/pages/serviceList/index?type=${type}` });
  }
},
```

## API Key 安全

腾讯地图 WebService API Key 写在 `searchNearbyShops` 云函数环境内，不暴露到前端。需要用户自行申请（lbs.qq.com → 控制台 → 应用管理 → 创建应用 → 勾选地点搜索），并在微信小程序后台添加 `apis.map.qq.com` 到 request 合法域名。

## 不做

- 不内置地图标注视图（需求明确纯列表即可）
- 不修改摄影师/妆造师的品类入口（仅汉服店走新流程）
- 不在前端暴露地图 API Key
