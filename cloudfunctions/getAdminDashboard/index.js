const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const [pendingProviders, pendingPortfolios, pendingServiceItems, pendingRefunds, totalOrders, totalUsers] = await Promise.all([
      db.collection('providers').where({ status: 'pending_review' }).count(),
      db.collection('portfolios').where({ status: 'pending_review' }).count(),
      db.collection('serviceItems').where({ status: 'pending_review' }).count(),
      db.collection('orders').where({ orderStatus: 'pending_refund' }).count(),
      db.collection('orders').count(),
      db.collection('users').count(),
    ]);

    const providerTotal = await db.collection('providers').where({ status: 'active' }).count();

    return {
      code: 0,
      data: {
        pendingProviders: pendingProviders.total,
        pendingPortfolios: pendingPortfolios.total,
        pendingServiceItems: pendingServiceItems.total,
        pendingRefunds: pendingRefunds.total,
        activeProviders: providerTotal.total,
        totalOrders: totalOrders.total,
        totalUsers: totalUsers.total,
      },
      message: 'success',
    };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
