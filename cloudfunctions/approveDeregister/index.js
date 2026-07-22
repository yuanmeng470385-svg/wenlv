const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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
      // 仅 pending_deregister 状态可拒绝
      if (provider.status !== 'pending_deregister') {
        return { code: 2001, message: '该服务商不在注销申请状态' };
      }
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

    // ===== 审批前复查：是否有新产生的进行中订单 =====
    const unfinishedOrders = await db.collection('orders')
      .where({
        'items.providerId': providerId,
        orderStatus: _.nin(['pending_pay', 'completed', 'reviewed', 'cancelled', 'pending_complete', 'pending_refund']),
      }).count();
    if (unfinishedOrders.total > 0) {
      return { code: 2001, message: `该服务商有 ${unfinishedOrders.total} 个进行中订单，无法注销` };
    }

    // ===== 先标记 provider 为已注销（阻止新操作），再级联清理 =====
    await db.collection('providers').doc(providerId).update({
      data: { status: 'deregistered', updateTime: db.serverDate() }
    });

    // 级联删除（每个步骤独立 try，单步失败不影响后续）
    const errors = [];

    try {
      await db.collection('portfolios').where({ providerId }).remove();
    } catch (e) { errors.push('portfolios: ' + e.message); }

    try {
      await db.collection('serviceItems').where({ providerId }).remove();
    } catch (e) { errors.push('serviceItems: ' + e.message); }

    try {
      await db.collection('reviews').where({ providerId }).remove();
    } catch (e) { errors.push('reviews: ' + e.message); }

    // 标记涉及该商家的订单
    try {
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
    } catch (e) { errors.push('orders: ' + e.message); }

    // 移除用户角色（关键步骤，必须成功）
    try {
      if (provider.userId && provider.categoryType) {
        const userRes = await db.collection('users').where({ _openid: provider.userId }).get();
        if (userRes.data.length > 0) {
          const user = userRes.data[0];
          const roles = (user.roles || []).filter(r => r !== provider.categoryType);
          await db.collection('users').doc(user._id).update({ data: { roles, updateTime: db.serverDate() } });
        }
      }
    } catch (e) { errors.push('roles: ' + e.message); }

    // 发送通知
    if (provider.userId) {
      try {
        await db.collection('notifications').add({
          data: {
            userId: provider.userId, type: 'deregister_result',
            title: '商家已注销', content: `您的${provider.name}商家身份已注销`,
            relatedId: providerId, read: false, createTime: db.serverDate(),
          }
        });
      } catch (e) { errors.push('notification: ' + e.message); }
    }

    if (errors.length > 0) {
      console.warn('[approveDeregister] 部分清理失败:', errors.join('; '));
      return { code: 0, message: '商家已注销（部分数据清理失败，已记录日志）', data: { errors } };
    }

    return { code: 0, message: '商家已注销' };
  } catch (err) {
    console.error('[approveDeregister]', err);
    return { code: 9999, message: '操作失败，请重试' };
  }
};
