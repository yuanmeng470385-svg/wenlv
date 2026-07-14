const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { providerId, page = 1, pageSize = 10 } = event;

  try {
    const where = {};
    if (providerId) where.providerId = providerId;

    const total = (await db.collection('reviews').where(where).count()).total;
    const list = await db.collection('reviews')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return { code: 0, data: { list: list.data, total, page, pageSize }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
