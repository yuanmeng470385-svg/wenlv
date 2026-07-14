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
      return { code: 0, data: {}, message: '退款已通过' };
    } else {
      await db.collection('orders').doc(orderId).update({
        data: { orderStatus: 'paid', refundAmount: 0, updateTime: db.serverDate() }
      });
      return { code: 0, data: {}, message: '退款已驳回' };
    }
  } catch (err) { return { code: 9999, message: err.message }; }
};
