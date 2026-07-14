const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { orderId } = event;

  try {
    const orderRes = await db.collection('orders').doc(orderId).get();
    if (!orderRes.data) return { code: 1003, message: '订单不存在' };

    const order = orderRes.data;

    // 获取关联的服务商信息
    const providerIds = [...new Set(order.items.map(i => i.providerId))];
    const providers = [];
    for (const pid of providerIds) {
      try {
        const p = await db.collection('providers').doc(pid).get();
        if (p.data) providers.push(p.data);
      } catch (e) { /* ignore */ }
    }

    return {
      code: 0,
      data: { order, providers },
      message: 'success',
    };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};

