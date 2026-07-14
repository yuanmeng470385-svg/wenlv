const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

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
    return {
      code: 0,
      data: { userInfo: user.data[0] },
      message: 'success',
    };
  } catch (err) {
    console.error('[login]', err);
    return { code: 9999, message: err.message };
  }
};

