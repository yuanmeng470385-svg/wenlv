const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    const admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(admin.data[0] && (admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }

    const { bannerId, title, image, link, sortOrder } = event;
    if (!title) return { code: 1001, message: '请输入标题' };

    if (bannerId) {
      await db.collection('banners').doc(bannerId).update({
        data: { title, image: image || '', link: link || '', sortOrder: sortOrder || 0, updateTime: db.serverDate() }
      });
    } else {
      await db.collection('banners').add({
        data: { title, image: image || '', link: link || '', sortOrder: sortOrder || 0, createTime: db.serverDate() }
      });
    }
    return { code: 0, message: '保存成功' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
