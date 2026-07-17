const app = getApp();
const { switchRole: switchRoleApi } = require('../../services/userService');

Page({
  data: {
    userInfo: null, activeRole: 'user', hasLogin: false, roles: [],
    unreadCount: 0,
    menuItems: [
      { icon: '⭐', label: '我的收藏', url: '/pages/favorites/index' },
      { icon: '🔔', label: '消息通知', url: '/pages/messages/index' },
    ],
  },

  onShow() {
    const g = app.globalData;
    const rawRoles = g.userInfo ? (g.userInfo.roles || ['user']) : ['user'];
    const labelMap = { user: '用户', photographer: '摄影师', makeup: '妆造师', hanfu_shop: '汉服店' };
    const iconMap = { user: '👤', photographer: '📷', makeup: '💄', hanfu_shop: '👘' };
    // admin 通过“管理中心”入口访问，不作为可切换身份
    const switchableRoles = rawRoles.filter(r => r !== 'admin');
    const roleList = switchableRoles.map(r => ({ key: r, icon: iconMap[r] || '👤', label: labelMap[r] || r }));
    const isAdmin = rawRoles.includes('admin');
    this.setData({
      userInfo: g.userInfo, activeRole: g.activeRole,
      hasLogin: g.hasLogin, roles: switchableRoles, roleList, isAdmin,
    });
    this.loadUnreadCount();
  },

  async loadUnreadCount() {
    try {
      const res = await require('../../services/cloud').callFunction('getNotifications', { page: 1, pageSize: 1 });
      this.setData({ unreadCount: res.unreadCount || 0 });
    } catch (e) { /* ignore */ }
  },

  async onSwitchRole(e) {
    const role = e.currentTarget.dataset.role;
    if (role === this.data.activeRole) return;
    wx.showLoading({ title: '切换中...' });
    try {
      await switchRoleApi(role);
      app.switchRole(role);
      this.setData({ activeRole: role });
      wx.showToast({ title: '身份已切换', icon: 'success' });
      wx.switchTab({ url: '/pages/index/index' });
    } catch (err) { wx.hideLoading(); wx.showToast({ title: '切换失败', icon: 'none' }); }
  },

  onApplyProvider() { wx.navigateTo({ url: '/pages/provider/register' }); },
  onMenuTap(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  },

  // 商家菜单
  goUploadWork() { wx.navigateTo({ url: '/pages/provider/uploadWork' }); },
  goMyWorks() { wx.navigateTo({ url: '/pages/provider/myWorks' }); },
  goServiceItems() { wx.navigateTo({ url: '/pages/provider/serviceItems' }); },
  goSchedule() { wx.navigateTo({ url: '/pages/provider/schedule' }); },
  goOrders() { wx.switchTab({ url: '/pages/orderList/index' }); },
  goEditProfile() { wx.navigateTo({ url: '/pages/provider/editProfile' }); },
  goAdmin() { wx.navigateTo({ url: '/pages/admin/dashboard' }); },

  onDeregister() {
    wx.showModal({
      title: '注销商家身份',
      content: '注销后将永久删除您的店铺及所有数据（作品、套餐、评价），且不可恢复。确定继续吗？',
      confirmText: '确定注销',
      confirmColor: '#E74C3C',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '提交中...' });
        try {
          const { callFunction } = require('../../services/cloud');
          await callFunction('requestDeregister');
          wx.hideLoading();
          wx.showToast({ title: '已提交审核', icon: 'success' });
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
        }
      }
    });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp();
          app.globalData = {};
          wx.clearStorageSync();
          wx.reLaunch({ url: '/pages/index/index' });
        }
      }
    });
  },

  async onGetUserInfo(e) {
    if (e.detail.userInfo) {
      try {
        const { login } = require('../../services/userService');
        const res = await login({ nickName: e.detail.userInfo.nickName, avatarUrl: e.detail.userInfo.avatarUrl });
        app.globalData.userInfo = res.userInfo; app.globalData.hasLogin = true;
        this.setData({ userInfo: res.userInfo, hasLogin: true });
      } catch (err) { console.error(err); }
    }
  },
});
