# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

文旅摄影预约微信小程序 — O2O booking platform for photographers (摄影师), makeup artists (妆造师), and hanfu clothing shops (汉服店). Native WeChat Mini Program + WeChat Cloud Development (云开发).

- **Cloud Environment ID:** `cloud1-d1gv9n7j56c0a3448`
- **AppID:** `wxce7801ec430c768e`
- **GitHub:** `https://github.com/yuanmeng470385-svg/wenlv`
- **Scale:** 70 cloud functions / 29 pages / 15 DB collections / 5 shared components
- **Git identity:** repo-level yuan / yuanmeng470385@gmail.com; proxy 127.0.0.1:7897 + openssl for GitHub

## Repository Status (as of 2026-07-22)

- **Active branch:** `feat/ui-redesign` (tip `4599a01`), 41 commits ahead of `main`
- `main` ≈ `feat/backend-auth` at `30a97b1` — behind; all active work is on `feat/ui-redesign`, not yet merged back
- **Working tree:** 101 modified files + 5 untracked — ongoing UI redesign across all pages + admin/provider pages, plus:
  - 套餐审核收紧 + 移除 `project` 定价与 `originalPrice` 字段（`saveServiceItem`/`editServiceItem`/`reviewServiceItem`/`approveProvider`）
  - New `docs/ui-redesign/` directory (design reference assets)
  - New `scripts/check-compile.js` (build check), `scripts/gen-tabbar-icons.js` (tab bar icon generation), `scripts/package.json` (dep: `@resvg/resvg-js`)

### Recent Commits (last 10 on feat/ui-redesign)

```
4599a01 fix: approval sync, image display, icon optimization
edee544 fix: 套餐上下架生效 + 新增删除功能
8c12a6c docs: CLAUDE.md补充多身份隔离规则+角色切换缓存清理+订单确认更新
6a6f6a2 fix: 切换商家身份首页缓存未清空
6eed566 fix: 多身份数据隔离 - 云函数按categoryType匹配当前身份
9285825 fix: 注销时pending_complete/pending_refund/pending_pay不再阻止
56a830c fix: 商家确认完成 + 订单状态分类同步
944e11b fix: 优秀展示布局改用width:50%+内padding方案
d90c71e fix: 手机端优秀展示一排只显示一个 - gap属性兼容性
604ad8f fix: 三个问题修复
```

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

