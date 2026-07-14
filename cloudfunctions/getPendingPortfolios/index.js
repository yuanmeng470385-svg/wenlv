const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { page = 1, pageSize = 20 } = event;

  try {
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
