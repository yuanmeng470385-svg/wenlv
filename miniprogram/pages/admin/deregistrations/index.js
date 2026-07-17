Page({
  data: { list: [] },
  onShow() { this.loadList(); },
  async loadList() {
    wx.showLoading({ title: '加载中...' });
    try {
      const { callFunction } = require('../../../../services/cloud');
      const res = await callFunction('getPendingDeregistrations');
      this.setData({ list: res.list || [] });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { wx.hideLoading(); }
  },
  async onApprove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认注销', content: '将永久删除该商家所有数据，此操作不可撤销。',
      confirmText: '确认注销', confirmColor: '#E74C3C',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          const { callFunction } = require('../../../../services/cloud');
          await callFunction('approveDeregister', { providerId: id, action: 'approve' });
          wx.hideLoading();
          wx.showToast({ title: '已注销', icon: 'success' });
          this.loadList();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '操作失败', icon: 'none' });
        }
      }
    });
  },
  async onReject(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const { callFunction } = require('../../../../services/cloud');
      await callFunction('approveDeregister', { providerId: id, action: 'reject' });
      wx.showToast({ title: '已拒绝', icon: 'success' });
      this.loadList();
    } catch (err) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },
});
