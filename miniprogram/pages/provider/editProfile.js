const app = getApp();
const { callFunction } = require('../../services/cloud');

Page({
  data: { name: '', phone: '', description: '', featureTags: '' },
  onLoad() { this.loadProfile(); },
  async loadProfile() {
    wx.showLoading({ title: '加载中...' });
    try {
      const data = await callFunction('getMyProvider', { role: app.getActiveRole() });
      this.setData(data);
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
  onInputChange(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  async onSubmit() {
    wx.showLoading({ title: '保存中...' });
    try {
      await callFunction('updateServiceItem', {
        role: app.getActiveRole(),
        name: this.data.name, phone: this.data.phone,
        description: this.data.description,
        featureTags: this.data.featureTags.split(',').map(t => t.trim()).filter(Boolean),
      });
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },
});
