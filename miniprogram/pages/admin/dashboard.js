Page({
  data: { stats: {} },
  onShow() { this.loadStats(); },
  async loadStats() {
    try {
      const { callFunction } = require('../../services/cloud');
      this.setData({ stats: (await callFunction('getAdminDashboard')) || {} });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
  },
  goProviders() { wx.navigateTo({ url: '/pages/admin/providers' }); },
  goPortfolios() { wx.navigateTo({ url: '/pages/admin/portfolios' }); },
  goServiceItems() { wx.navigateTo({ url: '/pages/admin/serviceItems' }); },
  goRefunds() { wx.navigateTo({ url: '/pages/admin/refunds' }); },
  goUsers() { wx.navigateTo({ url: '/pages/admin/users' }); },
  goAvatarUpdates() { wx.navigateTo({ url: '/pages/admin/avatarUpdates' }); },
  goDeregistrations() { wx.navigateTo({ url: '/pages/admin/deregistrations' }); },
});
