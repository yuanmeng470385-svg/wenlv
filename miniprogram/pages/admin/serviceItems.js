Page({
  data: { list: [], loading: true },
  onShow() { this.loadData(); },
  async loadData() {
    this.setData({ loading: true });
    try {
      const { callFunction } = require('../../services/cloud');
      const TYPE_LABEL = { fixed: '固定套餐', hourly: '按时计费' };
      const list = ((await callFunction('getPendingServiceItems')) || []).map(it =>
        Object.assign({}, it, { _typeLabel: TYPE_LABEL[it.priceType] || it.priceType })
      );
      this.setData({ list });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { this.setData({ loading: false }); }
  },
  getTypeLabel(t) { const m = { fixed: '固定套餐', hourly: '按时计费' }; return m[t] || t; },
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

  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.list.find(i => i._id === id);
    if (!item) return;
    const lines = [
      '套餐名称：' + (item.name || ''),
      '服务商：' + (item.providerName || ''),
      '价格类型：' + this.getTypeLabel(item.priceType),
      '售价：¥' + ((item.price || 0) / 100).toFixed(2),
      '时长：' + (item.duration || 0) + '分钟',
      '每日限单：' + (item.maxDailyBooking || 0),
      '包含内容：' + (item.includes || []).join('、'),
      '描述：' + (item.description || '无'),
    ].join('\n');
    wx.showModal({ title: '套餐详情', content: lines, showCancel: false, confirmText: '关闭' });
  },
});
