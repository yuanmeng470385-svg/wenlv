Page({
  data: { list: [], loading: true },
  onShow() { this.loadData(); },

  async loadData() {
    this.setData({ loading: true });
    try {
      const { callFunction } = require('../../services/cloud');
      const res = await callFunction('getPendingPortfolios');
      this.setData({ list: (res && res.list) || [] });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { this.setData({ loading: false }); }
  },

  async onAction(e) {
    const { id, action } = e.currentTarget.dataset;
    wx.showLoading({ title: '处理中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('reviewPortfolio', { portfolioId: id, action });
      wx.hideLoading();
      wx.showToast({ title: action === 'approved' ? '已通过' : '已驳回', icon: 'success' });
      this.loadData();
    } catch (e) { wx.hideLoading(); wx.showToast({ title: '操作失败', icon: 'none' }); }
  },

  onCardTap(e) {
    wx.navigateTo({ url: '/pages/portfolioDetail/index?id=' + e.currentTarget.dataset.id });
  },
});
