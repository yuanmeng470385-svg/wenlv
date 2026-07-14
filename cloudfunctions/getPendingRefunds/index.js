const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const list = await db.collection('orders')
      .where({ orderStatus: 'pending_refund' })
      .orderBy('createTime', 'desc')
      .get();
    return { code: 0, data: list.data, message: 'success' };
  } catch (err) { return { code: 9999, message: err.message }; }
};
