const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { targetType, targetId } = event;

  try {
    // 检查是否已点赞
    const existRes = await db.collection('likes').where({
      userId: openid,
      targetType,
      targetId,
    }).get();

    if (existRes.data.length > 0) {
      // 取消点赞
      await db.collection('likes').doc(existRes.data[0]._id).remove();
      // 减少点赞数
      if (targetType === 'portfolio') {
        await db.collection('portfolios').doc(targetId).update({
          data: { likeCount: _.inc(-1) }
        });
      }
      return { code: 0, data: { liked: false }, message: '已取消点赞' };
    } else {
      // 点赞
      await db.collection('likes').add({
        data: {
          userId: openid,
          targetType,
          targetId,
          createTime: db.serverDate(),
        }
      });
      if (targetType === 'portfolio') {
        await db.collection('portfolios').doc(targetId).update({
          data: { likeCount: _.inc(1) }
        });
      }
      return { code: 0, data: { liked: true }, message: '点赞成功' };
    }
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};

