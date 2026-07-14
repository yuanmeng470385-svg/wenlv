Page({
  data: { items: [], loading: true },

  onShow() { this.loadItems(); },

  async loadItems() {
    this.setData({ loading: true });
    try {
      const { callFunction } = require('../../services/cloud');
      const data = await callFunction('getMyServiceItems');
      this.setData({ items: data || [] });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/provider/editServiceItem' });
  },

  goEdit(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({ url: '/pages/provider/editServiceItem?item=' + JSON.stringify(item) });
  },

  async onToggleStatus(e) {
    const item = e.currentTarget.dataset.item;
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('saveServiceItem', {
        serviceItemId: item._id, name: item.name, price: item.price / 100,
        priceType: item.priceType, duration: item.duration, status: newStatus,
        description: item.description, originalPrice: item.originalPrice / 100,
        includes: item.includes, maxDailyBooking: item.maxDailyBooking,
      });
      wx.showToast({ title: newStatus === 'active' ? '已上架' : '已下架', icon: 'success' });
      this.loadItems();
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  getPriceTypeLabel(t) {
    const m = { fixed: '固定套餐', hourly: '按时计费', project: '按项目' };
    return m[t] || t;
  },
});
