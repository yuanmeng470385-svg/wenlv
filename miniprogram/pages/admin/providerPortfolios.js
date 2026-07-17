Page({
  data: { providerId: '', providerName: '', list: [] },

  onLoad(options) {
    this.setData({ providerId: options.providerId || '', providerName: options.providerName || '' });
    if (options.providerName) {
      wx.setNavigationBarTitle({ title: options.providerName + ' - 作品精选' });
    }
  },

  onShow() { this.loadList(); },

  async loadList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      const res = await callFunction('getProviderPortfolios', { providerId: this.data.providerId });
      this.setData({ list: res.list || [] });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { wx.hideLoading(); }
  },

  async onToggleFeatured(e) {
    const { id } = e.currentTarget.dataset;
    const featured = e.detail.value;
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('togglePortfolioFeatured', { portfolioId: id, featured });
    } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },
});
