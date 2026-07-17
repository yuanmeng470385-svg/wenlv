const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    const admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(admin.data[0] && (admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }

    const { providerId, featured } = event;
    if (!providerId) return { code: 1001, message: '参数错误' };

    await db.collection('providers').doc(providerId).update({
      data: { isFeatured: !!featured, updateTime: db.serverDate() }
    });
    return { code: 0, message: featured ? '已设为精选' : '已取消精选' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
