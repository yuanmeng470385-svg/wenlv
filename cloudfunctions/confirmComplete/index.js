const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 客户确认服务完成（订单从 pending_complete → completed）
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
    if (order.userId !== openid) return { code: 1002, message: '无权操作此订单' };
    if (order.orderStatus !== 'pending_complete') return { code: 2001, message: '仅待确认完成的订单可操作' };

    await db.collection('orders').doc(orderId).update({
      data: { orderStatus: 'completed', updateTime: db.serverDate() }
    });

    // 更新关联服务商的订单数
    const providerIds = [...new Set(order.items.map(i => i.providerId))];
    for (const pid of providerIds) {
      try {
        await db.collection('providers').doc(pid).update({
          data: { orderCount: db.command.inc(1), updateTime: db.serverDate() }
        });
      } catch (e) { /* ignore */ }
    }

    return { code: 0, data: {}, message: '已确认完成' };
  } catch (err) {
    console.error('[confirmComplete]', err);
    return { code: 9999, message: err.message };
  }
};
