const app = getApp();

const CATEGORY_META = {
  photographer: { glyph: '影', label: '摄影跟拍', grad: 'g-rouge' },
  makeup: { glyph: '妆', label: '妆造造型', grad: 'g-gold' },
  hanfu_shop: { glyph: '服', label: '汉服租赁', grad: 'g-cel' },
};

Page({
  data: {
    item: null,
    providerId: '',
    providerName: '',
    categoryType: '',
    _glyph: '影',
    _grad: 'g-rouge',
    _catLabel: '',
  },

  onLoad(options) {
    try {
      const item = JSON.parse(decodeURIComponent(options.item || '{}'));
      const meta = CATEGORY_META[item.categoryType] || CATEGORY_META.photographer;
      this.setData({
        item,
        providerId: options.providerId || item.providerId || '',
        providerName: options.providerName || '',
        categoryType: item.categoryType || '',
        _glyph: (item.name || meta.glyph).charAt(0),
        _grad: meta.grad,
        _catLabel: meta.label,
      });
    } catch (e) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onBook() {
    if (!this.data.item || !this.data.providerId) return;
    wx.navigateTo({
      url: `/pages/booking/index?providerId=${this.data.providerId}&serviceItemId=${this.data.item._id}`,
    });
  },

  // 查看商家详情
  onProviderTap() {
    if (!this.data.providerId) return;
    wx.navigateTo({ url: `/pages/serviceDetail/index?id=${this.data.providerId}` });
  },
});
