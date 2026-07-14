Page({
  data: {
    stats: { todayOrders: 0, pendingOrders: 0, totalIncome: 0, totalOrders: 0 },
    recentOrders: [],
  },

  onShow() {
    this.loadDashboard();
  },

  async loadDashboard() {
    wx.showLoading({ title: '加载中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      const data = await callFunction('getProviderDashboard');
      this.setData({
        stats: data.stats || this.data.stats,
        recentOrders: data.recentOrders || [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      wx.hideLoading();
    }
  },

  goUploadWork() { wx.navigateTo({ url: '/pages/provider/uploadWork' }); },
  goMyWorks() { wx.navigateTo({ url: '/pages/provider/myWorks' }); },
  goSchedule() { wx.navigateTo({ url: '/pages/provider/schedule' }); },
  goEditProfile() { wx.navigateTo({ url: '/pages/provider/editProfile' }); },
  goOrderDetail(e) { wx.navigateTo({ url: `/pages/orderDetail/index?id=${e.currentTarget.dataset.id}` }); },
});
