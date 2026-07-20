const app = getApp();

const STATUS_MAP = {
  pending_pay: '待付款',
  paid: '已付款',
  confirmed: '已确认',
  in_progress: '进行中',
  pending_complete: '待确认完成',
  completed: '已完成',
  reviewed: '已评价',
  cancelled: '已取消',
  pending_refund: '退款中',
};

Page({
  data: {
    activeRole: 'user',
    currentTab: 'all',
    userTabs: [
      { key: 'all', label: '全部' },{ key: 'pending_pay', label: '待付款' },
      { key: 'paid', label: '已付款' },{ key: 'confirmed', label: '已确认' },
      { key: 'in_progress', label: '进行中' },{ key: 'pending_complete', label: '待确认' },
      { key: 'completed', label: '已完成' },
    ],
    providerTabs: [
      { key: 'all', label: '全部' },{ key: 'paid', label: '待确认' },
      { key: 'confirmed', label: '已确认' },{ key: 'in_progress', label: '进行中' },
      { key: 'pending_complete', label: '待确认完成' },
      { key: 'completed', label: '已完成' },{ key: 'cancelled', label: '已取消' },
    ],
    orders: [], page: 1, total: 0, hasMore: true,
    dashboard: { todayOrders: 0, pendingOrders: 0, totalOrders: 0 },
    isAdminMode: false,
  },

  onShow() {
    const adminMode = app.isAdminMode ? app.isAdminMode() : false;
    const role = app.getActiveRole();
    const hasLogin = app.checkLogin();
    const roleChanged = role !== this._lastRole;
    const loginChanged = hasLogin && !this._lastHasLogin;
    this._lastRole = role;
    this._lastHasLogin = hasLogin;
    this.setData({ activeRole: role, isAdminMode: adminMode });
    if (adminMode) return;
    // 首次/切换身份/刚登录 → 重新加载，普通切Tab用缓存
    if (!this._loaded || roleChanged || loginChanged) {
      this._loaded = true;
      this.setData({ page: 1, orders: [], hasMore: true });
      this.loadOrders();
      if (this.data.activeRole !== 'user') {
        this.loadDashboard();
      }
    }
  },

  async loadDashboard() {
    try {
      const { callFunction } = require('../../services/cloud');
      const res = await callFunction('getProviderDashboard', { role: this.data.activeRole });
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
      if (this.data.currentTab !== 'all') {
        // 已完成tab同时包含completed和reviewed（用户和商家都一样）
        params.status = this.data.currentTab === 'completed' ? ['completed', 'reviewed'] : this.data.currentTab;
      }

      const res = await callFunction(fnName, params);
      const rawList = this.data.page === 1 ? res.list : [...this.data.orders, ...res.list];
      const list = rawList.map(o => ({ ...o, statusText: STATUS_MAP[o.orderStatus] || o.orderStatus }));
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

  async onConfirmComplete(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认完成', content: '确认该订单已完成服务？',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          const { callFunction } = require('../../services/cloud');
          await callFunction('confirmComplete', { orderId });
          wx.hideLoading();
          wx.showToast({ title: '已确认完成', icon: 'success' });
          this.setData({ page: 1, orders: [], hasMore: true });
          this.loadOrders();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' });
        }
      }
    });
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

  // 管理员审核页面
  goAdminProviders() { wx.navigateTo({ url: '/pages/admin/providers' }); },
  goAdminPortfolios() { wx.navigateTo({ url: '/pages/admin/portfolios' }); },
  goAdminServiceItems() { wx.navigateTo({ url: '/pages/admin/serviceItems' }); },
  goAdminRefunds() { wx.navigateTo({ url: '/pages/admin/refunds' }); },
  goAdminAvatarUpdates() { wx.navigateTo({ url: '/pages/admin/avatarUpdates' }); },
  goAdminDeregistrations() { wx.navigateTo({ url: '/pages/admin/deregistrations' }); },
});
