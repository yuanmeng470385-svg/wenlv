const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { providerId } = event;

  try {
    // 参数校验
    if (!providerId || typeof providerId !== 'string') {
      return { code: 1001, message: '服务商ID无效' };
    }

    // 查询服务商信息
    const providerRes = await db.collection('providers').doc(providerId).get();
    if (!providerRes.data) {
      return { code: 1003, message: '服务商不存在' };
    }

    // 查询关联的服务项
    const serviceItems = await db.collection('serviceItems')
      .where({ providerId, status: 'active' })
      .orderBy('sortOrder', 'asc')
      .get();

    // 查询审核通过的作品
    const portfolios = await db.collection('portfolios')
      .where({ providerId, status: 'approved' })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get();

    // 查询最新评价
    const reviews = await db.collection('reviews')
      .where({ providerId })
      .orderBy('createTime', 'desc')
      .limit(10)
      .get();

    return {
      code: 0,
      data: {
        provider: providerRes.data,
        serviceItems: serviceItems.data,
        portfolios: portfolios.data,
        reviews: reviews.data,
      },
      message: 'success',
    };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};

