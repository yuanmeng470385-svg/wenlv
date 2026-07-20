const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { title, description, images, styleTags } = event;

  try {
    if (!title || !images || !images.length) return { code: 1001, message: '请填写标题并上传作品图片' };
    if (images.length > 9) return { code: 1001, message: '最多上传9张作品图片' };
    // 校验图片 fileID 格式
    for (const img of images) {
      if (!img || typeof img !== 'string' || !img.startsWith('cloud://')) {
        return { code: 1001, message: '图片格式无效，请重新上传' };
      }
    }

    const { role } = event;
    const query = { userId: openid, status: 'active' };
    if (role) query.categoryType = role;
    const providerRes = await db.collection('providers').where(query).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您还不是审核通过的服务商' };
    const provider = providerRes.data[0];

    await db.collection('portfolios').add({
      data: {
        providerId: provider._id, categoryType: provider.categoryType,
        title, description: description || '', images, styleTags: styleTags || [],
        status: 'pending_review', likeCount: 0, viewCount: 0, createTime: db.serverDate(),
      }
    });

    return { code: 0, data: {}, message: '作品已提交，等待审核' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
