const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  try {
    const providerRes = await db.collection('providers').where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您还不是服务商' };
    const provider = providerRes.data[0];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const todayOrders = await db.collection('orders')
      .where({ 'items.providerId': provider._id, createTime: db.command.gte(new Date(todayStr)) }).count();

    const pendingOrders = await db.collection('orders')
      .where({ 'items.providerId': provider._id, orderStatus: db.command.in(['paid', 'confirmed']) }).count();

    const recentOrders = await db.collection('orders')
      .where({ 'items.providerId': provider._id }).orderBy('createTime', 'desc').limit(5).get();

    return {
      code: 0,
      data: {
        stats: {
          todayOrders: todayOrders.total,
          pendingOrders: pendingOrders.total,
          totalOrders: provider.orderCount || 0,
          rating: provider.rating || 0,
        },
        recentOrders: recentOrders.data,
        providerName: provider.name,
        providerLevel: provider.levelName || '',
        providerLevelNum: provider.level || 0,
      },
      message: 'success',
    };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
