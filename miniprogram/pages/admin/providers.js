Page({
  data: { list: [], loading: true },
  onShow() { this.loadData(); },

  async loadData() {
    this.setData({ loading: true });
    try {
      const { callFunction } = require('../../services/cloud');
      this.setData({ list: (await callFunction('getPendingProviders')) || [] });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { this.setData({ loading: false }); }
  },

  getTypeLabel(t) { const m = { photographer: '摄影师', makeup: '妆造师', hanfu_shop: '汉服店' }; return m[t] || t; },
  getCategoryIcon(t) { const m = { photographer: '📷', makeup: '💄', hanfu_shop: '👘' }; return m[t] || '📷'; },

  onPass(e) {
    const { id, type } = e.currentTarget.dataset;
    if (type === 'hanfu_shop') {
      this.doAction(id, 'approved', 0);
    } else {
      wx.showActionSheet({
        itemList: ['初级 ⭐', '中级 ⭐⭐', '高级 ⭐⭐⭐', '资深 ⭐⭐⭐⭐', '首席 ⭐⭐⭐⭐⭐'],
        success: (res) => this.doAction(id, 'approved', res.tapIndex + 1),
      });
    }
  },

  onReject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '驳回申请',
      content: '确定驳回此申请？',
      editable: true, placeholderText: '驳回原因（选填）',
      success: (res) => {
        if (res.confirm) this.doAction(id, 'rejected', 0, res.content || '');
      },
    });
  },

  async doAction(id, action, level, reason) {
    wx.showLoading({ title: '处理中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('approveProvider', { providerId: id, action, level, reason });
      wx.hideLoading();
      wx.showToast({ title: action === 'approved' ? '已通过' : '已驳回', icon: 'success' });
      this.loadData();
    } catch (e) { wx.hideLoading(); wx.showToast({ title: '操作失败', icon: 'none' }); }
  },

  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({ current: url, urls: JSON.parse(urls) });
  },

  onCardTap(e) {
    wx.navigateTo({ url: '/pages/serviceDetail/index?id=' + e.currentTarget.dataset.id });
  },
});
