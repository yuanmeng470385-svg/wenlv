Page({
  data: {
    isEdit: false,
    serviceItemId: '',
    form: {
      name: '', description: '', priceType: 'fixed',
      price: '', originalPrice: '', duration: '60',
      includes: '', maxDailyBooking: '5',
    },
    priceTypes: [
      { key: 'fixed', label: '固定套餐' },
      { key: 'hourly', label: '按时计费' },
      { key: 'project', label: '按项目' },
    ],
    saving: false,
  },

  onLoad(options) {
    if (options.item) {
      const item = JSON.parse(decodeURIComponent(options.item));
      this.setData({
        isEdit: true,
        serviceItemId: item._id,
        form: {
          name: item.name || '',
          description: item.description || '',
          priceType: item.priceType || 'fixed',
          price: String((item.price || 0) / 100),
          originalPrice: String((item.originalPrice || item.price || 0) / 100),
          duration: String(item.duration || 60),
          includes: (item.includes || []).join(','),
          maxDailyBooking: String(item.maxDailyBooking || 5),
        },
      });
    }
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const form = { ...this.data.form, [field]: e.detail.value };
    this.setData({ form });
  },

  onPriceTypeChange(e) {
    const form = { ...this.data.form, priceType: e.currentTarget.dataset.type };
    this.setData({ form });
  },

  async onSubmit() {
    const f = this.data.form;
    if (!f.name.trim()) { wx.showToast({ title: '请输入套餐名称', icon: 'none' }); return; }
    if (!f.price || parseFloat(f.price) <= 0) { wx.showToast({ title: '请输入有效价格', icon: 'none' }); return; }

    this.setData({ saving: true });
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('saveServiceItem', {
        serviceItemId: this.data.isEdit ? this.data.serviceItemId : null,
        name: f.name.trim(),
        description: f.description.trim(),
        priceType: f.priceType,
        price: parseFloat(f.price),
        originalPrice: parseFloat(f.originalPrice) || parseFloat(f.price),
        duration: parseInt(f.duration) || 60,
        includes: f.includes.split(',').map(s => s.trim()).filter(Boolean),
        maxDailyBooking: parseInt(f.maxDailyBooking) || 5,
      });
      wx.showToast({ title: this.data.isEdit ? '套餐已更新' : '套餐已创建', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
});
