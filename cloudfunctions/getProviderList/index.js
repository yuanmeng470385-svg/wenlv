const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { categoryType, page = 1, pageSize = 10, level, sortBy = 'sortOrder', keyword } = event;

  try {
    const where = { status: 'active' };
    if (categoryType) where.categoryType = categoryType;
    if (level !== undefined) where.level = level;
    if (keyword && keyword.trim()) {
      const kw = keyword.trim();
      where._ = db.command.or([
        { name: db.RegExp({ regexp: kw, options: 'i' }) },
        { description: db.RegExp({ regexp: kw, options: 'i' }) },
        { featureTags: db.RegExp({ regexp: kw, options: 'i' }) },
      ]);
    }

    const totalRes = await db.collection('providers').where(where).count();
    const total = totalRes.total;

    const list = await db.collection('providers')
      .where(where)
      .orderBy(sortBy, 'asc')
      .orderBy('rating', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      code: 0,
      data: { list: list.data, total, page, pageSize },
      message: 'success',
    };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};

