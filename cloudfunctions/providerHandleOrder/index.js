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
    const { role } = event;
    const query = { userId: openid, status: 'active' };
    if (role) query.categoryType = role;
    const providerRes = await db.collection('providers').where(query).get();
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

    // 通知下单用户
    const statusMsgs = {
      confirm: ['order_confirmed', '订单已确认', `商家${provider.name}已确认您的订单`],
      reject: ['order_rejected', '订单被拒绝', `商家${provider.name}拒绝了您的订单${reason ? '：' + reason : ''}`],
      start: ['order_started', '服务已开始', `商家${provider.name}已开始为您服务`],
      complete: ['order_pending_complete', '服务已完成', `商家${provider.name}已标记服务完成，请确认`],
    };
    const msg = statusMsgs[action];
    if (msg) {
      await db.collection('notifications').add({ data: { userId: order.userId, type: msg[0], title: msg[1], content: msg[2], relatedId: orderId, read: false, createTime: db.serverDate() } }).catch(() => {});
    }

    return { code: 0, data: { orderStatus: statusMap[action] }, message: '操作成功' };
  } catch (err) {
    console.error('[providerHandleOrder]', err);
    return { code: 9999, message: err.message };
  }
};
