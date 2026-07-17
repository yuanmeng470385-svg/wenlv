const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  try {
    const providerRes = await db.collection('providers').where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '服务商不存在' };

    const p = providerRes.data[0];
    return { code: 0, data: {
      _id: p._id,
      name: p.name, phone: p.phone || '', description: p.description || '',
      featureTags: (p.featureTags || []).join(', '),
    }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
