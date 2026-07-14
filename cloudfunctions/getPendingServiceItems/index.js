const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }
    const list = await db.collection('serviceItems')
      .where({ status: 'pending_review' })
      .orderBy('createTime', 'desc')
      .get();

    const enriched = await Promise.all(list.data.map(async (si) => {
      let providerName = '未知';
      try { const p = await db.collection('providers').doc(si.providerId).get(); if (p.data) providerName = p.data.name; } catch (e) {}
      return { ...si, providerName };
    }));

    return { code: 0, data: enriched, message: 'success' };
  } catch (err) { return { code: 9999, message: err.message }; }
};
