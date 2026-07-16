const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { orderId } = event;

  try {
    // 生产环境安全：仅 admin 可调用模拟完成
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }

    const orderRes = await db.collection('orders').doc(orderId).get();
    const order = orderRes.data;
    if (!order) return { code: 1003, message: '订单不存在' };
    if (order.userId !== openid) return { code: 1002, message: '无权操作' };
    if (order.orderStatus !== 'paid') return { code: 2001, message: '仅已支付订单可模拟完成' };

    await db.collection('orders').doc(orderId).update({
      data: { orderStatus: 'completed', updateTime: db.serverDate() }
    });

    return { code: 0, data: {}, message: '订单已完成（测试模式）' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
