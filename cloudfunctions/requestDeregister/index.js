const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    const { role } = event;
    const provQuery = { userId: openid, status: 'active' };
    if (role) provQuery.categoryType = role;
    const providerRes = await db.collection('providers').where(provQuery).get();
    if (providerRes.data.length === 0) {
      return { code: 1003, message: '您还不是该类型的服务商' };
    }
    const provider = providerRes.data[0];

    const unfinishedOrders = await db.collection('orders')
      .where({
        'items.providerId': provider._id,
        orderStatus: db.command.nin(['pending_pay', 'completed', 'reviewed', 'cancelled', 'pending_complete', 'pending_refund']),
      }).count();
    if (unfinishedOrders.total > 0) {
      return { code: 2001, message: '您有未完成的订单，暂无法注销' };
    }

    await db.collection('providers').doc(provider._id).update({
      data: { status: 'pending_deregister', updateTime: db.serverDate() }
    });

    const admins = await db.collection('users').where({ roles: db.command.all(['admin']) }).get();
    for (const admin of admins.data) {
      await db.collection('notifications').add({
        data: {
          userId: admin._openid,
          type: 'deregister_request',
          title: '商家注销申请',
          content: `${provider.name} 申请注销商家身份`,
          relatedId: provider._id,
          read: false,
          createTime: db.serverDate(),
        }
      }).catch(() => {});
    }

    return { code: 0, message: '注销申请已提交，等待管理员审核' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