`scripts/verify-auth.js` checks that all cloud functions have inline auth guards.

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/verify-auth.js` | Check all cloud functions have inline auth guards |
| `scripts/check-compile.js` | Build/compile check (new, part of UI redesign tooling) |
| `scripts/gen-tabbar-icons.js` | Generate tab bar icon assets via `@resvg/resvg-js` |
| `uploadCloudFunction.sh` | Legacy upload helper (root) |

## Architecture

```
wenlv/
├── miniprogram/          # Frontend
│   ├── app.js            # App entry, cloud.init, globalData (userInfo/openid/activeRole/hasLogin/isAdminMode)
│   ├── app.json          # 29 pages + 3-tab tabBar + scope.userLocation permission
│   ├── pages/
│   │   ├── index/        # 首页 tab (3 modes: admin / user / provider-as-serviceDetail)
│   │   ├── orderList/    # 功能 tab (user: orders; provider: dashboard + quick entries + orders)
│   │   ├── profile/      # 我的 tab (login, role switch, admin login, logout, deregister)
│   │   ├── serviceList/  # Provider list by category (photographer/makeup)
│   │   ├── hanfuLocation/# Hanfu shop discovery (location + nearby POI via Tencent Maps)
│   │   ├── serviceDetail/# Provider detail (public view)
│   │   ├── portfolioDetail/ # Portfolio detail
│   │   ├── booking/      # 4-step booking flow
│   │   ├── orderDetail/  # Order detail + phone-call buttons
│   │   ├── favorites/    # My favorites
│   │   ├── review/create/# 1-5 star review creation
│   │   ├── messages/     # Notification list
│   │   ├── provider/     # 8 self-service pages (dashboard/register/editProfile/uploadWork/
│   │   │                 #   myWorks/schedule/serviceItems/editServiceItem) — flat files
│   │   └── admin/        # 9 admin pages (dashboard/providers/portfolios/serviceItems/refunds/
│   │                     #   users/avatarUpdates/deregistrations/providerPortfolios) — flat files
│   ├── components/       # icon, empty-state, error-state, loading-skeleton, cloudTipModal
│   ├── services/         # cloud.js (callFunction wrapper), orderService, userService, serviceService
│   ├── utils/            # priceUtil, timeUtil, validator, util
│   └── styles/           # variables.wxss (CSS custom properties), reset.wxss
├── cloudfunctions/       # 70 cloud functions (wx-server-sdk)
│   └── <name>/
│       ├── index.js      # Handler (must be self-contained)
│       └── package.json  # {"dependencies":{"wx-server-sdk":"latest"}}
├── scripts/              # verify-auth.js, check-compile.js, gen-tabbar-icons.js, package.json
├── docs/
│   ├── superpowers/      # specs/ (design docs) + plans/ (implementation plans)
│   └── ui-redesign/      # UI redesign reference assets (index.html)
└── .superpowers/sdd/     # SDD task briefs/reports + progress.md ledger
```

## Cloud Functions Reference (complete list, 70 total)

| # | Function | Category |
|---|----------|----------|
| 1 | `login` | Auth |
| 2 | `adminLogin` | Auth/Admin |
| 3 | `switchRole` | Auth |
| 4 | `updateUserInfo` | User |
| 5 | `getContactPhone` | User |
| 6 | `getFavorites` | User |
| 7 | `toggleFavorite` | User |
| 8 | `toggleLike` | User |
| 9 | `getNotifications` | Notification |
| 10 | `markNotificationRead` | Notification |
| 11 | `applyProvider` | Provider |
| 12 | `getMyProvider` | Provider |
| 13 | `getProviderDetail` | Provider |
| 14 | `getProviderList` | Provider |
| 15 | `getFeaturedProviders` | Provider |
| 16 | `toggleFeatured` | Provider |
| 17 | `toggleProviderOpen` | Provider |
| 18 | `requestAvatarUpdate` | Provider |
| 19 | `requestDeregister` | Provider |
| 20 | `getMyPortfolios` | Portfolio |
| 21 | `getPortfolioDetail` | Portfolio |
| 22 | `getProviderPortfolios` | Portfolio |
| 23 | `getFeaturedPortfolios` | Portfolio |
| 24 | `uploadPortfolio` | Portfolio |
| 25 | `deletePortfolio` | Portfolio |
| 26 | `togglePortfolioFeatured` | Portfolio |
| 27 | `saveServiceItem` | Service Item |
| 28 | `updateServiceItem` | Service Item |
| 29 | `deleteServiceItem` | Service Item |
| 30 | `getMyServiceItems` | Service Item |
| 31 | `getMyTimeSlots` | Schedule |
| 32 | `updateSchedule` | Schedule |
| 33 | `toggleTimeSlot` | Schedule |
| 34 | `createOrder` | Order |
| 35 | `getOrderList` | Order |
| 36 | `getOrderDetail` | Order |
| 37 | `cancelOrder` | Order |
| 38 | `cancelExpiredOrders` | Order |
| 39 | `providerHandleOrder` | Order |
| 40 | `confirmComplete` | Order |
| 41 | `getProviderOrders` | Order |
| 42 | `getProviderDashboard` | Order/Stats |
| 43 | `payOrder` | Payment (DO NOT MODIFY) |
| 44 | `mockPay` | Payment (DO NOT MODIFY) |
| 45 | `payCallback` | Payment (DO NOT MODIFY) |
| 46 | `mockCompleteOrder` | Payment (DO NOT MODIFY) |
| 47 | `approveRefund` | Payment/Admin |
| 48 | `createReview` | Review |
| 49 | `getReviews` | Review |
| 50 | `getCategoryList` | Category |
| 51 | `getBanners` | Banner |
| 52 | `saveBanner` | Banner/Admin |
| 53 | `deleteBanner` | Banner/Admin |
| 54 | `approveProvider` | Admin |
| 55 | `getPendingProviders` | Admin |
| 56 | `reviewPortfolio` | Admin |
| 57 | `getPendingPortfolios` | Admin |
| 58 | `reviewServiceItem` | Admin |
| 59 | `getPendingServiceItems` | Admin |
| 60 | `approveAvatarUpdate` | Admin |
| 61 | `getPendingAvatarUpdates` | Admin |
| 62 | `approveDeregister` | Admin |
| 63 | `getPendingDeregistrations` | Admin |
| 64 | `getPendingRefunds` | Admin |
| 65 | `getAdminDashboard` | Admin |
| 66 | `adminGetUsers` | Admin |
| 67 | `banUser` | Admin |
| 68 | `banProvider` | Admin |
| 69 | `searchNearbyShops` | Location |
| 70 | `initTestData` | Dev/Test |

## Key Patterns

### Cloud Function Conventions

All cloud functions return `{ code: 0, data: ..., message: "..." }`. `code !== 0` = error. The frontend `callFunction` wrapper in `services/cloud.js` throws on non-zero codes.

**Auth guards are INLINE** — cross-directory `require` fails in WeChat Cloud Functions, so never extract shared auth middleware:
- Admin: query `users` by `_openid`, check `roles.includes('admin')`
- User: `const openid = cloud.getWXContext().OPENID; if (!openid) return {code:1002}`
- Provider: resolve provider from `providers.where({userId: openid})` — **MUST also filter by `categoryType`** when the user has multiple identities: accept `role` param, add `query.categoryType = role`, and NEVER use `providerRes.data[0]` blindly. Frontend callers pass `role: app.getActiveRole()`. If this is wrong, all identities share the same data.

Error codes: `1001` (bad params), `1002` (unauthorized), `1003` (not found), `2001` (state conflict, e.g. wrong order status), `2002` (business rule violation), `2003` (payment failure), `9999` (internal).

**Money is in 分 (cents)**, divide by 100 for display.

**Phone masking (2026-07-16 hardening):** public-returning functions mask phones inline (`138****5678`): `login`, `getOrderDetail`, `getOrderList`, `getProviderOrders`, `getProviderDetail`, `getProviderList`. DB stores plaintext; masking happens only at return. `getMyProvider` is NOT masked (provider sees own info). Full numbers only via `getContactPhone({target:'order'|'provider', ...})` — order target restricted to order user/provider/admin, provider target to any logged-in user; both log caller OPENID. The 5 public read functions (`getCategoryList`, `getProviderList`, `getProviderDetail`, `getPortfolioDetail`, `getReviews`) log caller OPENID + params via `console.log` but never block anonymous access.

**Ban flow:** `banUser` / `banProvider` (admin) set banned flags; `login` rejects banned users. Admin actions write to `auditLogs` and create `notifications` for the affected user.

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
- `services/orderService.js` wraps order/payment/review/getContactPhone APIs; `services/userService.js` wraps auth; `services/serviceService.js` wraps provider/category lookups
- `utils/priceUtil.js`: `fenToYuan`, `yuanToFen`, `formatPrice`, `calcTotalFee`, `calcRefundAmount`
- `utils/timeUtil.js`: `getDateList`, `getDefaultTimeSlots`, `hoursBetween`, `isMoreThan24Hours`
- `utils/validator.js`: `isValidPhone`, `isRequired`, `validateBookingForm`
- `utils/util.js`: `formatTime`, `generateOrderNo`, `debounce`, `throttle`

**Admin & provider pages** are flat files: `pages/admin/providers.js` (not `pages/admin/providers/index.js`). Register as `pages/admin/providers` in `app.json`.

**Admin review pages** show detail via `wx.showModal` on card tap (not navigation) — newest pattern, see `pages/admin/providers.js`.

**Shared components** in `components/`: `<icon>`, `<empty-state>`, `<error-state>`, `<loading-skeleton>`, `<cloud-tip-modal>`. Register per-page via `usingComponents` in the page's `.json` file.

**WXSS compatibility (critical for UI redesign):**
- `gap` in flexbox is NOT supported on older WeChat WebViews — use `justify-content: space-between` + margin/padding instead
- `calc()` can produce rounding errors on mobile — prefer `width: 50%` + `box-sizing: border-box` + inner padding for 2-column grids
- CSS variables (`var(--bg-page)`, `var(--bg-white)`, `var(--color-primary)`, etc.) are defined in `styles/variables.wxss` — use them instead of hardcoded colors
- `/* star-slash */` comments that contain `*` followed by `/` (e.g. `/* .btn-* */`) will close the comment early → parse error. Avoid wildcards in WXSS comments.
- Always verify compilation errors in the IDE — CLI error messages are too generic

### Role System

`users.roles[]`: `user`, `photographer`/`makeup`/`hanfu_shop` (provider), `admin`. One user can hold multiple provider roles; `activeRole` selects the active identity.

Admin mode: `app.globalData.isAdminMode` + `wx.setStorageSync('adminMode', true)` for persistence.

Admin login requires: user has `admin` role in DB + correct password (cloud function `adminLogin`, default password `admin123`, configurable via `config` collection with key `adminPassword`). Admin login has dual verification (role check + password) and gracefully falls back to defaults if `config` collection doesn't exist.

Logout (退出登录): clears `app.globalData` + `wx.clearStorageSync()` → back to index.

### Database Collections (15)

`users`, `providers`, `portfolios`, `serviceItems`, `orders`, `payments`, `reviews`, `banners`, `likes`, `favorites`, `notifications`, `config`, `auditLogs`, `categories`, `timeSlots`.

Portfolio lifecycle: `pending_review` → admin reviews → `approved` (or `rejected`).

ServiceItem lifecycle: `pending_review` → `active` / `rejected`; `active` ↔ `inactive` shelf-toggle by provider. `pending_review` / `rejected` items CANNOT be shelf-toggled by the provider (enforced in both `saveServiceItem` and the provider UI). `approveProvider` no longer cascades approve/reject to pending serviceItems (provider review and item review are decoupled).

Key provider fields: `avatar`, `backgroundImage`, `pendingAvatar`, `pendingBackgroundImage` (image-change requests pending admin review), `status` (`active` / `pending_review` / `pending_deregister`), `rating`, `reviewCount`.

Key order fields: `orderNo` (Chinese format `{商家名}-{套餐名}`), `providerDeleted` + `providerNameSnapshot` (set when provider deregisters; UI shows "商家已注销"), `items[]` (combo orders).

Key serviceItem fields: `priceType` (`fixed` for 套餐 / `hourly` for 按时 — `project` type removed), `price` (in 分), `status` (`active` / `inactive` / `pending_review` / `rejected`), `icon` (emoji-based).

### Tab Bar

Three tabs: 首页 (index), 功能 (orderList), 我的 (profile). Index page renders admin/user/provider views based on `isAdminMode` and `activeRole`. Provider-mode index reuses the serviceDetail layout (cover swiper + avatar + 服务项目/作品展示/用户评价 tabs + edit icons for avatar/cover). Provider-mode orderList prepends a 3-column stats board (今日预约/待处理/总订单) + quick-entry row.

### Provider Deregister Flow (注销)

1. Provider taps 注销商家身份 on profile → confirm dialog → `requestDeregister`
2. Guard: unfinished orders block deregister — BUT `pending_complete` / `pending_refund` / `pending_pay` orders do NOT block (per commit `9285825`)
3. Admin reviews via `getPendingDeregistrations` → `approveDeregister`:
   - approve → cascade-delete provider/portfolios/serviceItems/reviews, mark orders `providerDeleted: true` + `providerNameSnapshot`, remove role from `users.roles`
   - reject → status back to `active`

### Avatar/Background Image Review Flow

Provider edits avatar/cover from provider-mode index → `requestAvatarUpdate({type, fileID})` writes `pendingAvatar` / `pendingBackgroundImage` (old image keeps displaying) → admin sees old-vs-new comparison in `pages/admin/avatarUpdates` → `approveAvatarUpdate` applies or discards.

### Featured/精选 System

Two-tier system (transitioning from provider-level to portfolio-level):
- Admin toggles individual portfolios as featured via `pages/admin/providerPortfolios`
- Cloud functions: `togglePortfolioFeatured`, `getProviderPortfolios`, `getFeaturedPortfolios` (filters `{status:'approved', isFeatured:true}`)
- Legacy (fallback): `toggleFeatured` + `getFeaturedProviders` (provider-level)
- Banner management on homepage: `getBanners` / `saveBanner` / `deleteBanner` (`image` field supported)

### Hanfu Shop Location (hanfuLocation)

Hanfu shops use a dedicated discovery page (`pages/hanfuLocation/`) instead of the regular `serviceList`:
- Auto-locates user via `wx.getLocation` (requires `scope.userLocation` permission + `requiredPrivateInfos: ["getLocation"]` in app.json) + reverse geocode via `searchNearbyShops` cloud function (Tencent Maps API)
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
- Customer auto-cancel: unpaid orders expire (`cancelExpiredOrders`); `paid` orders not accepted within 24h → auto-cancelled
- Cancel refund: <24h = full refund, 24h-48h = 50%, expired = cannot cancel
- `confirmComplete` transitions `pending_complete` → `completed` (both customer AND provider can call it)
- Provider tabs include `pending_complete` (待确认完成); `completed` tab auto-includes `reviewed` orders
- STATUS_MAP in `orderList/index.js` maps status keys to Chinese labels
- `orderNo` format: `{商家名}-{套餐名}` (generated in `createOrder`)

### Review/Rating System

- Review page (`pages/review/create`) has 1-5 star selector using `<icon name="star-filled">` / `<icon name="star">`
- `createReview` auto-computes average per provider after each review: `Math.round(avg * 10) / 10` → `providers.rating` + `providers.reviewCount`
- Displayed on: `serviceDetail`, `serviceList` cards, provider self-view, favorites/hanfuLocation/portfolioDetail
- `getProviderList` sorts by `rating desc` when no explicit sort
- The old 等级 (level) system WAS removed: `level`/`levelName` no longer initialized by `applyProvider`, `updateProviderLevel` cloud function deleted. Star rating (rating/reviewCount) REMAINS — do not confuse the two.

### Design System

Brand colors (warm Chinese style): primary `#C48B5C`, primary-dark `#A0703E`, primary-light `#E8C9A0`, price `#E8563A`. Global CSS variables in `styles/variables.wxss`. Tab bar: active `#29241D`, inactive `#A79E8F`, background `#FBF8F0`.

