const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 模拟完成订单（仅 admin + 订单所有者可调，仅用于测试）
 * 走完整状态流转：paid → confirmed → in_progress → pending_complete → completed
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { orderId } = event;

  try {
    // 仅 admin 可调用
    const adminRes = await db.collection('users').where({ _openid: openid }).get();
    if (!(adminRes.data[0] && (adminRes.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }

    const orderRes = await db.collection('orders').doc(orderId).get();
    const order = orderRes.data;
    if (!order) return { code: 1003, message: '订单不存在' };

    // admin 调用时不要求是订单所有者（方便管理员辅助测试）
    if (order.orderStatus !== 'paid' && order.orderStatus !== 'confirmed') {
      return { code: 2001, message: `订单状态 [${order.orderStatus}] 不支持模拟完成（仅 paid/confirmed 可操作）` };
    }

    const now = db.serverDate();

    // 走完整状态流转
    // Step 1: paid → confirmed（模拟商家确认）
    if (order.orderStatus === 'paid') {
      await db.collection('orders').doc(orderId).update({
        data: { orderStatus: 'confirmed', updateTime: now }
      });
    }

    // Step 2: confirmed → in_progress（模拟商家开始服务）
    await db.collection('orders').doc(orderId).update({
      data: { orderStatus: 'in_progress', updateTime: now }
    });

    // Step 3: in_progress → pending_complete（模拟商家标记完成）
    await db.collection('orders').doc(orderId).update({
      data: { orderStatus: 'pending_complete', updateTime: now }
    });

    // Step 4: pending_complete → completed（模拟用户确认完成）
    await db.collection('orders').doc(orderId).update({
      data: { orderStatus: 'completed', updateTime: now }
    });

    return { code: 0, data: { orderStatus: 'completed' }, message: '订单已完成（测试模式，完整状态流转）' };
  } catch (err) {
    console.error('[mockCompleteOrder]', err);
    return { code: 9999, message: '操作失败，请重试' };
  }
};
