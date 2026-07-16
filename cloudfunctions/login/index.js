const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    // 查找或创建用户
    const userRes = await db.collection('users').where({ _openid: openid }).get();

    if (userRes.data.length === 0) {
      // 新用户，自动注册
      await db.collection('users').add({
        data: {
          _openid: openid,
          nickName: event.nickName || '微信用户',
          avatarUrl: event.avatarUrl || '',
          phone: '',
          roles: ['user'],
          activeRole: 'user',
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
        }
      });
    } else {
      // 更新登录信息
      if (event.nickName || event.avatarUrl) {
        const updateData = { updateTime: db.serverDate() };
        if (event.nickName) updateData.nickName = event.nickName;
        if (event.avatarUrl) updateData.avatarUrl = event.avatarUrl;
        await db.collection('users').doc(userRes.data[0]._id).update({ data: updateData });
      }
    }

    // 返回用户信息
    const user = await db.collection('users').where({ _openid: openid }).get();
    const userInfo = user.data[0];
    // 封禁检查
    if (userInfo && userInfo.status === 'banned') {
      return { code: 1002, message: `账户已被封禁${userInfo.banReason ? '：' + userInfo.banReason : ''}` };
    }
    if (userInfo && userInfo.phone) {
      userInfo.phone = maskPhone(userInfo.phone);
    }
    return {
      code: 0,
      data: { userInfo },
      message: 'success',
    };
  } catch (err) {
    console.error('[login]', err);
    return { code: 9999, message: err.message };
  }
};

