const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 超时订单自动取消：paid 状态超过 24 小时未接单的订单，自动取消并全额退款。
 * 建议通过云函数定时触发器周期性调用（如每小时一次）。
 * event: { hours?: 24 }  可选，默认 24 小时
 */
exports.main = async (event, context) => {
  const { hours = 24 } = event;

  try {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const expiredOrders = await db.collection('orders').where({
      orderStatus: 'paid',
      createTime: _.lt(cutoff),
    }).get();

    let cancelled = 0;
    for (const order of expiredOrders.data) {
      await db.collection('orders').doc(order._id).update({
        data: {
          orderStatus: 'cancelled',
          cancelReason: `超过 ${hours} 小时无服务商接单，系统自动取消`,
          cancelTime: db.serverDate(),
          refundAmount: order.totalFee,
          updateTime: db.serverDate(),
        }
      });
      // 更新支付记录为退款状态
      try {
        await db.collection('payments').where({ orderId: order._id }).update({
          data: { payStatus: 'refund_full', updateTime: db.serverDate() }
        });
      } catch (e) { /* ignore */ }
      cancelled++;
    }

    console.log(`[cancelExpiredOrders] 检查 ${expiredOrders.data.length} 个超时订单，取消 ${cancelled} 个`);
    return { code: 0, data: { checked: expiredOrders.data.length, cancelled }, message: `已取消 ${cancelled} 个超时订单` };
  } catch (err) {
    console.error('[cancelExpiredOrders]', err);
    return { code: 9999, message: err.message };
  }
};
