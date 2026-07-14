const { getFavorites } = require('../../services/orderService');

Page({
  data: {
    activeTab: 'provider',
    list: [],
  },

  onShow() {
    this.loadFavorites();
  },

  async loadFavorites() {
    wx.showLoading({ title: '加载中...' });
    try {
      const data = await getFavorites();
      const filtered = (data || []).filter(f => f.targetType === this.data.activeTab);
      this.setData({ list: filtered });
    } catch (err) {
      console.error(err);
    } finally {
      wx.hideLoading();
    }
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
    this.loadFavorites();
  },

  onItemTap(e) {
    const item = e.currentTarget.dataset.item;
    if (item.targetType === 'provider') {
      wx.navigateTo({ url: `/pages/serviceDetail/index?id=${item.targetId}` });
    } else {
      wx.navigateTo({ url: `/pages/portfolioDetail/index?id=${item.targetId}` });
    }
  },
});
