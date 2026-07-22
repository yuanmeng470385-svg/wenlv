const { getProviderDetail } = require('../../services/serviceService');
const { createOrder, payOrder } = require('../../services/orderService');
const timeUtil = require('../../utils/timeUtil');
const priceUtil = require('../../utils/priceUtil');
const validator = require('../../utils/validator');

Page({
  data: {
    providerId: '',
    preselectServiceItemId: '',
    provider: null,
    serviceItems: [],
    cart: [],
    dateList: [],
    timeSlots: [],
    contactName: '',
    contactPhone: '',
    remark: '',
    totalFee: 0,
    currentStep: 1,
    singleMode: false,   // 单项目模式：从套餐详情进入，只能预约一个项目

  onShow() { this.restoreCart(); },
  onLoad(options) {
    const providerId = options.providerId || '';
    const serviceItemId = options.serviceItemId || '';
    const singleMode = !!serviceItemId;
    this.setData({ providerId, preselectServiceItemId: serviceItemId, singleMode });
    this.setData({
      dateList: timeUtil.getDateList(30),
      timeSlots: timeUtil.getDefaultTimeSlots(),
    });
    this.loadProviderData();
  },

  // 离开时保存已选（下单成功后清空，见 onSubmit）
  onHide() { this.saveCart(); },
  onUnload() { this.saveCart(); },

  saveCart() {
    try { wx.setStorageSync('booking_cart', JSON.stringify(this.data.cart)); } catch(e) {}
  },

  restoreCart() {
    // 单项目模式不恢复旧购物车
    if (this.data.singleMode) return;
    try {
      const saved = wx.getStorageSync('booking_cart');
      if (saved) { const cart = JSON.parse(saved); if (cart.length) this.setData({ cart }); this.calcTotal(); }
    } catch(e) {}
  },

  async loadProviderData() {
    if (!this.data.providerId || this.data.providerId === 'undefined') {
      wx.showToast({ title: '请先选择服务商', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    try {
      const data = await getProviderDetail(this.data.providerId);
      this.setData({ provider: data.provider, serviceItems: data.serviceItems });
      if (this.data.preselectServiceItemId) {
        const item = data.serviceItems.find(s => s._id === this.data.preselectServiceItemId);
        if (item) this.addToCart(item);
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  addToCart(e) {
    // 兼容两种调用：代码传对象 / 点触传事件
    const item = e && e.currentTarget ? e.currentTarget.dataset.item : e;
    if (!item || !item._id) { wx.showToast({ title: '服务信息有误', icon: 'none' }); return; }
    const exists = this.data.cart.find(c => c._id === item._id);
    if (exists) { wx.showToast({ title: '已添加', icon: 'none' }); return; }
    const cartItem = {
      _id: item._id, providerId: item.providerId, categoryType: item.categoryType,
      name: item.name, price: item.price, priceType: item.priceType,
      duration: item.duration, quantity: 1, hours: 1,
      appointmentDate: '', appointmentTime: '',
    };
    const cart = this.data.cart.concat(cartItem);
    this.setData({ cart });
    this.calcTotal();
  },

  removeFromCart(e) {
    const idx = e.currentTarget.dataset.index;
    const cart = this.data.cart.filter((_, i) => i !== idx);
    this.setData({ cart });
    this.calcTotal();
  },

  calcTotal() {
    const totalFee = priceUtil.calcTotalFee(this.data.cart.map(item => ({
      price: item.price, priceType: item.priceType,
      duration: item.priceType === 'hourly' ? item.hours * 60 : item.duration,
      quantity: item.quantity,
    })));
    this.setData({ totalFee });
  },

  onSelectDate(e) {
    const { date, idx } = e.currentTarget.dataset;
    const cart = this.data.cart.concat();
    cart[idx].appointmentDate = date;
    this.setData({ cart });
  },

  onSelectTime(e) {
    const { time, idx } = e.currentTarget.dataset;
    const cart = this.data.cart.concat();
    cart[idx].appointmentTime = time;
    this.setData({ cart });
  },

  onHoursChange(e) {
    const idx = e.currentTarget.dataset.idx;
    const hours = parseInt(e.detail.value) || 1;
    const cart = this.data.cart.concat();
    cart[idx].hours = hours;
    this.setData({ cart });
    this.calcTotal();
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  nextStep() { this.setData({ currentStep: this.data.currentStep + 1 }); },
  prevStep() { this.setData({ currentStep: this.data.currentStep - 1 }); },

  async onSubmit() {
    const errors = validator.validateBookingForm({
      contactName: this.data.contactName,
      contactPhone: this.data.contactPhone,
      items: this.data.cart,
    });
    if (errors.length) { wx.showToast({ title: errors[0], icon: 'none' }); return; }

    wx.showLoading({ title: '创建订单中...' });
    try {
      const orderRes = await createOrder({
        items: this.data.cart.map(item => ({
          serviceItemId: item._id, quantity: item.quantity, hours: item.hours,
          appointmentDate: item.appointmentDate, appointmentTime: item.appointmentTime,
          name: item.name,
        })),
        contactName: this.data.contactName,
        contactPhone: this.data.contactPhone,
        remark: this.data.remark,
      });
      wx.hideLoading();
      const orderId = orderRes.orderId;
      // 下单成功，清空购物车
      try { wx.removeStorageSync('booking_cart'); } catch(e) {}
      wx.hideLoading();
      const app = getApp();
      const isAdmin = app.globalData.userInfo && (app.globalData.userInfo.roles || []).includes('admin');
      const payOptions = isAdmin
        ? ['模拟支付(测试模式)', '微信支付(需商户号)', '稍后支付']
        : ['微信支付', '稍后支付'];
      wx.showActionSheet({
        itemList: payOptions,
        success: (res) => {
          if (isAdmin && res.tapIndex === 0) {
            this.doMockPay(orderId);
          } else if ((isAdmin && res.tapIndex === 1) || (!isAdmin && res.tapIndex === 0)) {
            this.doPay(orderId);
          } else {
            wx.redirectTo({ url: `/pages/orderDetail/index?id=${orderId}` });
          }
        },
        fail: () => {
          wx.redirectTo({ url: `/pages/orderDetail/index?id=${orderId}` });
        },
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '创建失败', icon: 'none' });
    }
  },

  async doMockPay(orderId) {
    wx.showLoading({ title: '模拟支付中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('mockPay', { orderId });
      wx.hideLoading();
      wx.showToast({ title: '模拟支付成功', icon: 'success' });
      wx.redirectTo({ url: `/pages/orderDetail/index?id=${orderId}` });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '支付失败', icon: 'none' });
    }
  },

  async doPay(orderId) {
    wx.showLoading({ title: '支付中...' });
    try {
      const payment = await payOrder(orderId);
      wx.hideLoading();
      await new Promise((resolve, reject) => {
        wx.requestPayment({
          timeStamp: payment.timeStamp, nonceStr: payment.nonceStr,
          package: payment.package, signType: payment.signType || 'MD5',
          paySign: payment.paySign, success: resolve, fail: reject,
        });
      });
      wx.showToast({ title: '支付成功', icon: 'success' });
      wx.redirectTo({ url: `/pages/orderDetail/index?id=${orderId}` });
    } catch (err) {
      wx.hideLoading();
      if (err.errMsg && err.errMsg.includes('cancel')) {
        wx.showToast({ title: '已取消支付', icon: 'none' });
      } else {
        wx.showToast({ title: '支付失败，请重试', icon: 'none' });
      }
    }
  },
});
