const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { portfolioId } = event;
  try {
    const res = await db.collection('portfolios').doc(portfolioId).get();
    if (!res.data) return { code: 1003, message: '作品不存在' };

    // 增加浏览量
    await db.collection('portfolios').doc(portfolioId).update({
      data: { viewCount: db.command.inc(1) }
    });

    return { code: 0, data: res.data, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
