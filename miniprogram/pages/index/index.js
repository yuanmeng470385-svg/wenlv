const { getCategoryList } = require('../../services/serviceService');
const { login } = require('../../services/userService');
const app = getApp();

/* 品类元信息：宋体单字 / 中文名 / 图标 / 渐变（新中式视觉系统） */
const CATEGORY_META = {
  photographer: { glyph: '影', label: '摄影跟拍', icon: 'camera', grad: 'g-rouge' },
  makeup: { glyph: '妆', label: '妆造造型', icon: 'lipstick', grad: 'g-gold' },
  hanfu_shop: { glyph: '服', label: '汉服租赁', icon: 'robe', grad: 'g-cel' },
};
const metaOf = (type) => CATEGORY_META[type] || CATEGORY_META.photographer;

Page({
  data: {
    banners: [],
    categories: [], featuredWorks: [], topProviders: [],
    activeRole: 'user', hasLogin: false, isAdminMode: false,
    dashboard: { todayOrders: 0, pendingOrders: 0, totalOrders: 0 },
    recentOrders: [],
    providerName: '',
    provider: null,
    serviceItems: [],
    portfolios: [],
    reviews: [],
    activeTab: 'service',
    adminBanners: [],
    allProviders: [],
    unreadCount: 0,
  },

  onLoad() {
    this._firstLoad = true;
    this._lastRole = app.getActiveRole();
    this.initPage();
  },

  onShow() {
    const adminMode = app.isAdminMode ? app.isAdminMode() : false;
    const role = app.getActiveRole();
    const hasLogin = app.checkLogin();
    const roleChanged = role !== this._lastRole;
    const loginChanged = hasLogin && !this._lastHasLogin;
    this._lastRole = role;
    this._lastHasLogin = hasLogin;
    this.setData({ activeRole: role, hasLogin: hasLogin, isAdminMode: adminMode });

    if (adminMode && hasLogin) {
      this.loadAdminData();
    } else if (hasLogin) {
      // 切换身份时清空旧缓存
      if (roleChanged) this.setData({ provider: null, serviceItems: [], portfolios: [], reviews: [] });
      // 商家模式每次 onShow 都刷新（静默），用户模式首次/切换时刷新
      const isProvider = role !== 'user';
      if (isProvider || this._firstLoad || roleChanged || loginChanged) {
        this.loadData(isProvider && !this._firstLoad && !roleChanged);
      }
    }
    this._firstLoad = false;
  },

  async initPage() {
    try { await this.doLogin(); this.setData({ hasLogin: true }); await this.loadData(); }
    catch (err) { console.error('init error:', err); }
  },

  async doLogin() {
    try {
      const res = await wx.getUserProfile({ desc: '用于完善个人资料' });
      const userInfo = await login({ nickName: res.userInfo.nickName, avatarUrl: res.userInfo.avatarUrl });
      app.globalData.userInfo = userInfo.userInfo; app.globalData.openid = userInfo.userInfo._openid; app.globalData.hasLogin = true;
    } catch (err) {
      try {
        const userInfo = await login({});
        app.globalData.userInfo = userInfo.userInfo; app.globalData.openid = userInfo.userInfo._openid; app.globalData.hasLogin = true;
      } catch (e) {}
    }
  },

  async loadData(silent) {
    if (this._firstLoad) wx.showLoading({ title: '加载中...' });
    try {
      if (this.data.activeRole === 'user') {
        const { callFunction } = require('../../services/cloud');

        // 仅 categories 做全会话缓存（极少变动）
        // banners / topProviders / featuredWorks 每次 onShow 都刷新
        let categories = this.data.categories.length ? this.data.categories : [];
        let banners = [];
        let topProviders = [];

        const promises = [];
        // banners 每次都拉取（管理员可能随时更新）
        promises.push(callFunction('getBanners').then(r => { banners = r.list || []; }).catch(()=>{}));
        // categories 仅首次加载
        if (!categories.length) promises.push(getCategoryList().then(r => {
          categories = (r || []).map(c => Object.assign({}, c, {
            _glyph: metaOf(c.type).glyph,
            _label: metaOf(c.type).label,
            _grad: metaOf(c.type).grad,
          }));
        }).catch(()=>{}));
        // topProviders 每次都拉取（精选商家可能变动）
        promises.push(callFunction('getProviderList', { page: 1, pageSize: 6 }).then(r => {
          topProviders = (r.list || []).map(p => Object.assign({}, p, {
            _glyph: (p.name || '影').charAt(0),
            _label: metaOf(p.categoryType).label,
            _grad: metaOf(p.categoryType).grad,
            _tags: (p.featureTags || []).slice(0, 2),
          }));
        }).catch(()=>{}));
        const featuredPromise = callFunction('getFeaturedPortfolios').then(r => {
          const works = (r.list || []).map(p => ({
            _id: p._id,
            image: p.image || '',
            providerName: p.providerName,
            providerAvatar: p.providerAvatar || '',
            providerCategory: p.providerCategory,
            providerId: p.providerId,
            _glyph: (p.providerName || '影').charAt(0),
            _grad: metaOf(p.providerCategory).grad,
            _label: metaOf(p.providerCategory).label,
          }));
          this.setData({ featuredWorks: works });
        }).catch(() => {
          // 回退：getFeaturedPortfolios 未部署时用 getFeaturedProviders
          return callFunction('getFeaturedProviders').then(r => {
            const works = (r.list || []).map(p => ({
              _id: p._id,
              image: p.backgroundImage || p.avatar || '',
              providerName: p.name,
              providerAvatar: p.avatar || '',
              providerCategory: p.categoryType,
              providerId: p._id,
              _glyph: (p.name || '影').charAt(0),
              _grad: metaOf(p.categoryType).grad,
              _label: metaOf(p.categoryType).label,
            }));
            this.setData({ featuredWorks: works });
          }).catch(()=>{});
        });
        promises.push(featuredPromise);

        await Promise.all(promises);
        this.setData({ banners, categories, topProviders });

        // 加载未读通知数
        callFunction('getNotifications', { page: 1, pageSize: 1 })
          .then(r => this.setData({ unreadCount: r.unreadCount || 0 }))
          .catch(() => {});
      } else {
        // 商家模式 - 静默刷新时跳过缓存，否则首次加载后不再拉取
        if (this.data.provider && !this._firstLoad && !silent) return;
        const { callFunction } = require('../../services/cloud');
        const { getProviderDetail } = require('../../services/serviceService');
        const myRes = await callFunction('getMyProvider', { role: this.data.activeRole });
        if (myRes && myRes._id) {
          const detail = await getProviderDetail(myRes._id);
          const p = detail.provider;
          if (p) {
            p._glyph = (p.name || '店').charAt(0);
            p._grad = metaOf(p.categoryType).grad;
          }
          const STATUS_CHIP = {
            active: ['st-cel', '上架中'], inactive: ['st-gray', '已下架'],
            pending_review: ['st-gold', '审核中'], rejected: ['st-red', '已驳回'],
          };
          const items = (detail.serviceItems || []).map(s => {
            const chip = STATUS_CHIP[s.status] || ['st-gray', s.status || ''];
            return Object.assign({}, s, { _statusClass: chip[0], _statusLabel: chip[1] });
          });
          this.setData({
            provider: p,
            serviceItems: items,
            portfolios: detail.portfolios || [],
            reviews: detail.reviews || [],
            providerName: myRes.name || '',
          });
        }
      }
    } catch (err) { console.error('加载失败:', err); }
    finally { if (this._firstLoad) wx.hideLoading(); }
  },

  onRoleChanged(role) { this.setData({ activeRole: role }); this.loadData(); },
  onCategoryTap(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'hanfu_shop') {
      wx.navigateTo({ url: '/pages/hanfuLocation/index' });
    } else {
      wx.navigateTo({ url: `/pages/serviceList/index?type=${type}` });
    }
  },
  onProviderTap(e) { wx.navigateTo({ url: `/pages/serviceDetail/index?id=${e.currentTarget.dataset.id}` }); },
  goMore() { wx.navigateTo({ url: '/pages/serviceList/index?type=photographer' }); },
  onBellTap() { wx.navigateTo({ url: '/pages/messages/index' }); },

  goUploadWork() { wx.navigateTo({ url: '/pages/provider/uploadWork' }); },
  goMyWorks() { wx.navigateTo({ url: '/pages/provider/myWorks' }); },
  goSchedule() { wx.navigateTo({ url: '/pages/provider/schedule' }); },
  goServiceItems() { wx.navigateTo({ url: '/pages/provider/serviceItems' }); },
  goEditProfile() { wx.navigateTo({ url: '/pages/provider/editProfile' }); },
  goOrderDetail(e) { wx.navigateTo({ url: `/pages/orderDetail/index?id=${e.currentTarget.dataset.id}` }); },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  async onEditAvatar() {
    const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] });
    wx.showLoading({ title: '上传中...' });
    try {
      const { uploadFile, callFunction } = require('../../services/cloud');
      const cloudPath = `providers/avatars/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const fileID = await uploadFile(cloudPath, res.tempFilePaths[0]);
      wx.hideLoading();
      await callFunction('requestAvatarUpdate', { field: 'avatar', fileID });
      wx.showToast({ title: '已提交审核', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
    }
  },

  async onEditBackground() {
    const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] });
    wx.showLoading({ title: '上传中...' });
    try {
      const { uploadFile, callFunction } = require('../../services/cloud');
      const cloudPath = `providers/backgrounds/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const fileID = await uploadFile(cloudPath, res.tempFilePaths[0]);
      wx.hideLoading();
      await callFunction('requestAvatarUpdate', { field: 'backgroundImage', fileID });
      wx.showToast({ title: '已提交审核', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
    }
  },

  // ===== 管理员功能 =====
  async loadAdminData() {
    wx.showLoading({ title: '加载中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      const bannerRes = await callFunction('getBanners').catch(() => ({ list: [] }));
      const allRes = await require('../../services/serviceService').getProviderList({ page: 1, pageSize: 100 });
      this.setData({ adminBanners: bannerRes.list || [], allProviders: allRes.list || [] });
    } catch (err) { console.error(err); }
    finally { wx.hideLoading(); }
  },

  onAddBanner() {
    wx.showModal({
      title: '新增Banner', editable: true, placeholderText: '请输入标题',
      success: async (res) => {
        if (!res.confirm || !res.content) return;
        wx.showLoading({ title: '保存中...' });
        try {
          const { callFunction } = require('../../services/cloud');
          await callFunction('saveBanner', { title: res.content });
          wx.hideLoading(); wx.showToast({ title: '已添加', icon: 'success' });
          this.loadAdminData();
        } catch (err) { wx.hideLoading(); wx.showToast({ title: '失败', icon: 'none' }); }
      }
    });
  },

  onEditBanner(e) {
    const { id, title } = e.currentTarget.dataset;
    wx.showModal({
      title: '编辑Banner', editable: true, placeholderText: '请输入新标题', content: title,
      success: async (res) => {
        if (!res.confirm || !res.content) return;
        wx.showLoading({ title: '保存中...' });
        try {
          const { callFunction } = require('../../services/cloud');
          await callFunction('saveBanner', { bannerId: id, title: res.content });
          wx.hideLoading(); wx.showToast({ title: '已更新', icon: 'success' });
          this.loadAdminData();
        } catch (err) { wx.hideLoading(); wx.showToast({ title: '失败', icon: 'none' }); }
      }
    });
  },

  onDeleteBanner(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除', content: '删除后不可恢复',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中...' });
        try {
          const { callFunction } = require('../../services/cloud');
          await callFunction('deleteBanner', { bannerId: id });
          wx.hideLoading(); wx.showToast({ title: '已删除', icon: 'success' });
          this.loadAdminData();
        } catch (err) { wx.hideLoading(); wx.showToast({ title: '失败', icon: 'none' }); }
      }
    });
  },

  async onBannerImage(e) {
    const bannerId = e.currentTarget.dataset.id;
    // 保留原标题
    const existing = this.data.adminBanners.find(b => b._id === bannerId);
    const title = existing ? existing.title : 'Banner';
    const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'] });
    if (!res.tempFilePaths.length) return;
    wx.showLoading({ title: '上传中...' });
    try {
      const { uploadFile, callFunction } = require('../../services/cloud');
      const cloudPath = `banners/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const fileID = await uploadFile(cloudPath, res.tempFilePaths[0]);
      await callFunction('saveBanner', { bannerId: bannerId || undefined, title, image: fileID });
      wx.hideLoading();
      wx.showToast({ title: '已保存', icon: 'success' });
      this.loadAdminData();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  previewBannerImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },

  goManagePortfolios(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/admin/providerPortfolios?providerId=${id}&providerName=${name}` });
  },

  async onToggleFeatured(e) {
    const { id } = e.currentTarget.dataset;
    const featured = e.detail.value;
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('toggleFeatured', { providerId: id, featured });
    } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },
});
