const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    const admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(admin.data[0] && (admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }

    const { providerId, action } = event;
    if (!providerId || !action) return { code: 1001, message: '参数不完整' };

    const providerRes = await db.collection('providers').doc(providerId).get();
    if (!providerRes.data) return { code: 1003, message: '服务商不存在' };
    const provider = providerRes.data;

    if (action === 'reject') {
      await db.collection('providers').doc(providerId).update({
        data: { status: 'active', updateTime: db.serverDate() }
      });
      if (provider.userId) {
        await db.collection('notifications').add({
          data: {
            userId: provider.userId, type: 'deregister_result',
            title: '注销申请被拒绝', content: '您的注销申请已被管理员拒绝',
            relatedId: providerId, read: false, createTime: db.serverDate(),
          }
        }).catch(() => {});
      }
      return { code: 0, message: '已拒绝' };
    }

    if (action !== 'approve') return { code: 1001, message: '无效操作' };

    // 级联删除
    await db.collection('portfolios').where({ providerId }).remove();
    await db.collection('serviceItems').where({ providerId }).remove();
    await db.collection('reviews').where({ providerId }).remove();

    // 标记订单
    const orderRes = await db.collection('orders')
      .where({ 'items.providerId': providerId }).get();
    for (const order of orderRes.data) {
      const items = (order.items || []).map(item => {
        if (item.providerId === providerId) {
          return { ...item, providerDeleted: true, providerNameSnapshot: provider.name };
        }
        return item;
      });
      await db.collection('orders').doc(order._id).update({
        data: { items, updateTime: db.serverDate() }
      });
    }

    // 删除 provider
    await db.collection('providers').doc(providerId).remove();

    // 移除角色
    if (provider.userId && provider.categoryType) {
      const userRes = await db.collection('users').where({ _openid: provider.userId }).get();
      if (userRes.data.length > 0) {
        const user = userRes.data[0];
        const roles = (user.roles || []).filter(r => r !== provider.categoryType);
        await db.collection('users').doc(user._id).update({ data: { roles, updateTime: db.serverDate() } });
      }
    }

    if (provider.userId) {
      await db.collection('notifications').add({
        data: {
          userId: provider.userId, type: 'deregister_result',
          title: '商家已注销', content: `您的${provider.name}商家身份已注销`,
          relatedId: providerId, read: false, createTime: db.serverDate(),
        }
      }).catch(() => {});
    }

    return { code: 0, message: '商家已注销' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
