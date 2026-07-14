const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { orderId } = event;

  try {
    const orderRes = await db.collection('orders').doc(orderId).get();
    const order = orderRes.data;
    if (!order) return { code: 1003, message: '订单不存在' };
    if (order.userId !== openid) return { code: 1002, message: '无权操作' };
    if (order.orderStatus !== 'pending_pay') return { code: 2001, message: '订单状态不允许支付' };

    await db.collection('orders').doc(orderId).update({
      data: {
        orderStatus: 'paid',
        payTime: db.serverDate(),
        updateTime: db.serverDate(),
      }
    });

    await db.collection('payments').add({
      data: {
        orderId: order._id,
        orderNo: order.orderNo,
        userId: openid,
        totalFee: order.totalFee,
        prepayId: 'MOCK_PREPAY',
        transactionId: 'MOCK_TXN_' + Date.now(),
        payStatus: 'success',
        payTime: db.serverDate(),
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
      }
    });

    return { code: 0, data: { orderId: order._id }, message: '模拟支付成功' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
