const { getCategoryList, getProviderList } = require('../../services/serviceService');
const { login } = require('../../services/userService');
const app = getApp();

Page({
  data: {
    banners: [{ id: 1, title: '古风汉服摄影' },{ id: 2, title: '专业妆造服务' },{ id: 3, title: '汉服租赁体验' }],
    categories: [], hotProviders: [],
    activeRole: 'user', hasLogin: false,
    dashboard: { todayOrders: 0, pendingOrders: 0, totalOrders: 0, rating: 0 },
    recentOrders: [],
    providerName: '',
    providerLevel: '',
    providerLevelNum: 0,
  },

  onLoad() { this.initPage(); },

  onShow() {
    this.setData({ activeRole: app.getActiveRole(), hasLogin: app.checkLogin() });
    if (this.data.hasLogin) this.loadData();
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
    wx.showLoading({ title: '加载中...' });
    try {
      if (this.data.activeRole === 'user') {
        const [categories, hotRes] = await Promise.all([
          getCategoryList(), getProviderList({ page: 1, pageSize: 6 }),
        ]);
        this.setData({ categories: categories || [], hotProviders: (hotRes && hotRes.list) || [] });
      } else {
        const { callFunction } = require('../../services/cloud');
        const res = await callFunction('getProviderDashboard');
        this.setData({
          dashboard: res.stats || this.data.dashboard,
          recentOrders: res.recentOrders || [],
          providerName: res.providerName || '',
          providerLevel: res.providerLevel || '',
          providerLevelNum: res.providerLevelNum || 0,
        });
      }
    } catch (err) { console.error('加载失败:', err); }
    finally { wx.hideLoading(); }
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
});
