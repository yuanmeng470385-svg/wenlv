const app = getApp();

Page({
  data: { name: '', phone: '', description: '', featureTags: '' },
  onLoad() { this.loadProfile(); },
  async loadProfile() {
    const { callFunction } = require('../../services/cloud');
    try { const data = await callFunction('getMyProvider', { role: app.getActiveRole() }); this.setData(data); } catch (e) {}
  },
  onInputChange(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  async onSubmit() {
    const { callFunction } = require('../../services/cloud');
    try {
      await callFunction('updateServiceItem', {
        name: this.data.name, phone: this.data.phone,
        description: this.data.description,
        featureTags: this.data.featureTags.split(',').map(t => t.trim()).filter(Boolean),
      });
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) { wx.showToast({ title: '保存失败', icon: 'none' }); }
  },
});
