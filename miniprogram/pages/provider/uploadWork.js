const { uploadFile, callFunction } = require('../../services/cloud');
const app = getApp();

Page({
  data: {
    images: [],
    title: '',
    description: '',
    styleTags: '',
    uploading: false,
  },

  async onChooseImage() {
    const res = await wx.chooseImage({ count: 9, sizeType: ['compressed'] });
    wx.showLoading({ title: '上传中...' });
    const ids = [];
    for (const path of res.tempFilePaths) {
      const cloudPath = `portfolios/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const fileID = await uploadFile(cloudPath, path);
      ids.push(fileID);
    }
    this.setData({ images: this.data.images.concat(ids) });
    wx.hideLoading();
  },

  onInputChange(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  async onSubmit() {
    if (!this.data.images.length || !this.data.title) {
      wx.showToast({ title: '请上传作品并填写标题', icon: 'none' }); return;
    }

    this.setData({ uploading: true });
    try {
      await callFunction('uploadPortfolio', {
        role: app.getActiveRole(),
        title: this.data.title,
        description: this.data.description,
        images: this.data.images,
        styleTags: this.data.styleTags.split(',').map(t => t.trim()).filter(Boolean),
      });
      wx.showToast({ title: '作品已提交审核', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      this.setData({ uploading: false });
    }
  },
});
