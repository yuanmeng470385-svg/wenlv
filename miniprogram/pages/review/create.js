const { createReview, getOrderDetail } = require('../../services/orderService');

Page({
  data: {
    orderId: '', order: null, providers: [],
    rating: 5, content: '', images: [], submitting: false,
  },

  onLoad(options) {
    this.setData({ orderId: options.orderId });
    this.loadOrderInfo();
  },

  async loadOrderInfo() {
    try {
      const data = await getOrderDetail(this.data.orderId);
      this.setData({ order: data.order, providers: data.providers || [] });
    } catch (err) {}
  },

  onRatingChange(e) { this.setData({ rating: e.currentTarget.dataset.rating }); },
  onInputChange(e) { this.setData({ content: e.detail.value }); },

  async onSubmit() {
    this.setData({ submitting: true });
    try {
      await createReview({
        orderId: this.data.orderId, rating: this.data.rating,
        content: this.data.content, images: this.data.images,
      });
      wx.showToast({ title: '评价成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.showToast({ title: '评价失败', icon: 'none' });
    } finally { this.setData({ submitting: false }); }
  },
});
