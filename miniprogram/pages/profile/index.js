const app = getApp();
const { switchRole: switchRoleApi } = require('../../services/userService');

Page({
  data: {
    userInfo: null, activeRole: 'user', hasLogin: false, roles: [],
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
  goEditProfile() { wx.navigateTo({ url: '/pages/provider/editProfile' }); },
  goAdmin() { wx.navigateTo({ url: '/pages/admin/dashboard' }); },

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
