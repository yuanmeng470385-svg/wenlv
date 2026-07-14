const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { name, phone, description, featureTags } = event;

  try {
    const providerRes = await db.collection('providers').where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '服务商不存在' };

    const updateData = { updateTime: db.serverDate() };
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (description !== undefined) updateData.description = description;
    if (featureTags !== undefined) updateData.featureTags = featureTags;

    await db.collection('providers').doc(providerRes.data[0]._id).update({ data: updateData });
    return { code: 0, data: { updated: true }, message: '资料更新成功' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
