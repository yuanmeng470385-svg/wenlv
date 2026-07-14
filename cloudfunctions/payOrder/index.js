const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { orderId } = event;

  try {
    // 查询订单
    const orderRes = await db.collection('orders').doc(orderId).get();
    const order = orderRes.data;

    if (!order) {
      return { code: 1003, message: '订单不存在' };
    }
    if (order.userId !== openid) {
      return { code: 1002, message: '无权操作此订单' };
    }
    if (order.orderStatus !== 'pending_pay') {
      return { code: 2001, message: '订单状态不允许支付' };
    }

    // 调用微信支付统一下单
    const payResult = await cloud.cloudPay.unifiedOrder({
      body: `文旅摄影预约-${order.items.length}项服务`,
      outTradeNo: order.orderNo,
      spbillCreateIp: '127.0.0.1',
      subMchId: '',           // TODO: 填入商户号
      totalFee: order.totalFee,
      envId: cloud.DYNAMIC_CURRENT_ENV,
      functionName: 'payCallback',
      tradeType: 'JSAPI',
    });

    // 记录支付流水
    await db.collection('payments').add({
      data: {
        orderId: order._id,
        orderNo: order.orderNo,
        userId: openid,
        totalFee: order.totalFee,
        prepayId: payResult.prepayId || '',
        payStatus: 'pending',
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
      }
    });

    // 返回小程序调起支付参数
    return {
      code: 0,
      data: payResult.payment,  // { timeStamp, nonceStr, package, signType, paySign }
      message: 'success',
    };
  } catch (err) {
    console.error('[payOrder]', err);
    return { code: 2003, message: err.message || '支付失败' };
  }
};

