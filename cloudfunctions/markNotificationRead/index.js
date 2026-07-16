const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { notificationId, markAll } = event;

  try {
    if (markAll) {
      // 全部已读
      const res = await db.collection('notifications').where({ userId: openid, read: false }).get();
      for (const n of res.data) {
        await db.collection('notifications').doc(n._id).update({ data: { read: true } });
      }
      return { code: 0, data: { count: res.data.length }, message: '全部已读' };
    }

    if (!notificationId) return { code: 1001, message: '缺少 notificationId' };
    const notif = await db.collection('notifications').doc(notificationId).get();
    if (!notif.data || notif.data.userId !== openid) return { code: 1002, message: '无权操作' };

    await db.collection('notifications').doc(notificationId).update({ data: { read: true } });
    return { code: 0, data: {}, message: '已读' };
  } catch (err) {
    console.error('[markNotificationRead]', err);
    return { code: 9999, message: err.message };
  }
};
