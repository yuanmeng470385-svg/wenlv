const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { orderId, action } = event;
  try {
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }
    if (!['approved', 'rejected'].includes(action)) return { code: 1001, message: 'action 需为 approved 或 rejected' };

    if (action === 'approved') {
      await db.collection('orders').doc(orderId).update({
        data: { orderStatus: 'cancelled', updateTime: db.serverDate() }
      });
      await db.collection('payments').where({ orderId }).update({
        data: { payStatus: 'refund_full', updateTime: db.serverDate() }
      });
      // 审计日志
      await db.collection('auditLogs').add({ data: { adminOpenid: openid, action: 'approveRefund', targetId: orderId, createTime: db.serverDate() } });
      // 通知用户
      const ord = (await db.collection('orders').doc(orderId).get()).data;
      if (ord && ord.userId) {
        await db.collection('notifications').add({ data: { userId: ord.userId, type: 'refund_approved', title: '退款已通过', content: `订单 ${ord.orderNo} 的退款申请已通过`, relatedId: orderId, read: false, createTime: db.serverDate() } }).catch(() => {});
      }
      return { code: 0, data: {}, message: '退款已通过' };
    } else {
      // 驳回退款：恢复到退款前的状态
      const order = (await db.collection('orders').doc(orderId).get()).data;
      const restoreStatus = order.preRefundStatus || 'paid';
      await db.collection('orders').doc(orderId).update({
        data: { orderStatus: restoreStatus, refundAmount: 0, updateTime: db.serverDate() }
      });
      // 审计日志
      await db.collection('auditLogs').add({ data: { adminOpenid: openid, action: 'rejectRefund', targetId: orderId, createTime: db.serverDate() } });
      // 通知用户
      if (order && order.userId) {
        await db.collection('notifications').add({ data: { userId: order.userId, type: 'refund_rejected', title: '退款未通过', content: `订单 ${order.orderNo} 的退款申请未通过`, relatedId: orderId, read: false, createTime: db.serverDate() } }).catch(() => {});
      }
      return { code: 0, data: {}, message: '退款已驳回' };
    }
  } catch (err) { return { code: 9999, message: err.message }; }
};
