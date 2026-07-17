const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const res = await db.collection('providers')
      .where({ status: 'active', isFeatured: true })
      .field({ _id: true, name: true, avatar: true, backgroundImage: true, categoryType: true, description: true })
      .limit(20)
      .get();
    return { code: 0, data: { list: res.data }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
