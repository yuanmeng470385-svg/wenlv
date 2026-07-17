const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const admin = await db.collection('users').where({ _openid: openid }).get();
  if (!(admin.data[0] && (admin.data[0].roles || []).includes('admin'))) {
    return { code: 1002, message: '无管理员权限' };
  }

  try {
    const res = await db.collection('providers')
      .where({ status: 'pending_deregister' }).get();

    const list = [];
    for (const p of res.data) {
      const totalOrders = await db.collection('orders')
        .where({ 'items.providerId': p._id }).count();
      const unfinishedOrders = await db.collection('orders')
        .where({
          'items.providerId': p._id,
          orderStatus: db.command.nin(['completed', 'reviewed', 'cancelled']),
        }).count();
      list.push({
        _id: p._id,
        name: p.name,
        categoryType: p.categoryType,
        phone: p.phone,
        totalOrders: totalOrders.total,
        unfinishedOrders: unfinishedOrders.total,
        updateTime: p.updateTime,
      });
    }

    return { code: 0, data: { list }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
