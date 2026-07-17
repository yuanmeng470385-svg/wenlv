const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { field, fileID } = event;

  try {
    if (!['avatar', 'backgroundImage'].includes(field)) {
      return { code: 1001, message: '无效的更新类型' };
    }
    if (!fileID) return { code: 1001, message: '请上传图片' };

    const providerRes = await db.collection('providers')
      .where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) {
      return { code: 1003, message: '您还不是服务商' };
    }
    const provider = providerRes.data[0];

    const pendingKey = field === 'avatar' ? 'pendingAvatar' : 'pendingBackgroundImage';
    if (provider[pendingKey]) {
      return { code: 2001, message: '您已有待审核的申请，请等待管理员处理' };
    }

    await db.collection('providers').doc(provider._id).update({
      data: { [pendingKey]: fileID, updateTime: db.serverDate() }
    });

    const label = field === 'avatar' ? '头像' : '背景图';
    const admins = await db.collection('users').where({ roles: db.command.all(['admin']) }).get();
    for (const admin of admins.data) {
      await db.collection('notifications').add({
        data: {
          userId: admin._openid,
          type: 'avatar_update_request',
          title: `${label}修改申请`,
          content: `${provider.name} 申请修改${label}`,
          relatedId: provider._id,
          read: false,
          createTime: db.serverDate(),
        }
      }).catch(() => {});
    }

    return { code: 0, message: '已提交审核，请等待管理员处理' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
