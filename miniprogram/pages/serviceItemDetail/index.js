const { callFunction } = require('../../services/cloud');
const { getProviderDetail } = require('../../services/serviceService');

const CATEGORY_META = {
  photographer: { glyph: '影', label: '摄影跟拍', grad: 'g-rouge' },
  makeup: { glyph: '妆', label: '妆造造型', grad: 'g-gold' },
  hanfu_shop: { glyph: '服', label: '汉服租赁', grad: 'g-cel' },
};

Page({
  data: {
    item: null,
    loading: true,
    providerId: '',
    providerName: '',
    _glyph: '影',
    _grad: 'g-rouge',
    _catLabel: '',
  },

  onLoad(options) {
    const providerId = options.providerId || '';
    const serviceItemId = options.serviceItemId || '';
    const providerName = decodeURIComponent(options.providerName || '');
    this.setData({ providerId, providerName });
    if (!providerId || !serviceItemId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.loadItem(providerId, serviceItemId);
  },

  async loadItem(providerId, serviceItemId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const data = await getProviderDetail(providerId);
      const item = (data.serviceItems || []).find(s => s._id === serviceItemId);
      if (!item) {
        wx.hideLoading();
        wx.showToast({ title: '套餐不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }
      const meta = CATEGORY_META[item.categoryType] || CATEGORY_META.photographer;
      this.setData({
        item,
        loading: false,
        providerName: this.data.providerName || data.provider.name || '',
        _glyph: (item.name || meta.glyph).charAt(0),
        _grad: meta.grad,
        _catLabel: meta.label,
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onBook() {
    if (!this.data.item || !this.data.providerId) return;
    wx.navigateTo({
      url: `/pages/booking/index?providerId=${this.data.providerId}&serviceItemId=${this.data.item._id}`,
    });
  },

  onProviderTap() {
    if (!this.data.providerId) return;
    wx.navigateTo({ url: `/pages/serviceDetail/index?id=${this.data.providerId}` });
  },
});
