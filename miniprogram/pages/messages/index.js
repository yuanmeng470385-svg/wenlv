Page({
  data: { messages: [] },
  onShow() {
    this.setData({
      messages: [
        { id: 1, title: '订单确认通知', content: '您的订单 WL20260710001 已被商家确认', time: '2026-07-10 14:30', read: false },
        { id: 2, title: '支付成功', content: '订单 WL20260709002 支付成功', time: '2026-07-09 10:00', read: true },
        { id: 3, title: '欢迎使用文旅摄影预约', content: '感谢您的使用，祝您体验愉快！', time: '2026-07-08 08:00', read: true },
      ],
    });
  },
});
