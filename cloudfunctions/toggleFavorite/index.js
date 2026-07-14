const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { targetType, targetId } = event;

  try {
    const existRes = await db.collection('favorites').where({
      userId: openid,
      targetType,
      targetId,
    }).get();

    if (existRes.data.length > 0) {
      await db.collection('favorites').doc(existRes.data[0]._id).remove();
      return { code: 0, data: { favorited: false }, message: '已取消收藏' };
    } else {
      await db.collection('favorites').add({
        data: { userId: openid, targetType, targetId, createTime: db.serverDate() }
      });
      return { code: 0, data: { favorited: true }, message: '收藏成功' };
    }
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};

