const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 商家操作订单: confirm(确认接单) / reject(拒绝) / start(开始服务) / complete(完成)
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { orderId, action, reason } = event;

  try {
    // 找到服务商
    const providerRes = await db.collection('providers').where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您不是服务商' };
    const provider = providerRes.data[0];

    // 查订单，验证是否包含该服务商的服务项
    const orderRes = await db.collection('orders').doc(orderId).get();
    const order = orderRes.data;
    if (!order) return { code: 1003, message: '订单不存在' };

    const hasItem = order.items.some(i => i.providerId === provider._id);
    if (!hasItem) return { code: 1002, message: '该订单不包含您的服务' };

    const allowActions = {
      confirm: ['paid'],
      reject: ['paid', 'confirmed'],
      start: ['confirmed'],
      complete: ['in_progress'],
    };
    if (!allowActions[action] || !allowActions[action].includes(order.orderStatus)) {
      return { code: 2001, message: `订单状态 [${order.orderStatus}] 不允许 ${action} 操作` };
    }

    const statusMap = {
      confirm: 'confirmed',
      reject: 'cancelled',
      start: 'in_progress',
      complete: 'pending_complete',
    };

    const updateData = {
      orderStatus: statusMap[action],
      updateTime: db.serverDate(),
    };

    if (action === 'reject') {
      updateData.cancelReason = reason || '商家拒绝接单';
      updateData.cancelTime = db.serverDate();
      updateData.refundAmount = order.totalFee;
      // 更新支付记录为退款状态
      await db.collection('payments').where({ orderId }).update({
        data: { payStatus: 'refund_full', updateTime: db.serverDate() }
      });
    }

    await db.collection('orders').doc(orderId).update({ data: updateData });

    return { code: 0, data: { orderStatus: statusMap[action] }, message: '操作成功' };
  } catch (err) {
    console.error('[providerHandleOrder]', err);
    return { code: 9999, message: err.message };
  }
};
