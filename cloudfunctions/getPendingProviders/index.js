const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const res = await db.collection('providers')
      .where({ status: 'pending_review' })
      .orderBy('createTime', 'desc')
      .get();

    // 查每个申请者的作品图片
    const enriched = await Promise.all(res.data.map(async (p) => {
      const images = [];
      try {
        const pf = await db.collection('portfolios').where({ providerId: p._id, status: 'pending_review' }).limit(9).get();
        pf.data.forEach(f => { if (f.images && f.images.length) images.push(...f.images); });
      } catch (e) {}
      return {
        _id: p._id,
        name: p.name,
        categoryType: p.categoryType,
        phone: p.phone,
        description: p.description,
        featureTags: p.featureTags || [],
        coverImages: p.coverImages || [],
        images: images.slice(0, 9),
        createTime: p.createTime,
      };
    }));

    return { code: 0, data: enriched, message: `共 ${enriched.length} 个待审核` };
  } catch (err) { return { code: 9999, message: err.message }; }
};
