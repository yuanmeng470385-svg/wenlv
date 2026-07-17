const { getCategoryList } = require('../../services/serviceService');
const { login } = require('../../services/userService');
const app = getApp();

Page({
  data: {
    banners: [{ id: 1, title: '古风汉服摄影' },{ id: 2, title: '专业妆造服务' },{ id: 3, title: '汉服租赁体验' }],
    categories: [], featuredWorks: [],
    activeRole: 'user', hasLogin: false,
    dashboard: { todayOrders: 0, pendingOrders: 0, totalOrders: 0 },
    recentOrders: [],
    providerName: '',
    provider: null,
    serviceItems: [],
    portfolios: [],
    reviews: [],
    activeTab: 'service',
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
        const { getProviderList } = require('../../services/serviceService');
        const [categories, providerRes] = await Promise.all([
          getCategoryList(), getProviderList({ page: 1, pageSize: 6 }),
        ]);
        let works = (providerRes && providerRes.list || []).map(p => ({
          _id: p._id,
          image: p.backgroundImage || p.avatar || '',
          providerName: p.name,
          providerAvatar: p.avatar || '',
          providerCategory: p.categoryType,
          providerId: p._id,
          likeCount: 0,
        }));
        // 不足6条补demo
        if (works.length < 6) {
          const demos = [
            { _id:'demo1',image:'',providerName:'古风摄影师阿杰',providerAvatar:'',providerCategory:'photographer',providerId:'demo1' },
            { _id:'demo2',image:'',providerName:'汉服妆造小雨',providerAvatar:'',providerCategory:'makeup',providerId:'demo2' },
            { _id:'demo3',image:'',providerName:'长安汉服体验馆',providerAvatar:'',providerCategory:'hanfu_shop',providerId:'demo3' },
            { _id:'demo4',image:'',providerName:'夜景人像专家',providerAvatar:'',providerCategory:'photographer',providerId:'demo4' },
            { _id:'demo5',image:'',providerName:'古韵妆造工作室',providerAvatar:'',providerCategory:'makeup',providerId:'demo5' },
            { _id:'demo6',image:'',providerName:'洛阳汉服租赁',providerAvatar:'',providerCategory:'hanfu_shop',providerId:'demo6' },
          ];
          works = [...works, ...demos].slice(0, 6);
        }
        this.setData({ categories: categories || [], featuredWorks: works });
      } else {
        const { callFunction } = require('../../services/cloud');
        const { getProviderDetail } = require('../../services/serviceService');
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
});
