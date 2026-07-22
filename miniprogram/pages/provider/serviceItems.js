const app = getApp();

Page({
  data: { items: [], loading: true },

  onShow() { this.loadItems(); },

  async loadItems() {
    this.setData({ loading: true });
    try {
      const { callFunction } = require('../../services/cloud');
      const data = await callFunction('getMyServiceItems', { role: app.getActiveRole() });
      const STATUS_CHIP = {
        active: ['st-cel', '上架中'], inactive: ['st-gray', '已下架'],
        pending_review: ['st-gold', '审核中'], rejected: ['st-red', '已驳回'],
      };
      const items = (data || []).map(it => {
        const chip = STATUS_CHIP[it.status] || ['st-gray', it.status || ''];
        return Object.assign({}, it, {
          _statusClass: chip[0], _statusLabel: chip[1],
          _canToggle: it.status === 'active' || it.status === 'inactive',
          _isOn: it.status === 'active',
        });
      });
      this.setData({ items });
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
    // 被拒/待审的不能自行上下架
    if (item.status !== 'active' && item.status !== 'inactive') {
      wx.showToast({ title: item.status === 'pending_review' ? '等待管理员审核' : '已被管理员驳回，无法操作', icon: 'none' });
      return;
    }
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('saveServiceItem', {
        role: app.getActiveRole(),
        serviceItemId: item._id, name: item.name, price: item.price / 100,
        priceType: item.priceType, duration: item.duration, status: newStatus,
        description: item.description,
        includes: item.includes, maxDailyBooking: item.maxDailyBooking,
      });
      wx.showToast({ title: newStatus === 'active' ? '已上架' : '已下架', icon: 'success' });
      this.loadItems();
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除', content: '删除后不可恢复',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const { callFunction } = require('../../services/cloud');
          await callFunction('deleteServiceItem', { serviceItemId: id, role: app.getActiveRole() });
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadItems();
        } catch (err) {
          wx.showToast({ title: (err && err.message) || '删除失败', icon: 'none' });
        }
      }
    });
  },

  getPriceTypeLabel(t) {
    const m = { fixed: '固定套餐', hourly: '按时计费' };
    return m[t] || t;
  },
});
