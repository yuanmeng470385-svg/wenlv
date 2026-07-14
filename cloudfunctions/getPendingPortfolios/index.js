const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { page = 1, pageSize = 20 } = event;

  try {
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }
    const total = (await db.collection('portfolios').where({ status: 'pending_review' }).count()).total;
    const list = await db.collection('portfolios')
      .where({ status: 'pending_review' })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize).limit(pageSize)
      .get();

    // 查服务商名称
    const enriched = await Promise.all(list.data.map(async (p) => {
      let providerName = '未知';
      try {
        const pr = await db.collection('providers').doc(p.providerId).get();
        if (pr.data) providerName = pr.data.name;
      } catch (e) {}
      return { ...p, providerName };
    }));

    return { code: 0, data: { list: enriched, total }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
