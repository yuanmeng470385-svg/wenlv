const { callFunction } = require('../../services/cloud');

Page({
  data: { messages: [], unreadCount: 0 },

  onShow() {
    this.loadMessages();
  },

  async loadMessages() {
    try {
      const res = await callFunction('getNotifications', { page: 1, pageSize: 50 });
      const list = (res.list || []).map(item => ({
        ...item,
        time: this.formatTime(item.createTime),
      }));
      this.setData({ messages: list, unreadCount: res.unreadCount || 0 });
    } catch (err) {
      console.error('加载消息失败', err);
    }
  },

  onNotificationTap(e) {
    const item = e.currentTarget.dataset.item;
    if (item && !item.read) {
      callFunction('markNotificationRead', { notificationId: item._id }).then(() => {
        const messages = this.data.messages.map(m =>
          m._id === item._id ? { ...m, read: true } : m
        );
        this.setData({ messages, unreadCount: Math.max(0, this.data.unreadCount - 1) });
      }).catch(() => {});
    }
  },

  onMarkAllRead() {
    if (this.data.unreadCount === 0) return;
    wx.showLoading({ title: '处理中...' });
    callFunction('markNotificationRead', { markAll: true }).then(() => {
      wx.hideLoading();
      const messages = this.data.messages.map(m => ({ ...m, read: true }));
      this.setData({ messages, unreadCount: 0 });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  formatTime(t) {
    if (!t) return '';
    const d = new Date(t);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}月${day}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
});
