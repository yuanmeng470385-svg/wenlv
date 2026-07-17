const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 获取管理员设为精选的审核通过作品，按点赞数排序
    const portfolios = await db.collection('portfolios')
      .where({ status: 'approved', isFeatured: true })
      .orderBy('likeCount', 'desc')
      .get();

    // 批量获取对应商家信息
    const providerIds = [...new Set(portfolios.data.map(p => p.providerId))];
    const providerMap = {};
    if (providerIds.length > 0) {
      const providers = await db.collection('providers')
        .where({ _id: db.command.in(providerIds), status: 'active' })
        .field({ _id: true, name: true, avatar: true, categoryType: true })
        .get();
      for (const p of providers.data) {
        providerMap[p._id] = p;
      }
    }

    const list = portfolios.data
      .filter(p => providerMap[p.providerId])
      .map(p => ({
        _id: p._id,
        image: (p.images && p.images[0]) || '',
        likeCount: p.likeCount || 0,
        providerId: p.providerId,
        providerName: providerMap[p.providerId] ? providerMap[p.providerId].name : '',
        providerAvatar: providerMap[p.providerId] ? providerMap[p.providerId].avatar : '',
        providerCategory: providerMap[p.providerId] ? providerMap[p.providerId].categoryType : '',
      }));

    return { code: 0, data: { list }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
