const app = getApp();

Page({
  data: {
    activeRole: 'user',
    currentTab: 'all',
    userTabs: [
      { key: 'all', label: '全部' },{ key: 'pending_pay', label: '待付款' },
      { key: 'paid', label: '已付款' },{ key: 'confirmed', label: '已确认' },
      { key: 'in_progress', label: '进行中' },{ key: 'completed', label: '已完成' },
    ],
    providerTabs: [
      { key: 'all', label: '全部' },{ key: 'paid', label: '待确认' },
      { key: 'confirmed', label: '已确认' },{ key: 'in_progress', label: '进行中' },
      { key: 'completed', label: '已完成' },{ key: 'cancelled', label: '已取消' },
    ],
    orders: [], page: 1, total: 0, hasMore: true,
    dashboard: { todayOrders: 0, pendingOrders: 0, totalOrders: 0 },
  },

  onShow() {
    this.setData({ activeRole: app.getActiveRole(), page: 1, orders: [], hasMore: true });
    this.loadOrders();
    if (this.data.activeRole !== 'user') {
      this.loadDashboard();
    }
  },

  async loadDashboard() {
    try {
      const { callFunction } = require('../../services/cloud');
      const res = await callFunction('getProviderDashboard');
      this.setData({ dashboard: res.stats || this.data.dashboard });
    } catch (e) { /* ignore */ }
  },

  get tabs() {
    return this.data.activeRole === 'user' ? this.data.userTabs : this.data.providerTabs;
  },

  async loadOrders() {
    if (!this.data.hasMore && this.data.page > 1) return;
    wx.showLoading({ title: '加载中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      const isProvider = this.data.activeRole !== 'user';
      const fnName = isProvider ? 'getProviderOrders' : 'getOrderList';
      const params = { page: this.data.page, pageSize: 10 };
      if (isProvider) params.role = this.data.activeRole;
      if (this.data.currentTab !== 'all') params.status = this.data.currentTab;

      const res = await callFunction(fnName, params);
      const list = this.data.page === 1 ? res.list : [...this.data.orders, ...res.list];
      this.setData({ orders: list, total: res.total, hasMore: list.length < res.total });
    } catch (err) { console.error(err); }
    finally { wx.hideLoading(); }
  },

  onTabChange(e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab, page: 1, orders: [], hasMore: true });
    this.loadOrders();
  },

  onOrderTap(e) {
    wx.navigateTo({ url: '/pages/orderDetail/index?id=' + e.currentTarget.dataset.id });
  },

  async onProviderAction(e) {
    const { id, action } = e.currentTarget.dataset;
    wx.showLoading({ title: '处理中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      const res = await callFunction('providerHandleOrder', { orderId: id, action });
      wx.hideLoading();
      wx.showToast({ title: res.message || '操作成功', icon: 'success' });
      this.setData({ page: 1, orders: [], hasMore: true });
      this.loadOrders();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async onCallCustomer(e) {
    const orderId = e.currentTarget.dataset.id;
    if (!orderId) return;
    wx.showLoading({ title: '获取中...' });
    try {
      const { getContactPhone } = require('../../services/orderService');
      const res = await getContactPhone('order', orderId);
      wx.hideLoading();
      if (res && res.phone) {
        wx.makePhoneCall({ phoneNumber: res.phone });
      } else {
        wx.showToast({ title: '暂无电话', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '获取失败', icon: 'none' });
    }
  },

  onReachBottom() {
    if (this.data.hasMore) { this.setData({ page: this.data.page + 1 }); this.loadOrders(); }
  },

  goUploadWork() { wx.navigateTo({ url: '/pages/provider/uploadWork' }); },
  goMyWorks() { wx.navigateTo({ url: '/pages/provider/myWorks' }); },
  goServiceItems() { wx.navigateTo({ url: '/pages/provider/serviceItems' }); },
  goSchedule() { wx.navigateTo({ url: '/pages/provider/schedule' }); },
  goEditProfile() { wx.navigateTo({ url: '/pages/provider/editProfile' }); },
});
