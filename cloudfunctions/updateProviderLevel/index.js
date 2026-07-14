const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const LEVEL_MAP = { 1: '初级', 2: '中级', 3: '高级', 4: '资深', 5: '首席' };

exports.main = async (event, context) => {
  const { providerId, level } = event;

  try {
    if (!level || level < 1 || level > 5) return { code: 1001, message: '等级需为 1-5' };

    await db.collection('providers').doc(providerId).update({
      data: { level, levelName: LEVEL_MAP[level], updateTime: db.serverDate() }
    });

    return { code: 0, data: { level, levelName: LEVEL_MAP[level] }, message: '等级更新成功' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
