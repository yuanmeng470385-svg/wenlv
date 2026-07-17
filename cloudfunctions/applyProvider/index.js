const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { categoryType, name, city, phone, description, featureTags, coverImages, portfolioImages, avatar, backgroundImage } = event;

  try {
    if (!categoryType || !name || !phone) {
      return { code: 1001, message: '请填写完整的申请信息' };
    }
    if (!avatar || !backgroundImage) {
      return { code: 1001, message: '请上传头像和背景图' };
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
      // 已有该类型 provider：可能上次申请建了 provider 却漏更新 roles（两步非事务）。
      // 此处补齐 roles 以自愈脏数据，再返回“已申请过”，避免用户永久卡死无法切换身份。
      const userRes0 = await db.collection('users').where({ _openid: openid }).get();
      if (userRes0.data.length > 0) {
        const u0 = userRes0.data[0];
        if (!(u0.roles || []).includes(categoryType)) {
          const roles0 = [...new Set([...(u0.roles || []), categoryType])];
          await db.collection('users').doc(u0._id).update({
            data: { roles: roles0, updateTime: db.serverDate() }
          });
        }
      }
      return { code: 2001, message: '您已申请过该类型的服务商，请勿重复申请' };
    }

    // 先更新用户 roles（放前面，避免 provider 创建成功但 roles 更新失败的不一致）
    const userRes = await db.collection('users').where({ _openid: openid }).get();
    if (userRes.data.length > 0) {
      const user = userRes.data[0];
      const roles = [...new Set([...(user.roles || []), categoryType])];
      await db.collection('users').doc(user._id).update({
        data: { roles, updateTime: db.serverDate() }
      });
    }

    // 创建服务商记录（待审核状态）
    const providerRes = await db.collection('providers').add({
      data: {
        userId: openid,
        categoryType,
        name,
        city: city || '',
        phone,
        description: description || '',
        featureTags: featureTags || [],
        coverImages: coverImages || [],
        avatar: avatar || '',
        backgroundImage: backgroundImage || '',
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

    return { code: 0, data: { providerId: providerRes._id }, message: '申请已提交，等待平台审核' };
  } catch (err) {
    console.error('[applyProvider]', err);
    return { code: 9999, message: err.message };
  }
};
