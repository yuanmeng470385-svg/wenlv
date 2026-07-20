# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

文旅摄影预约微信小程序 — O2O booking platform for photographers, makeup artists, and hanfu clothing shops. Native WeChat Mini Program + WeChat Cloud Development (云开发).

- **Cloud Environment ID:** `cloud1-d1gv9n7j56c0a3448`
- **AppID:** `wxce7801ec430c768e`
- **GitHub:** `https://github.com/yuanmeng470385-svg/wenlv` (branch `main`)

## Commands

### WeChat DevTools CLI

```
# Path
D:\微信开发工具\微信web开发者工具\cli.bat

# Open project
cli.bat open --project D:\gongsi\wenlv

# Preview
cli.bat preview --project D:\gongsi\wenlv --qr-output preview.png --qr-format image

# Upload (confirm with user first)
cli.bat upload -p D:\gongsi\wenlv -v <version> -d <notes>

# Batch deploy cloud functions (no manual right-click needed)
cli.bat cloud functions deploy --env cloud1-d1gv9n7j56c0a3448 --names fn1 fn2 ... --remote-npm-install --project D:\gongsi\wenlv
```

DevTools service port must be enabled (工具 → 设置 → 安全 → 服务端口, port 10987). First CLI call is slow — use timeout >= 30s.

### Manual Cloud Function Deploy

In WeChat DevTools, right-click each cloud function → "上传并部署". New functions may need 20-45s wait before deployable. Cloud functions cannot be invoked/deleted via CLI — use Cloud Development Console for that.

### Automated Testing

Use `miniprogram-automator` package:
1. `cli.bat auto --project D:\gongsi\wenlv --auto-port 9420`
2. Connect: `automator.connect({wsEndpoint:'ws://127.0.0.1:9420'})`
3. Call functions: `mini.callWxMethod('cloud.callFunction', {name, data})`
4. End with `mini.disconnect()` (not `close()`)

### Git

Git identity is repo-level: yuan / yuanmeng470385@gmail.com. Connection to GitHub requires proxy (127.0.0.1:7897 + openssl backend).

## Architecture

```
wenlv/
├── miniprogram/          # Frontend (pages + services)
│   ├── app.js            # App entry, cloud.init, globalData
│   ├── app.json          # Page registry + tabBar config
│   ├── pages/
│   │   ├── index/        # Homepage (3 modes: admin / user / provider)
│   │   ├── orderList/    # "功能" tab (admin: review, user: orders, provider: dashboard)
│   │   ├── profile/      # "我的" tab (login, role switch, admin login, deregister)
│   │   ├── serviceDetail/# Provider detail (public view)
│   │   ├── booking/      # 4-step booking flow
│   │   ├── admin/        # Admin pages (flat files, NOT index/ subdirectories)
│   │   └── provider/     # Provider self-service pages
│   ├── components/       # Shared components (icon, empty-state, error-state, loading-skeleton)
│   └── services/         # Shared JS modules
│       ├── cloud.js      # callFunction wrapper (unified {code,data,message})
│       └── serviceService.js  # Provider/category API wrappers
├── cloudfunctions/       # ~70 cloud functions (wx-server-sdk)
│   └── <name>/
│       ├── index.js      # Handler (must be self-contained)
│       └── package.json  # {"dependencies":{"wx-server-sdk":"latest"}}
└── docs/superpowers/     # Design specs and implementation plans
```

## Key Patterns

### Cloud Function Conventions

All cloud functions return `{ code: 0, data: ..., message: "..." }`. `code !== 0` = error. The frontend `callFunction` wrapper in `services/cloud.js` throws on non-zero codes.

**Auth guards are INLINE** — cross-directory `require` fails in WeChat Cloud Functions, so never extract shared auth middleware:
- Admin: query `users` by `_openid`, check `roles.includes('admin')`
- User: `const openid = cloud.getWXContext().OPENID; if (!openid) return {code:1002}`
- Provider: resolve provider from `providers.where({userId: openid})` — **MUST also filter by `categoryType`** when the user has multiple identities: accept `role` param, add `query.categoryType = role`, and NEVER use `providerRes.data[0]` blindly. Frontend callers pass `role: app.getActiveRole()`. If this is wrong, all identities share the same data.

Error codes: `1001` (bad params), `1002` (unauthorized), `1003` (not found), `2001` (state conflict, e.g. wrong order status), `2002` (business rule violation), `2003` (payment failure), `9999` (internal).

**Money is in 分 (cents)**, divide by 100 for display.

### Frontend Patterns

**WXML constraints:**
- No nested ternary expressions (`a?b:(c?d:e)`) — pre-compute in JS and bind flat values
- `catchtap` prevents event bubbling (use on action buttons inside clickable cards)
- `wx:key` must be unique

**Page lifecycle optimization:**
- `onShow` fires on every tab switch — avoid repeated cloud calls
- Cache with flags (`_firstLoad`, `_loaded`, `_lastHasLogin`) — track `loginChanged = hasLogin && !this._lastHasLogin`
- On role switch: clear provider data (`setData({ provider: null })`) before calling `loadData()`, otherwise cache guard `if (this.data.provider && !this._firstLoad) return` blocks reload
- Only show `wx.showLoading` on first load, not tab switches

