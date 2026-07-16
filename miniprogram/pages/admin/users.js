const { callFunction } = require('../../services/cloud');

Page({
  data: {
    users: [], page: 1, total: 0, hasMore: true,
    keyword: '', statusFilter: '',
  },

  onShow() {
    this.setData({ page: 1, users: [], hasMore: true });
    this.loadUsers();
  },

  async loadUsers() {
    if (!this.data.hasMore && this.data.page > 1) return;
    wx.showLoading({ title: '加载中...' });
    try {
      const params = { page: this.data.page, pageSize: 20 };
      if (this.data.keyword) params.keyword = this.data.keyword;
      if (this.data.statusFilter) params.status = this.data.statusFilter;
      const res = await callFunction('adminGetUsers', params);
      const list = this.data.page === 1 ? res.list : [...this.data.users, ...res.list];
      this.setData({
        users: list,
        total: res.total,
        hasMore: list.length < res.total,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value });
  },

  onConfirmSearch() {
    this.setData({ page: 1, users: [], hasMore: true });
    this.loadUsers();
  },

  onFilterTap(e) {
    const v = e.currentTarget.dataset.value;
    this.setData({ statusFilter: v, page: 1, users: [], hasMore: true });
    this.loadUsers();
  },

  async onBanUser(e) {
    const userId = e.currentTarget.dataset.id;
    const currentStatus = e.currentTarget.dataset.status;
    const action = currentStatus === 'banned' ? 'unban' : 'ban';
    const title = action === 'ban' ? '确认封禁' : '确认解封';

    wx.showModal({
      title,
      content: action === 'ban' ? '封禁后该用户将无法登录' : '解封后该用户可正常使用',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中...' });
        try {
          await callFunction('banUser', { userId, action });
          wx.hideLoading();
          wx.showToast({ title: action === 'ban' ? '已封禁' : '已解封', icon: 'success' });
          this.setData({ page: 1, users: [], hasMore: true });
          this.loadUsers();
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '操作失败', icon: 'none' });
        }
      },
    });
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.setData({ page: this.data.page + 1 });
      this.loadUsers();
    }
  },
});
