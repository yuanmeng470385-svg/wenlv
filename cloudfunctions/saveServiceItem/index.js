const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { serviceItemId, name, description, coverImage, priceType, price, originalPrice, duration, includes, maxDailyBooking, status, icon } = event;

  try {
    const providerRes = await db.collection('providers').where({ userId: openid, status: 'active' }).get();
    if (providerRes.data.length === 0) return { code: 1003, message: '您还不是服务商' };
    const provider = providerRes.data[0];

    if (!name || !price || !duration) {
      return { code: 1001, message: '请填写套餐名称、价格和时长' };
    }
    if (!['fixed', 'hourly', 'project'].includes(priceType)) {
      return { code: 1001, message: '价格类型无效' };
    }

    const data = {
      name,
      description: description || '',
      coverImage: coverImage || '',
      priceType: priceType || 'fixed',
      price: Math.round(price * 100),
      originalPrice: Math.round((originalPrice || price) * 100),
      duration: parseInt(duration) || 60,
      includes: includes || [],
      maxDailyBooking: parseInt(maxDailyBooking) || 5,
      icon: icon || '',
      updateTime: db.serverDate(),
    };

    if (serviceItemId) {
      // 更新（保持原有审核状态）
      const item = await db.collection('serviceItems').doc(serviceItemId).get();
      if (!item.data || item.data.providerId !== provider._id) {
        return { code: 1002, message: '无权修改此套餐' };
      }
      data.status = item.data.status; // 保持原状态
      await db.collection('serviceItems').doc(serviceItemId).update({ data });
      return { code: 0, data: { serviceItemId }, message: '套餐已更新' };
    } else {
      // 新建（需管理员审核）
      data.status = 'pending_review';
      if (!status) data.status = 'pending_review';
      data.providerId = provider._id;
      data.categoryType = provider.categoryType;
      data.sortOrder = 99;
      data.createTime = db.serverDate();
      const res = await db.collection('serviceItems').add({ data });
      return { code: 0, data: { serviceItemId: res._id }, message: '套餐已创建' };
    }
  } catch (err) {
    console.error('[saveServiceItem]', err);
    return { code: 9999, message: err.message };
  }
};
