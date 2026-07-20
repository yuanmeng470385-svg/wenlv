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
  const { status, page = 1, pageSize = 10, role = 'user' } = event;

  try {
    let where = {};

    if (role === 'provider') {
      // 商家视角: 查询关联服务商的订单
      // 需要先查该用户关联的 providerId
      // 简化处理: 直接通过 items 里的 providerId 查询
      // 实际项目中需要先查 providers 表获取该用户的 providerId
      // where['items.providerId'] = providerId;
      return { code: 0, data: { list: [], total: 0 }, message: '商家订单待实现' };
    } else {
      // 用户视角
      where.userId = openid;
    }

    if (status) {
      if (Array.isArray(status)) {
        where.orderStatus = db.command.in(status);
      } else if (status === 'completed') {
        where.orderStatus = db.command.in(['completed', 'reviewed']);
      } else {
        where.orderStatus = status;
      }
    }

    const totalRes = await db.collection('orders').where(where).count();

    const list = await db.collection('orders')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    const maskedList = list.data.map(order => ({
      ...order,
      contactPhone: order.contactPhone ? maskPhone(order.contactPhone) : order.contactPhone,
    }));

    return {
      code: 0,
      data: { list: maskedList, total: totalRes.total, page, pageSize },
      message: 'success',
    };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};

