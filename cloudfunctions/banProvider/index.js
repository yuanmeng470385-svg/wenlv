const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 管理员封禁/解封服务商（仅 admin 可调用）
 * event: { providerId, action: 'ban' | 'unban', reason }
 */
exports.main = async (event, context) => {
  const { providerId, action, reason } = event;

  try {
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }
    if (!providerId) return { code: 1001, message: '缺少 providerId' };
    if (!['ban', 'unban'].includes(action)) return { code: 1001, message: 'action 需为 ban 或 unban' };

    const providerRes = await db.collection('providers').doc(providerId).get();
    if (!providerRes.data) return { code: 1003, message: '服务商不存在' };
    const provider = providerRes.data;

    if (action === 'ban') {
      if (provider.status === 'banned') return { code: 2001, message: '该服务商已被封禁' };
      await db.collection('providers').doc(providerId).update({
        data: { status: 'banned', banReason: reason || '违规处理', updateTime: db.serverDate() }
      });
      // 同时下架该服务商的所有套餐
      await db.collection('serviceItems').where({ providerId, status: 'active' }).update({
        data: { status: 'inactive', updateTime: db.serverDate() }
      });
      // 审计日志
      await db.collection('auditLogs').add({ data: { adminOpenid: openid, action: 'banProvider', targetId: providerId, detail: { reason }, createTime: db.serverDate() } });
      // 通知商家
      if (provider.userId) {
        await db.collection('notifications').add({ data: { userId: provider.userId, type: 'provider_banned', title: '店铺已被暂停', content: `您的店铺因${reason || '违规处理'}被暂停运营`, relatedId: providerId, read: false, createTime: db.serverDate() } }).catch(() => {});
      }
      return { code: 0, data: {}, message: '已封禁该服务商' };
    } else {
      // unban
      if (provider.status !== 'banned') return { code: 2001, message: '该服务商未被封禁' };
      await db.collection('providers').doc(providerId).update({
        data: { status: 'active', banReason: '', updateTime: db.serverDate() }
      });
      // 审计日志
      await db.collection('auditLogs').add({ data: { adminOpenid: openid, action: 'unbanProvider', targetId: providerId, createTime: db.serverDate() } });
      return { code: 0, data: {}, message: '已解封该服务商' };
    }
  } catch (err) {
    console.error('[banProvider]', err);
    return { code: 9999, message: err.message };
  }
};
