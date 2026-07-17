Page({
  data: { list: [] },
  onShow() { this.loadList(); },
  async loadList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const { callFunction } = require('../../../../services/cloud');
      const res = await callFunction('getPendingAvatarUpdates');
      this.setData({ list: res.list || [] });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { wx.hideLoading(); }
  },
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },
  async onApprove(e) {
    const { id, field } = e.currentTarget.dataset;
    try {
      const { callFunction } = require('../../../../services/cloud');
      await callFunction('approveAvatarUpdate', { providerId: id, field, action: 'approve' });
      wx.showToast({ title: '已通过', icon: 'success' });
      this.loadList();
    } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },
  async onReject(e) {
    const { id, field } = e.currentTarget.dataset;
    try {
      const { callFunction } = require('../../../../services/cloud');
      await callFunction('approveAvatarUpdate', { providerId: id, field, action: 'reject' });
      wx.showToast({ title: '已拒绝', icon: 'success' });
      this.loadList();
    } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },
});
