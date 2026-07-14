const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { role } = event;

  try {
    // 校验用户是否有该角色
    const userRes = await db.collection('users').where({ _openid: openid }).get();
    if (userRes.data.length === 0) return { code: 1002, message: '用户不存在' };

    const user = userRes.data[0];
    if (!user.roles || !user.roles.includes(role)) {
      return { code: 1001, message: `您没有 [${role}] 身份` };
    }

    await db.collection('users').doc(user._id).update({
      data: { activeRole: role, updateTime: db.serverDate() }
    });

    return { code: 0, data: { activeRole: role }, message: '身份切换成功' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
