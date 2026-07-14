const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { portfolioId, action, reason } = event;

  try {
    if (!['approved', 'rejected'].includes(action)) {
      return { code: 1001, message: '操作需为 approved 或 rejected' };
    }

    const updateData = {
      status: action,
      reviewRemark: reason || '',
    };

    await db.collection('portfolios').doc(portfolioId).update({ data: updateData });

    return { code: 0, data: { status: action }, message: action === 'approved' ? '作品已通过审核' : '作品已驳回' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
