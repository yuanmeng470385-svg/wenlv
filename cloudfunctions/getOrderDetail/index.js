const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { orderId } = event;

  try {
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const orderRes = await db.collection('orders').doc(orderId).get();
    if (!orderRes.data) return { code: 1003, message: '订单不存在' };

    const order = orderRes.data;
    let allowed = order.userId === openid;
    if (!allowed) {
      const me = (await db.collection('users').where({ _openid: openid }).get()).data[0];
      if (me && (me.roles || []).includes('admin')) allowed = true;
    }
    if (!allowed) {
      const mine = (await db.collection('providers').where({ userId: openid }).get()).data.map(p => p._id);
      if (order.items.some(i => mine.includes(i.providerId))) allowed = true;
    }
    if (!allowed) return { code: 1002, message: '无权查看此订单' };
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

