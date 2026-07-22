const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  try {
    const { role } = event;
    const query = { userId: openid, status: 'active' };
    if (role) query.categoryType = role;
    const providerRes = await db.collection('providers').where(query).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您还不是该类型的服务商' };
    const provider = providerRes.data[0];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const todayOrders = await db.collection('orders')
      .where({ 'items.providerId': provider._id, createTime: db.command.gte(new Date(todayStr)) }).count();

    const pendingOrders = await db.collection('orders')
      .where({ 'items.providerId': provider._id, orderStatus: db.command.in(['paid', 'confirmed']) }).count();

    const totalOrders = await db.collection('orders')
      .where({ 'items.providerId': provider._id }).count();

    const recentOrders = await db.collection('orders')
      .where({ 'items.providerId': provider._id }).orderBy('createTime', 'desc').limit(5).get();

    // 收入统计：仅计算属于当前商家的服务项金额（单位：分）
    const completedOrders = await db.collection('orders')
      .where({ 'items.providerId': provider._id, orderStatus: db.command.in(['completed', 'reviewed']) })
      .field({ totalFee: true, items: true })
      .get();
    let totalRevenue = 0;
    let completedCount = 0;
    for (const order of completedOrders.data) {
      completedCount++;
      // 按当前商家的 items 拆分计算营收（非整单金额）
      const myItems = (order.items || []).filter(item => item.providerId === provider._id);
      for (const item of myItems) {
        const qty = item.quantity || 1;
        if (item.priceType === 'hourly') {
          const hours = item.hours || Math.ceil((item.duration || 60) / 60);
          totalRevenue += (item.price || 0) * hours * qty;
        } else {
          totalRevenue += (item.price || 0) * qty;
        }
      }
    }

    return {
      code: 0,
      data: {
        stats: {
          todayOrders: todayOrders.total,
          pendingOrders: pendingOrders.total,
          totalOrders: totalOrders.total,
          totalRevenue,
          completedCount,
        },
        recentOrders: recentOrders.data,
        providerName: provider.name,
      },
      message: 'success',
    };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
