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

    const { providerId } = event;
    if (!providerId) return { code: 1001, message: '参数错误' };

    const total = (await db.collection('portfolios')
      .where({ providerId, status: 'approved' }).count()).total;
    const list = await db.collection('portfolios')
      .where({ providerId, status: 'approved' })
      .orderBy('createTime', 'desc')
      .get();

    return { code: 0, data: { list: list.data, total }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
