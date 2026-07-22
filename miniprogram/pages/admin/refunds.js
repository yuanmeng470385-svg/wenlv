Page({
  data: { list: [], loading: true },
  onShow() { this.loadData(); },
  onPullDownRefresh() { this.loadData().finally(() => wx.stopPullDownRefresh()); },
  async loadData() {
    this.setData({ loading: true });
    try {
      const { callFunction } = require('../../services/cloud');
      this.setData({ list: (await callFunction('getPendingRefunds')) || [] });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { this.setData({ loading: false }); }
  },
  async onAction(e) {
    const { id, action } = e.currentTarget.dataset;
    const title = action === 'approved' ? '确认退款' : '确认驳回';
    const content = action === 'approved'
      ? '确定通过此退款申请？将向用户退款。'
      : '确定驳回此退款申请？';
    wx.showModal({
      title, content,
      confirmText: action === 'approved' ? '确认退款' : '确认驳回',
      confirmColor: action === 'approved' ? '#E74C3C' : '#000000',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          const { callFunction } = require('../../services/cloud');
          await callFunction('approveRefund', { orderId: id, action });
          wx.hideLoading();
          wx.showToast({ title: action === 'approved' ? '退款已通过' : '已驳回', icon: 'success' });
          this.loadData();
        } catch (e) { wx.hideLoading(); wx.showToast({ title: '操作失败', icon: 'none' }); }
      }
    });
  },

  onCardTap(e) {
    wx.navigateTo({ url: '/pages/orderDetail/index?id=' + e.currentTarget.dataset.id });
  },
});
