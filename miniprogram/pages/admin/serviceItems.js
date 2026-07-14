Page({
  data: { list: [], loading: true },
  onShow() { this.loadData(); },
  async loadData() {
    this.setData({ loading: true });
    try {
      const { callFunction } = require('../../services/cloud');
      this.setData({ list: (await callFunction('getPendingServiceItems')) || [] });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { this.setData({ loading: false }); }
  },
  getTypeLabel(t) { const m = { fixed: '固定套餐', hourly: '按时计费', project: '按项目' }; return m[t] || t; },
  async onAction(e) {
    const { id, action } = e.currentTarget.dataset;
    wx.showLoading({ title: '处理中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('reviewServiceItem', { serviceItemId: id, action });
      wx.hideLoading();
      wx.showToast({ title: action === 'approved' ? '已通过' : '已驳回', icon: 'success' });
      this.loadData();
    } catch (e) { wx.hideLoading(); wx.showToast({ title: '操作失败', icon: 'none' }); }
  },
});