Pricing models (`serviceItems.priceType`): `fixed` (套餐), `hourly` (按时). (`project` 按项目 REMOVED — see Repository Status.) Combo orders via `orders.items[]`.

### Test Data

`initTestData` cloud function (admin-only, gated) seeds: 3 photographers, 3 makeup artists, 2 hanfu shops, 18 service items, 7 portfolios, 3 categories. Note: still seeds legacy `originalPrice` / `project`-type data (not yet cleaned up to match the new pricing model).

## Constraints

- **Never modify payment functions** (`payOrder`, `mockPay`, `payCallback`, `mockCompleteOrder`) — payment module overhaul is a separate pending task
- **Cross-directory `require` in cloud functions WILL FAIL** — always inline shared helpers (maskPhone, auth guards, etc.)
- **All money in 分 (cents)**; divide by 100 for display; always use `priceUtil` for conversions
- **All cloud functions return `{code, data, message}`**; error codes per the table above
- **New cloud functions need deployment** before use; add frontend fallbacks for undeployed functions
- **Multi-identity provider functions** MUST accept `role` param and filter by `categoryType` — never assume `data[0]` when user could hold multiple provider identities
- **WXSS gap property is not universally supported** — verify layout on real devices, not just the IDE simulator

## Documentation

| Path | Content |
|------|---------|
| `docs/superpowers/specs/` | Design specs (4 docs: backend-auth, user-data-security, provider-redesign, hanfu-location) |
| `docs/superpowers/plans/` | Implementation plans (3 docs: backend-auth, user-data-security, provider-redesign) |
| `docs/ui-redesign/` | UI redesign reference assets (index.html) |
| `.superpowers/sdd/` | SDD task briefs/reports + progress.md ledger |
| `README.md` | Public-facing project README |
