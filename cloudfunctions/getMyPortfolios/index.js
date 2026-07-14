const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { page = 1, pageSize = 20 } = event;

  try {
    const providerRes = await db.collection('providers').where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) return { code: 0, data: { list: [], total: 0 }, message: 'success' };
    const provider = providerRes.data[0];

    const total = (await db.collection('portfolios').where({ providerId: provider._id }).count()).total;
    const list = await db.collection('portfolios')
      .where({ providerId: provider._id })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize).limit(pageSize).get();

    return { code: 0, data: { list: list.data, total }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
