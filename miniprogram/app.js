// app.js - 文旅摄影预约小程序
App({
  onLaunch: function () {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d1gv9n7j56c0a3448',
        traceUser: true,
      });
    }

    this.globalData = {
      userInfo: null,
      openid: null,
      activeRole: 'user',
      hasLogin: false,
    };
  },

  getActiveRole() {
    return this.globalData.activeRole;
  },

  switchRole(role) {
    this.globalData.activeRole = role;
  },

  checkLogin() {
    return this.globalData.hasLogin;
  },
});

