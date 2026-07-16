const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { portfolioId, action, reason } = event;

  try {
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }
    if (!['approved', 'rejected'].includes(action)) {
      return { code: 1001, message: '操作需为 approved 或 rejected' };
    }

    const updateData = {
      status: action,
      reviewRemark: reason || '',
    };

    await db.collection('portfolios').doc(portfolioId).update({ data: updateData });
    // 审计日志
    await db.collection('auditLogs').add({ data: { adminOpenid: openid, action: action === 'approved' ? 'approvePortfolio' : 'rejectPortfolio', targetId: portfolioId, detail: { reason }, createTime: db.serverDate() } });
    // 通知作品作者
    try {
      const pf = (await db.collection('portfolios').doc(portfolioId).get()).data;
      if (pf && pf.providerId) {
        const pv = (await db.collection('providers').doc(pf.providerId).get()).data;
        if (pv && pv.userId) {
          await db.collection('notifications').add({ data: { userId: pv.userId, type: action === 'approved' ? 'portfolio_approved' : 'portfolio_rejected', title: action === 'approved' ? '作品已通过' : '作品未通过', content: action === 'approved' ? '您的作品已通过审核' : `您的作品未通过审核${reason ? '：' + reason : ''}`, relatedId: portfolioId, read: false, createTime: db.serverDate() } });
        }
      }
    } catch (e) { /* ignore */ }

    return { code: 0, data: { status: action }, message: action === 'approved' ? '作品已通过审核' : '作品已驳回' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
