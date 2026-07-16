const { applyProvider } = require('../../services/userService');
const { uploadFile } = require('../../services/cloud');

Page({
  data: {
    categoryType: 'photographer',
    categories: [
      { type: 'photographer', label: '摄影师', icon: '📷' },
      { type: 'makeup', label: '妆造师', icon: '💄' },
      { type: 'hanfu_shop', label: '汉服店', icon: '👘' },
    ],
    name: '',
    city: '',
    phone: '',
    description: '',
    featureTags: '',
    coverImages: [],
    portfolioImages: [],
    submitting: false,
  },

  onSelectCategory(e) {
    this.setData({ categoryType: e.currentTarget.dataset.type });
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  async onUploadCover() {
    const res = await wx.chooseImage({ count: 3, sizeType: ['compressed'] });
    wx.showLoading({ title: '上传中...' });
    const ids = [];
    for (const path of res.tempFilePaths) {
      const cloudPath = `providers/covers/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const fileID = await uploadFile(cloudPath, path);
      ids.push(fileID);
    }
    this.setData({ coverImages: [...this.data.coverImages, ...ids] });
    wx.hideLoading();
  },

  async onUploadPortfolio() {
    const res = await wx.chooseImage({ count: 9, sizeType: ['compressed'] });
    wx.showLoading({ title: '上传中...' });
    const ids = [];
    for (const path of res.tempFilePaths) {
      const cloudPath = `portfolios/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const fileID = await uploadFile(cloudPath, path);
      ids.push(fileID);
    }
    this.setData({ portfolioImages: [...this.data.portfolioImages, ...ids] });
    wx.hideLoading();
  },

  async onSubmit() {
    if (!this.data.name || !this.data.phone) {
      wx.showToast({ title: '请填写名称和电话', icon: 'none' }); return;
    }
    if (this.data.categoryType === 'hanfu_shop' && !this.data.city) {
      wx.showToast({ title: '汉服店请填写所在城市', icon: 'none' }); return;
    }

    this.setData({ submitting: true });
    try {
      await applyProvider({
        categoryType: this.data.categoryType,
        name: this.data.name,
        city: this.data.city,
        phone: this.data.phone,
        description: this.data.description,
        featureTags: this.data.featureTags.split(',').map(t => t.trim()).filter(Boolean),
        coverImages: this.data.coverImages,
        portfolioImages: this.data.portfolioImages,
      });
      wx.showToast({ title: '申请已提交，等待审核', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
