const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const openid = cloud.getWXContext().OPENID;
    console.log(`[getCategoryList] caller=${openid || 'anonymous'}`, JSON.stringify(event));
    const res = await db.collection('categories')
      .where({ status: 'active' })
      .orderBy('sortOrder', 'asc')
      .get();
    return { code: 0, data: res.data, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};

