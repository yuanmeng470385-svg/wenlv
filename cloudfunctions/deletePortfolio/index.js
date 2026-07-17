const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { portfolioId } = event;
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    if (!portfolioId) return { code: 1001, message: '请提供作品ID' };

    const portfolioRes = await db.collection('portfolios').doc(portfolioId).get();
    if (!portfolioRes.data) return { code: 1003, message: '作品不存在' };
    const portfolio = portfolioRes.data;

    const providerRes = await db.collection('providers')
      .where({ userId: openid, _id: portfolio.providerId }).get();
    if (providerRes.data.length === 0) {
      return { code: 1002, message: '无权删除此作品' };
    }

    if (portfolio.images && portfolio.images.length > 0) {
      await cloud.deleteFile({ fileList: portfolio.images }).catch(() => {});
    }

    await db.collection('portfolios').doc(portfolioId).remove();

    return { code: 0, message: '已删除' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
