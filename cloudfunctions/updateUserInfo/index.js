const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { nickName, avatarUrl, phone } = event;

  try {
    const updateData = { updateTime: db.serverDate() };
    if (nickName !== undefined) updateData.nickName = nickName;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (phone !== undefined) updateData.phone = phone;

    await db.collection('users').where({ _openid: openid }).update({ data: updateData });
    return { code: 0, data: { updated: true }, message: '更新成功' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
