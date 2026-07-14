const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { date, time, action } = event;

  try {
    const providerRes = await db.collection('providers').where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您还不是服务商' };
    const provider = providerRes.data[0];

    // action: 'toggle' 切换单个 / 'all_on' 全天开启 / 'all_off' 全天关闭
    if (action === 'all_on' || action === 'all_off') {
      const available = action === 'all_on';
      const DEFAULT_SLOTS = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00'];
      for (const t of DEFAULT_SLOTS) {
        const exist = await db.collection('timeSlots').where({ providerId: provider._id, date, time: t }).get();
        if (exist.data.length > 0) {
          await db.collection('timeSlots').doc(exist.data[0]._id).update({ data: { available, updateTime: db.serverDate() } });
        } else {
          await db.collection('timeSlots').add({ data: { providerId: provider._id, date, time: t, available, createTime: db.serverDate(), updateTime: db.serverDate() } });
        }
      }
      return { code: 0, data: {}, message: available ? '全天已开启' : '全天已关闭' };
    }

    // 切换单个时段
    const exist = await db.collection('timeSlots').where({ providerId: provider._id, date, time }).get();
    if (exist.data.length > 0) {
      const newAvail = !exist.data[0].available;
      await db.collection('timeSlots').doc(exist.data[0]._id).update({ data: { available: newAvail, updateTime: db.serverDate() } });
      return { code: 0, data: { available: newAvail }, message: newAvail ? '已开启' : '已关闭' };
    } else {
      await db.collection('timeSlots').add({ data: { providerId: provider._id, date, time, available: false, createTime: db.serverDate(), updateTime: db.serverDate() } });
      return { code: 0, data: { available: false }, message: '已关闭' };
    }
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
