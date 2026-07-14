const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { serviceItemId, action } = event;
  try {
    if (!['approved', 'rejected'].includes(action)) return { code: 1001, message: 'action 需为 approved 或 rejected' };
    await db.collection('serviceItems').doc(serviceItemId).update({
      data: { status: action === 'approved' ? 'active' : 'inactive', updateTime: db.serverDate() }
    });
    return { code: 0, data: {}, message: action === 'approved' ? '套餐已通过' : '套餐已驳回' };
  } catch (err) { return { code: 9999, message: err.message }; }
};
