const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { categoryType, name, phone, description, featureTags, coverImages, portfolioImages } = event;

  try {
    if (!categoryType || !name || !phone) {
      return { code: 1001, message: '请填写完整的申请信息' };
    }

    const validTypes = ['photographer', 'makeup', 'hanfu_shop'];
    if (!validTypes.includes(categoryType)) {
      return { code: 1001, message: '无效的服务商类型' };
    }

    // 检查是否已有同类型的服务商
    const exists = await db.collection('providers').where({
      userId: openid,
      categoryType,
    }).get();

    if (exists.data.length > 0) {
      return { code: 2001, message: '您已申请过该类型的服务商，请勿重复申请' };
    }

    // 创建服务商记录（待审核状态）
    const providerRes = await db.collection('providers').add({
      data: {
        userId: openid,
        categoryType,
        name,
        phone,
        description: description || '',
        featureTags: featureTags || [],
        coverImages: coverImages || [],
        avatar: '',
        level: 0,
        levelName: '',
        rating: 0,
        reviewCount: 0,
        orderCount: 0,
        status: 'pending_review',
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
      }
    });

    // 如果有提交作品，写入作品表（pending_review状态）
    if (portfolioImages && portfolioImages.length > 0) {
      await db.collection('portfolios').add({
        data: {
          providerId: providerRes._id,
          categoryType,
          title: `${name}的代表作品`,
          images: portfolioImages,
          styleTags: featureTags || [],
          description: '入驻申请的初始作品',
          status: 'pending_review',
          likeCount: 0,
          viewCount: 0,
          createTime: db.serverDate(),
        }
      });
    }

    // 更新用户 roles
    const userRes = await db.collection('users').where({ _openid: openid }).get();
    if (userRes.data.length > 0) {
      const user = userRes.data[0];
      const roles = [...new Set([...(user.roles || []), categoryType])];
      await db.collection('users').doc(user._id).update({
        data: { roles, updateTime: db.serverDate() }
      });
    }

    return { code: 0, data: { providerId: providerRes._id }, message: '申请已提交，等待平台审核' };
  } catch (err) {
    console.error('[applyProvider]', err);
    return { code: 9999, message: err.message };
  }
};
