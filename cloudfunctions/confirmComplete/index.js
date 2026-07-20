const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 确认服务完成（订单从 pending_complete → completed）
 * 客户本人或订单关联商家均可确认
 * event: { orderId }
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { orderId } = event;

  try {
    if (!orderId) return { code: 1001, message: '缺少 orderId' };

    const orderRes = await db.collection('orders').doc(orderId).get();
    if (!orderRes.data) return { code: 1003, message: '订单不存在' };
    const order = orderRes.data;
    if (order.orderStatus !== 'pending_complete') return { code: 2001, message: '仅待确认完成的订单可操作' };

    // 客户本人或订单关联商家均可确认
    const isOwner = order.userId === openid;
    const providerIds = [...new Set(order.items.map(i => i.providerId))];
    let isProvider = false;
    if (!isOwner) {
      const provRes = await db.collection('providers').where({ userId: openid, _id: db.command.in(providerIds) }).get();
      isProvider = provRes.data.length > 0;
    }
    if (!isOwner && !isProvider) return { code: 1002, message: '无权操作此订单' };

    await db.collection('orders').doc(orderId).update({
      data: { orderStatus: 'completed', updateTime: db.serverDate() }
    });

    // 更新关联服务商的订单数 + 通知
    for (const pid of providerIds) {
      try {
        await db.collection('providers').doc(pid).update({
          data: { orderCount: db.command.inc(1), updateTime: db.serverDate() }
        });
        const pv = (await db.collection('providers').doc(pid).get()).data;
        if (pv && pv.userId) {
          await db.collection('notifications').add({ data: { userId: pv.userId, type: 'order_completed', title: '订单已完成', content: `订单 ${order.orderNo} 客户已确认完成`, relatedId: orderId, read: false, createTime: db.serverDate() } });
        }
      } catch (e) { /* ignore */ }
    }

    return { code: 0, data: {}, message: '已确认完成' };
  } catch (err) {
    console.error('[confirmComplete]', err);
    return { code: 9999, message: err.message };
  }
};
