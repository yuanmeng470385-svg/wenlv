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

    const { providerId, field, action } = event;
    if (!providerId || !field || !action) {
      return { code: 1001, message: '参数不完整' };
    }
    if (!['avatar', 'backgroundImage'].includes(field)) {
      return { code: 1001, message: '无效的类型' };
    }

    const providerRes = await db.collection('providers').doc(providerId).get();
    if (!providerRes.data) return { code: 1003, message: '服务商不存在' };
    const provider = providerRes.data;

    const pendingKey = field === 'avatar' ? 'pendingAvatar' : 'pendingBackgroundImage';
    const pendingValue = provider[pendingKey];
    if (!pendingValue) return { code: 2001, message: '没有待审核的申请' };

    const label = field === 'avatar' ? '头像' : '背景图';

    if (action === 'approve') {
      const updateData = { [field]: pendingValue, [pendingKey]: null, updateTime: db.serverDate() };
      await db.collection('providers').doc(providerId).update({ data: updateData });
    } else if (action === 'reject') {
      await db.collection('providers').doc(providerId).update({
        data: { [pendingKey]: null, updateTime: db.serverDate() }
      });
    } else {
      return { code: 1001, message: '无效的操作' };
    }

    if (provider.userId) {
      const statusText = action === 'approve' ? '已通过' : '已拒绝';
      await db.collection('notifications').add({
        data: {
          userId: provider.userId,
          type: 'avatar_update_result',
          title: `${label}修改${statusText}`,
          content: `您的${label}修改申请${statusText}`,
          relatedId: providerId,
          read: false,
          createTime: db.serverDate(),
        }
      }).catch(() => {});
    }

    return { code: 0, message: action === 'approve' ? '已通过' : '已拒绝' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
