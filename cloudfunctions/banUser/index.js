const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 管理员封禁/解封用户账号（仅 admin 可调用）
 * event: { userId, action: 'ban' | 'unban', reason }
 * userId 为 users 集合的 _id 或 _openid
 */
exports.main = async (event, context) => {
  const { userId, action, reason } = event;

  try {
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }
    if (!userId) return { code: 1001, message: '缺少 userId' };
    if (!['ban', 'unban'].includes(action)) return { code: 1001, message: 'action 需为 ban 或 unban' };

    // 支持按 _id 或 _openid 查找用户
    let userRes = await db.collection('users').doc(userId).get().catch(() => null);
    if (!userRes || !userRes.data) {
      userRes = await db.collection('users').where({ _openid: userId }).get();
      if (!userRes.data || userRes.data.length === 0) return { code: 1003, message: '用户不存在' };
    }
    const user = userRes.data[0] || userRes.data;
    const uid = user._id;

    if (action === 'ban') {
      if (user.status === 'banned') return { code: 2001, message: '该用户已被封禁' };
      await db.collection('users').doc(uid).update({
        data: { status: 'banned', banReason: reason || '违规处理', updateTime: db.serverDate() }
      });
      // 审计日志
      await db.collection('auditLogs').add({ data: { adminOpenid: openid, action: 'banUser', targetId: uid, detail: { reason, userOpenid: user._openid }, createTime: db.serverDate() } });
      // 通知用户
      await db.collection('notifications').add({ data: { userId: user._openid || uid, type: 'account_banned', title: '账户已被封禁', content: `您的账户因${reason || '违规处理'}被暂停使用`, relatedId: uid, read: false, createTime: db.serverDate() } }).catch(() => {});
      return { code: 0, data: {}, message: '已封禁该用户' };
    } else {
      if (user.status !== 'banned') return { code: 2001, message: '该用户未被封禁' };
      await db.collection('users').doc(uid).update({
        data: { status: 'active', banReason: '', updateTime: db.serverDate() }
      });
      // 审计日志
      await db.collection('auditLogs').add({ data: { adminOpenid: openid, action: 'unbanUser', targetId: uid, detail: { userOpenid: user._openid }, createTime: db.serverDate() } });
      // 通知用户
      await db.collection('notifications').add({ data: { userId: user._openid || uid, type: 'account_unbanned', title: '账户已解封', content: '您的账户已恢复使用', relatedId: uid, read: false, createTime: db.serverDate() } }).catch(() => {});
      return { code: 0, data: {}, message: '已解封该用户' };
    }
  } catch (err) {
    console.error('[banUser]', err);
    return { code: 9999, message: err.message };
  }
};