**Other frontend patterns:**
- Emoji/category labels must be pre-computed in JS (e.g., `_categoryEmoji`, `categoryEmoji`, `roleLabel`, `displayName`) — WXML can't do multi-way branch logic
- Phone numbers are masked in public cloud functions (e.g., `138****1111`); full numbers only via `getContactPhone`
- `services/orderService.js` wraps order/payment/review APIs; `services/userService.js` wraps auth; `services/serviceService.js` wraps provider/category lookups
- `utils/priceUtil.js`: `fenToYuan`, `yuanToFen`, `formatPrice`, `calcTotalFee`, `calcRefundAmount`
- `utils/timeUtil.js`: `getDateList`, `getDefaultTimeSlots`, `hoursBetween`, `isMoreThan24Hours`
- `utils/validator.js`: `isValidPhone`, `isRequired`, `validateBookingForm`
- `utils/util.js`: `formatTime`, `generateOrderNo`, `debounce`, `throttle`

**Admin pages** are flat files: `pages/admin/providers.js` (not `pages/admin/providers/index.js`). Register as `pages/admin/providers` in `app.json`.

**Shared components** in `components/`: `<icon>` (named icons as alternative to emoji), `<empty-state>`, `<error-state>`, `<loading-skeleton>`. Register per-page via `usingComponents` in the page's `.json` file.

**WXSS compatibility:**
- `gap` in flexbox is NOT supported on older WeChat WebViews — use `justify-content: space-between` + margin/padding instead
- `calc()` can produce rounding errors on mobile — prefer `width: 50%` + `box-sizing: border-box` + inner padding for 2-column grids
- CSS variables (`var(--bg-page)`, `var(--bg-white)`, `var(--color-primary)`, etc.) are defined in `styles/variables.wxss` — use them instead of hardcoded colors

### Role System

`users.roles[]`: `user`, `photographer`/`makeup`/`hanfu_shop` (provider), `admin`.
Admin mode: `app.globalData.isAdminMode` + `wx.setStorageSync('adminMode', true)` for persistence.
Admin login requires: user has `admin` role in DB + correct password (cloud function `adminLogin`, default password `admin123`, configurable via `config` collection with key `adminPassword`).

### Database Collections

`users`, `providers`, `portfolios`, `serviceItems`, `orders`, `reviews`, `banners`, `likes`, `favorites`, `notifications`, `config`, `auditLogs`, `categories`.

Portfolio lifecycle: `pending_review` → admin approves → `approved` (or `rejected`). Auto-approval when provider registration is approved.

### Tab Bar

Three tabs: 首页 (index), 功能 (orderList), 我的 (profile). Index page renders admin/user/provider views based on `isAdminMode` and `activeRole`.

### Featured/精选 System

Two-tier system (transitioning from provider-level to portfolio-level):
- Admin toggles individual portfolios as featured via `pages/admin/providerPortfolios`
- Cloud functions: `togglePortfolioFeatured`, `getProviderPortfolios`, `getFeaturedPortfolios` (filters `{status:'approved', isFeatured:true}`)
- Legacy (fallback): `toggleFeatured` + `getFeaturedProviders` (provider-level)
- Banner management on homepage: `saveBanner` already supports `image` field

### Hanfu Shop Location (hanfuLocation)

Hanfu shops use a dedicated discovery page (`pages/hanfuLocation/`) instead of the regular `serviceList`:
- Auto-locates user via `wx.getLocation` + reverse geocode via `searchNearbyShops` cloud function (Tencent Maps API)
- Manual city input strips "市" suffix for consistency
- `getProviderList` uses `db.RegExp` for city filter (case-insensitive), NOT exact match
- Nearby external shops shown alongside platform-registered ones

### Order State Machine

```
pending_pay → paid → confirmed → in_progress → pending_complete → completed → reviewed
    ↓           ↓         ↓             ↓
cancelled   pending_refund (admin approves → cancelled)
```

- Provider actions (`providerHandleOrder`): `confirm`, `reject` (auto-refunds), `start`, `complete`
- Customer auto-cancel: unpaid orders expire; `paid` orders not accepted within 24h → auto-cancelled
- Cancel refund: <24h = full refund, 24h-48h = 50%, expired = cannot cancel
- `confirmComplete` transitions `pending_complete` → `completed` (both customer AND provider can call it)
- Provider tabs include `pending_complete` (待确认完成); `completed` tab auto-includes `reviewed` orders
- STATUS_MAP in `orderList/index.js` maps status keys to Chinese labels

### Star Rating System

- Review page (`pages/review/create`) has 1-5 star selector using `<icon name="star-filled">` / `<icon name="star">`
- `createReview` cloud function auto-computes average rating per provider after each review: sums all reviews → `Math.round(avg * 10) / 10` (1 decimal)
- Stored in `providers.rating` and `providers.reviewCount`
- Displayed on: `serviceDetail` header, provider self-view (`index.wxml`), `serviceList` cards
- `getProviderList` sorts by `rating desc` by default

### Design System

Brand colors (warm Chinese style): primary `#C48B5C`, primary-dark `#A0703E`, primary-light `#E8C9A0`, price `#E8563A`. Global CSS variables in `styles/variables.wxss`.

Pricing models (`serviceItems.priceType`): `fixed` (套餐), `hourly` (按时), `project` (按项目). Combo orders via `orders.items[]`.

### Test Data

`initTestData` cloud function (admin-only) seeds: 3 photographers, 3 makeup artists, 2 hanfu shops, 18 service items, 7 portfolios, 3 categories.

## Constraints

- Never modify payment functions (`payOrder`, `mockPay`, `payCallback`, etc.)
- Cross-directory `require` in cloud functions will fail — always inline
- New cloud functions need deployment before use; add frontend fallbacks for undeployed functions
