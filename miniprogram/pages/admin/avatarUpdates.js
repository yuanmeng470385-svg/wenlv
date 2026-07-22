Page({
  data: { list: [] },
  onShow() { this.loadList(); },
  async loadList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const { callFunction } = require('../../services/cloud');
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
    wx.showModal({
      title: '确认通过', content: '确定通过此头像/背景图变更？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const { callFunction } = require('../../services/cloud');
          await callFunction('approveAvatarUpdate', { providerId: id, field, action: 'approve' });
          wx.showToast({ title: '已通过', icon: 'success' });
          this.loadList();
        } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
      }
    });
  },
  async onReject(e) {
    const { id, field } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认拒绝', content: '确定拒绝此变更？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const { callFunction } = require('../../services/cloud');
          await callFunction('approveAvatarUpdate', { providerId: id, field, action: 'reject' });
          wx.showToast({ title: '已拒绝', icon: 'success' });
          this.loadList();
        } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
      }
    });
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.list.find(i => i._id === id);
    if (!item) return;
    const fieldName = item.field === 'avatar' ? '头像' : (item.field === 'backgroundImage' ? '背景图' : item.field);
    const lines = [
      '商家：' + (item.providerName || '未知'),
      '修改字段：' + fieldName,
      '新图片：点击图片可放大预览',
      '申请时间：' + (item.createTime || ''),
    ].join('\n');
    wx.showModal({ title: '头像/背景图变更详情', content: lines, showCancel: false, confirmText: '关闭' });
  },
});
