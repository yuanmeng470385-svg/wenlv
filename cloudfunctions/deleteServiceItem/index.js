const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { serviceItemId, role } = event;
  if (!serviceItemId) return { code: 1001, message: '参数错误' };

  try {
    const query = { userId: openid, status: 'active' };
    if (role) query.categoryType = role;
    const providerRes = await db.collection('providers').where(query).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您还不是服务商' };
    const provider = providerRes.data[0];

    const item = await db.collection('serviceItems').doc(serviceItemId).get();
    if (!item.data || item.data.providerId !== provider._id) {
      return { code: 1002, message: '无权删除此套餐' };
    }

    await db.collection('serviceItems').doc(serviceItemId).remove();
    return { code: 0, message: '已删除' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
