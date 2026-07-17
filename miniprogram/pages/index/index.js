const { getCategoryList } = require('../../services/serviceService');
const { login } = require('../../services/userService');
const app = getApp();

Page({
  data: {
    banners: [],
    categories: [], featuredWorks: [],
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
    } else if (hasLogin && (this._firstLoad || roleChanged || loginChanged)) {
      // 首次/切换身份/刚登录 → 拉数据；普通切Tab用缓存
      this.loadData();
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

  async loadData() {
    if (this._firstLoad) wx.showLoading({ title: '加载中...' });
    try {
      if (this.data.activeRole === 'user') {
        const { callFunction } = require('../../services/cloud');
        const { getCategoryList } = require('../../services/serviceService');

        // 缓存：banners 和 categories 只拉一次
        let banners = this.data.banners.length ? this.data.banners : [];
        let categories = this.data.categories.length ? this.data.categories : [];

        const promises = [];
        if (!banners.length) promises.push(callFunction('getBanners').then(r => { banners = r.list || []; }).catch(()=>{}));
        if (!categories.length) promises.push(getCategoryList().then(r => { categories = r || []; }).catch(()=>{}));
        const featuredPromise = callFunction('getFeaturedPortfolios').then(r => {
          const CATEGORY_EMOJI = { photographer: '📷', makeup: '💄', hanfu_shop: '👘' };
          const works = (r.list || []).map(p => ({
            _id: p._id,
            image: p.image || '',
            providerName: p.providerName,
            providerAvatar: p.providerAvatar || '',
            providerCategory: p.providerCategory,
            providerId: p.providerId,
            categoryEmoji: CATEGORY_EMOJI[p.providerCategory] || '📷',
          }));
          this.setData({ featuredWorks: works });
        }).catch(() => {
          // 回退：getFeaturedPortfolios 未部署时用 getFeaturedProviders
          return callFunction('getFeaturedProviders').then(r => {
            const CATEGORY_EMOJI = { photographer: '📷', makeup: '💄', hanfu_shop: '👘' };
            const works = (r.list || []).map(p => ({
              _id: p._id,
              image: p.backgroundImage || p.avatar || '',
              providerName: p.name,
              providerAvatar: p.avatar || '',
              providerCategory: p.categoryType,
              providerId: p._id,
              categoryEmoji: CATEGORY_EMOJI[p.categoryType] || '📷',
            }));
            this.setData({ featuredWorks: works });
          }).catch(()=>{});
        });
        promises.push(featuredPromise);

        await Promise.all(promises);
        if (banners.length) this.setData({ banners });
        if (categories.length) this.setData({ categories });
      } else {
        // 商家模式 - 首次加载或切换身份才拉数据
        if (this.data.provider && !this._firstLoad) return;
        const { callFunction } = require('../../services/cloud');
        const { getProviderDetail } = require('../../services/serviceService');
        const myRes = await callFunction('getMyProvider');
        if (myRes && myRes._id) {
          const detail = await getProviderDetail(myRes._id);
          const CATEGORY_EMOJI = { photographer: '📷', makeup: '💄', hanfu_shop: '👘' };
          const p = detail.provider;
          if (p) p._categoryEmoji = CATEGORY_EMOJI[p.categoryType] || '📷';
          this.setData({
            provider: p,
            serviceItems: detail.serviceItems || [],
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
