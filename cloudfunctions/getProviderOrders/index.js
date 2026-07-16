const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { status, page = 1, pageSize = 10, role } = event;

  try {
    // 按当前身份(role=categoryType)匹配对应的服务商记录，隔离多身份订单
    const provQuery = { userId: openid, status: db.command.in(['active', 'pending_review']) };
    if (role) provQuery.categoryType = role;
    const providerRes = await db.collection('providers').where(provQuery).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您还不是该类型的服务商' };

    const provider = providerRes.data[0];
    // 订单项需同时匹配 providerId 且 categoryType，确保只返回该身份收到的订单
    const itemMatch = { providerId: provider._id };
    if (role) itemMatch.categoryType = role;
    const where = { items: db.command.elemMatch(itemMatch) };
    if (status) where.orderStatus = status;

    const total = (await db.collection('orders').where(where).count()).total;
    const list = await db.collection('orders').where(where).orderBy('createTime', 'desc').skip((page - 1) * pageSize).limit(pageSize).get();

    const maskedList = list.data.map(order => ({
      ...order,
      contactPhone: order.contactPhone ? maskPhone(order.contactPhone) : order.contactPhone,
    }));

    return { code: 0, data: { list: maskedList, total, page, pageSize }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
