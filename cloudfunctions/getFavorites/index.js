const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    const favRes = await db.collection('favorites')
      .where({ userId: openid })
      .orderBy('createTime', 'desc')
      .limit(200)
      .get();

    const enriched = await Promise.all(favRes.data.map(async (fav) => {
      let detail = { name: '未知', image: '', desc: '' };
      try {
        if (fav.targetType === 'provider') {
          const p = await db.collection('providers').doc(fav.targetId).get();
          if (p.data) detail = { name: p.data.name, image: p.data.avatar, desc: p.data.description, level: p.data.level, levelName: p.data.levelName, rating: p.data.rating };
        } else if (fav.targetType === 'portfolio') {
          const p = await db.collection('portfolios').doc(fav.targetId).get();
          if (p.data) detail = { name: p.data.title, image: (p.data.images && p.data.images.length) ? p.data.images[0] : '', desc: p.data.description };
        }
      } catch (e) { /* ignore deleted targets */ }
      return { ...fav, detail };
    }));

    return { code: 0, data: enriched.filter(f => f), message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
