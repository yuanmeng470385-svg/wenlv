const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }

    const { page = 1, pageSize = 20, keyword, status } = event;
    const where = {};

    if (status === 'banned') {
      where.status = 'banned';
    } else if (status === 'active') {
      where.status = _.or([_.eq('active'), _.exists(false)]);
    }

    if (keyword && keyword.trim()) {
      const kw = keyword.trim();
      where._ = db.command.or([
        { nickName: db.RegExp({ regexp: kw, options: 'i' }) },
        { phone: db.RegExp({ regexp: kw, options: 'i' }) },
      ]);
    }

    const total = (await db.collection('users').where(where).count()).total;
    const list = await db.collection('users')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .field({ _openid: false })
      .get();

    return { code: 0, data: { list: list.data, total, page, pageSize }, message: 'success' };
  } catch (err) {
    console.error('[adminGetUsers]', err);
    return { code: 9999, message: err.message };
  }
};
