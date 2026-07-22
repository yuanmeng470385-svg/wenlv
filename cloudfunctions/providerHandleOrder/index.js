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
      start: 'in_progress',
      complete: 'pending_complete',
    };

    const updateData = {
      updateTime: db.serverDate(),
    };

    if (action === 'reject') {
      // 计算退款（与 cancelOrder 逻辑对齐）
      // 计算距离最早预约时间的小时数
      let minHours = Infinity;
      for (const item of order.items) {
        if (item.providerId === provider._id && item.appointmentDate && item.appointmentTime) {
          const target = new Date(`${item.appointmentDate}T${item.appointmentTime}:00+08:00`);
          const hours = (target - new Date()) / (1000 * 60 * 60);
          if (hours < minHours) minHours = hours;
        }
      }

      let refundAmount = 0;
      let needAdminRefund = false;

      if (order.orderStatus === 'paid') {
        // 未确认的订单：商家拒绝 = 用户取消，使用相同退款规则
        if (minHours > 24) {
          refundAmount = order.totalFee;
        } else if (minHours > 0) {
          refundAmount = Math.floor(order.totalFee * 0.5);
        } else {
          refundAmount = 0; // 已过期
        }
        needAdminRefund = refundAmount > 0;
      } else {
        // confirmed 状态：商家确认后又拒绝，全额退款但需管理员审核
        refundAmount = order.totalFee;
        needAdminRefund = true;
      }

      updateData.orderStatus = needAdminRefund ? 'pending_refund' : 'cancelled';
      updateData.cancelReason = reason || '商家拒绝接单';
      updateData.cancelTime = db.serverDate();
      updateData.refundAmount = refundAmount;
      if (needAdminRefund) {
        updateData.preRefundStatus = order.orderStatus;
      }

      // 更新支付记录
      const refundStatus = refundAmount >= order.totalFee ? 'pending_full_refund'
        : refundAmount > 0 ? 'pending_partial_refund' : 'no_refund';
      await db.collection('payments').where({ orderId }).update({
        data: { payStatus: refundStatus, updateTime: db.serverDate() }
      });
    } else {
      updateData.orderStatus = statusMap[action];
    }

    await db.collection('orders').doc(orderId).update({ data: updateData });

    // 通知下单用户
    const rejectMsg = action === 'reject'
      ? (updateData.orderStatus === 'pending_refund'
          ? `商家${provider.name}拒绝了您的订单${reason ? '：' + reason : ''}，退款需管理员审核`
          : `商家${provider.name}拒绝了您的订单${reason ? '：' + reason : ''}`)
      : '';
    const statusMsgs = {
      confirm: ['order_confirmed', '订单已确认', `商家${provider.name}已确认您的订单`],
      reject: ['order_rejected', '订单被拒绝', rejectMsg],
      start: ['order_started', '服务已开始', `商家${provider.name}已开始为您服务`],
      complete: ['order_pending_complete', '服务已完成', `商家${provider.name}已标记服务完成，请确认`],
    };
    const msg = statusMsgs[action];
    if (msg) {
      await db.collection('notifications').add({
        data: { userId: order.userId, type: msg[0], title: msg[1], content: msg[2], relatedId: orderId, read: false, createTime: db.serverDate() }
      }).catch(() => {});
    }

    return { code: 0, data: { orderStatus: updateData.orderStatus }, message: '操作成功' };
  } catch (err) {
    console.error('[providerHandleOrder]', err);
    return { code: 9999, message: '操作失败，请重试' };
  }
};
