const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { page = 1, pageSize = 20 } = event;

  try {
    const total = (await db.collection('notifications').where({ userId: openid }).count()).total;
    const list = await db.collection('notifications')
      .where({ userId: openid })
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    const unreadCount = (await db.collection('notifications').where({ userId: openid, read: false }).count()).total;

    return {
      code: 0,
      data: { list: list.data, total, unreadCount, page, pageSize },
      message: 'success',
    };
  } catch (err) {
    console.error('[getNotifications]', err);
    return { code: 9999, message: err.message };
  }
};
