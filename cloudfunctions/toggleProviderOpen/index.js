const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 商家切换营业/休假状态（全局开关，不影响已确认的订单）
 * event: {}  无参数，自动切换当前商家的 isOpen 状态
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  try {
    const { role } = event;
    const query = { userId: openid, status: 'active' };
    if (role) query.categoryType = role;
    const providerRes = await db.collection('providers').where(query).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您还不是审核通过的服务商' };
    const provider = providerRes.data[0];

    const newOpen = !(provider.isOpen !== false); // 默认 true（营业中），切换
    await db.collection('providers').doc(provider._id).update({
      data: { isOpen: newOpen, updateTime: db.serverDate() }
    });

    return {
      code: 0,
      data: { isOpen: newOpen },
      message: newOpen ? '已切换为营业中' : '已切换为休假模式（已有订单不受影响）',
    };
  } catch (err) {
    console.error('[toggleProviderOpen]', err);
    return { code: 9999, message: err.message };
  }
};
