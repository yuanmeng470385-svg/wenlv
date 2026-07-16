const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  const { target, orderId, providerId } = event;

  try {
    // target=order: 获取订单联系人电话（需权限校验）
    if (target === 'order') {
      if (!orderId) return { code: 1001, message: '缺少 orderId' };

      const orderRes = await db.collection('orders').doc(orderId).get();
      if (!orderRes.data) return { code: 1003, message: '订单不存在' };
      const order = orderRes.data;

      // 权限校验：下单用户 / admin / 订单内商家
      let allowed = order.userId === openid;
      if (!allowed) {
        const me = (await db.collection('users').where({ _openid: openid }).get()).data[0];
        if (me && (me.roles || []).includes('admin')) allowed = true;
      }
      if (!allowed) {
        const mine = (await db.collection('providers').where({ userId: openid }).get()).data.map(p => p._id);
        if (order.items.some(i => mine.includes(i.providerId))) allowed = true;
      }
      if (!allowed) return { code: 1002, message: '无权查看此电话' };

      console.log(`[getContactPhone] target=order orderId=${orderId} caller=${openid}`);
      return { code: 0, data: { phone: order.contactPhone || '' }, message: 'success' };
    }

    // target=provider: 获取商家联系电话（已登录用户均可查看）
    if (target === 'provider') {
      if (!providerId) return { code: 1001, message: '缺少 providerId' };

      const providerRes = await db.collection('providers').doc(providerId).get();
      if (!providerRes.data) return { code: 1003, message: '服务商不存在' };

      console.log(`[getContactPhone] target=provider providerId=${providerId} caller=${openid}`);
      return { code: 0, data: { phone: providerRes.data.phone || '' }, message: 'success' };
    }

    return { code: 1001, message: 'target 必须为 order 或 provider' };
  } catch (err) {
    console.error('[getContactPhone]', err);
    return { code: 9999, message: err.message };
  }
};
