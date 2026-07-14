const { getOrderDetail, cancelOrder } = require('../../services/orderService');

Page({
  data: {
    orderId: '',
    order: null,
    providers: [],
  },

  onLoad(options) {
    this.setData({ orderId: options.id });
    this.loadDetail();
  },

  async loadDetail() {
    wx.showLoading({ title: '加载中...' });
    try {
      const data = await getOrderDetail(this.data.orderId);
      this.setData({ order: data.order, providers: data.providers || [] });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  getStatusText(status) {
    const map = {
      pending_pay: '待付款', paid: '已付款', confirmed: '已确认',
      in_progress: '进行中', completed: '已完成', reviewed: '已评价',
      cancelled: '已取消',
    };
    return map[status] || status;
  },

  onCancelOrder() {
    const order = this.data.order;
    if (!order) return;
    wx.showModal({
      title: '取消订单',
      content: '确定要取消此订单吗？取消后不可恢复。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '取消中...' });
          try {
            const result = await cancelOrder(order._id, '用户主动取消');
            wx.hideLoading();
            wx.showToast({ title: result.message || '已取消', icon: 'success' });
            this.loadDetail();
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '取消失败', icon: 'none' });
          }
        }
      },
    });
  },

  async onMockPay() {
    if (!this.data.order || this.data.order.orderStatus !== 'pending_pay') return;
    wx.showLoading({ title: '模拟支付中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('mockPay', { orderId: this.data.orderId });
      wx.hideLoading();
      wx.showToast({ title: '支付成功', icon: 'success' });
      this.loadDetail();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '支付失败', icon: 'none' });
    }
  },

  onReview() {
    wx.navigateTo({ url: `/pages/review/create?orderId=${this.data.orderId}` });
  },

  onPay() {
    if (this.data.order && this.data.order.orderStatus === 'pending_pay') {
      const { payOrder } = require('../../services/orderService');
      wx.showLoading({ title: '支付中...' });
      payOrder(this.data.orderId).then(payment => {
        wx.hideLoading();
        wx.requestPayment({
          timeStamp: payment.timeStamp, nonceStr: payment.nonceStr,
          package: payment.package, signType: payment.signType || 'MD5',
          paySign: payment.paySign,
          success: () => {
            wx.showToast({ title: '支付成功', icon: 'success' });
            this.loadDetail();
          },
          fail: (e) => {
            if (e.errMsg && e.errMsg.includes('cancel')) {
              wx.showToast({ title: '已取消支付', icon: 'none' });
            }
          },
        });
      }).catch(() => { wx.hideLoading(); wx.showToast({ title: '支付失败', icon: 'none' }); });
    }
  },
});
