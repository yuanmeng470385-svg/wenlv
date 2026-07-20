const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const DEFAULT_SLOTS = ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00'];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { date } = event;

  try {
    const { role } = event;
    const query = { userId: openid, status: 'active' };
    if (role) query.categoryType = role;
    const providerRes = await db.collection('providers').where(query).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您还不是服务商' };
    const provider = providerRes.data[0];

    // 获取该日期的自定义时段
    const slotsRes = await db.collection('timeSlots').where({ providerId: provider._id, date }).get();
    const customSlots = {};
    for (const s of slotsRes.data) { customSlots[s.time] = s.available; }

    // 合并：默认时段 + 自定义覆盖
    const slots = DEFAULT_SLOTS.map(time => ({
      time,
      available: customSlots[time] !== undefined ? customSlots[time] : true,
    }));

    return { code: 0, data: { slots }, message: 'success' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
