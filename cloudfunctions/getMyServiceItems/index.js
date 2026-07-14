const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  try {
    const providerRes = await db.collection('providers').where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您还不是服务商' };
    const provider = providerRes.data[0];

    const list = await db.collection('serviceItems')
      .where({ providerId: provider._id })
      .orderBy('sortOrder', 'asc')
      .get();

    return { code: 0, data: list.data, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
