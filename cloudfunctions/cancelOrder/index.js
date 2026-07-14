const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { orderId, cancelReason } = event;

  try {
    const orderRes = await db.collection('orders').doc(orderId).get();
    const order = orderRes.data;

    if (!order) return { code: 1003, message: '订单不存在' };
    if (order.userId !== openid) return { code: 1002, message: '无权操作' };

    // 检查订单状态
    const canCancelStatuses = ['pending_pay', 'paid', 'confirmed'];
    if (!canCancelStatuses.includes(order.orderStatus)) {
      return { code: 2001, message: `订单状态 [${order.orderStatus}] 不允许取消` };
    }

    // 计算退款金额 (取所有预约项中最早的时间来判断)
    let minHours = Infinity;
    let earliestDate = '';
    let earliestTime = '';
    for (const item of order.items) {
      if (item.appointmentDate && item.appointmentTime) {
        const target = new Date(`${item.appointmentDate}T${item.appointmentTime}:00`);
        const hours = (target - new Date()) / (1000 * 60 * 60);
        if (hours < minHours) {
          minHours = hours;
          earliestDate = item.appointmentDate;
          earliestTime = item.appointmentTime;
        }
      }
    }

    let refundAmount = 0;
    let refundStatus = 'pending_refund';

    if (order.orderStatus === 'pending_pay') {
      // 未支付，直接取消
      refundAmount = 0;
      refundStatus = 'no_refund';
    } else if (minHours > 24) {
      // 提前24小时，全额退款
      refundAmount = order.totalFee;
      refundStatus = 'full_refund';
    } else if (minHours > 0) {
      // 24小时内，退50%
      refundAmount = Math.floor(order.totalFee * 0.5);
      refundStatus = 'partial_refund';
    } else {
      // 已过预约时间
      return { code: 2001, message: '已超过预约时间，无法取消' };
    }

    // 是否需要管理员审核退款
    const needAdminRefund = refundAmount > 0;

    const updateData = {
      orderStatus: needAdminRefund ? 'pending_refund' : 'cancelled',
      cancelReason: cancelReason || '',
      cancelTime: db.serverDate(),
      refundAmount,
      updateTime: db.serverDate(),
    };

    // 更新每个 item 的状态
    const updatedItems = order.items.map(item => ({
      ...item,
      status: item.status === 'pending_pay' ? 'cancelled' : item.status,
    }));
    updateData.items = updatedItems;

    await db.collection('orders').doc(orderId).update({ data: updateData });

    // 更新支付记录
    if (order.paymentId || order.orderStatus === 'paid') {
      const payUpdate = { payStatus: refundStatus, updateTime: db.serverDate() };
      try {
        await db.collection('payments').where({ orderId }).update({ data: payUpdate });
      } catch (e) { /* ignore */ }
    }

    // TODO: 如果已支付，调用 cloudPay.refund() 执行退款

    const msg = needAdminRefund
      ? `退款申请已提交（¥${(refundAmount/100).toFixed(2)}），等待管理员审核`
      : '订单已取消';

    return { code: 0, data: { refundAmount, refundStatus, needAdminRefund }, message: msg };
  } catch (err) {
    console.error('[cancelOrder]', err);
    return { code: 9999, message: err.message };
  }
};

