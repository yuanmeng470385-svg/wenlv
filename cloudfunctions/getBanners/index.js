const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const res = await db.collection('banners').orderBy('sortOrder', 'asc').get();
    return { code: 0, data: { list: res.data }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
