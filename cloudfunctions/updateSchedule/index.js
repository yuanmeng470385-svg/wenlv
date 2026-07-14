const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { date, timeSlots } = event;

  try {
    const providerRes = await db.collection('providers').where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '服务商不存在' };
    const provider = providerRes.data[0];

    // 更新或创建时段
    for (const slot of (timeSlots || [])) {
      const exist = await db.collection('timeSlots').where({
        providerId: provider._id, date, time: slot.time
      }).get();

      if (exist.data.length > 0) {
        await db.collection('timeSlots').doc(exist.data[0]._id).update({
          data: { available: slot.available, updateTime: db.serverDate() }
        });
      } else {
        await db.collection('timeSlots').add({
          data: { providerId: provider._id, date, time: slot.time, available: slot.available, createTime: db.serverDate(), updateTime: db.serverDate() }
        });
      }
    }
    return { code: 0, data: {}, message: '档期更新成功' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
