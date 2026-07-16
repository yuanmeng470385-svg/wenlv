const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const LEVEL_MAP = { 1: '初级', 2: '中级', 3: '高级', 4: '资深', 5: '首席' };

exports.main = async (event, context) => {
  const { providerId, action, level = 1, reason } = event;

  try {
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }
    if (!providerId) return { code: 1001, message: '请提供 providerId' };

    const providerRes = await db.collection('providers').doc(providerId).get();
    if (!providerRes.data) return { code: 1003, message: '服务商不存在' };
    const provider = providerRes.data;

    // 驳回
    if (action === 'rejected') {
      await db.collection('providers').doc(providerId).update({
        data: { status: 'rejected', reviewRemark: reason || '审核未通过', updateTime: db.serverDate() }
      });
      // 同时驳回关联的待审作品
      await db.collection('portfolios').where({ providerId, status: 'pending_review' }).update({
        data: { status: 'rejected', reviewRemark: reason || '' }
      });
      // 审计日志
      await db.collection('auditLogs').add({ data: { adminOpenid: openid, action: 'rejectProvider', targetId: providerId, detail: { reason }, createTime: db.serverDate() } });
      // 通知申请人
      if (provider.userId) {
        await db.collection('notifications').add({ data: { userId: provider.userId, type: 'provider_rejected', title: '申请未通过', content: `您的${provider.categoryType === 'photographer' ? '摄影师' : provider.categoryType === 'makeup' ? '妆造师' : '汉服店'}申请未通过审核${reason ? '：' + reason : ''}`, relatedId: providerId, read: false, createTime: db.serverDate() } }).catch(() => {});
      }
      return { code: 0, data: {}, message: '已驳回' };
    }

    // 通过
    const isHanfu = provider.categoryType === 'hanfu_shop';
    const finalLevel = isHanfu ? 0 : (level || 1);
    const levelName = isHanfu ? '' : (LEVEL_MAP[finalLevel] || '初级');

    await db.collection('providers').doc(providerId).update({
      data: { status: 'active', level: finalLevel, levelName, updateTime: db.serverDate() }
    });
    await db.collection('portfolios').where({ providerId, status: 'pending_review' }).update({
      data: { status: 'approved' }
    });
    // 审计日志
    await db.collection('auditLogs').add({ data: { adminOpenid: openid, action: 'approveProvider', targetId: providerId, detail: { level: finalLevel, levelName }, createTime: db.serverDate() } });
    // 通知申请人
    if (provider.userId) {
      const catName = provider.categoryType === 'photographer' ? '摄影师' : provider.categoryType === 'makeup' ? '妆造师' : '汉服店';
      await db.collection('notifications').add({ data: { userId: provider.userId, type: 'provider_approved', title: '申请已通过', content: `您的${catName}申请已通过审核${isHanfu ? '' : '，等级：' + levelName}`, relatedId: providerId, read: false, createTime: db.serverDate() } }).catch(() => {});
    }

    return { code: 0, data: { level: finalLevel, levelName }, message: `已通过！${isHanfu ? '' : '等级: ' + levelName}` };
  } catch (err) { return { code: 9999, message: err.message }; }
};
