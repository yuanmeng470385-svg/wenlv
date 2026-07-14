const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { status, page = 1, pageSize = 10 } = event;

  try {
    // 找到当前用户的服务商身份
    const providerRes = await db.collection('providers').where({ userId: openid, status: db.command.in(['active', 'pending_review']) }).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您还不是服务商' };

    const provider = providerRes.data[0];
    const where = { 'items.providerId': provider._id };
    if (status) where.orderStatus = status;

    const total = (await db.collection('orders').where(where).count()).total;
    const list = await db.collection('orders').where(where).orderBy('createTime', 'desc').skip((page - 1) * pageSize).limit(pageSize).get();

    return { code: 0, data: { list: list.data, total, page, pageSize }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
