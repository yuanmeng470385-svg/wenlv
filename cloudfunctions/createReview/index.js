const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { orderId, rating, content, images = [] } = event;

  try {
    if (!rating || rating < 1 || rating > 5) {
      return { code: 1001, message: '评分必须为1-5' };
    }

    const orderRes = await db.collection('orders').doc(orderId).get();
    if (!orderRes.data) return { code: 1003, message: '订单不存在' };
    if (orderRes.data.userId !== openid) return { code: 1002, message: '无权评价' };
    if (orderRes.data.orderStatus !== 'completed') return { code: 2001, message: '仅已完成订单可评价' };

    // 对每个服务商分别创建评价
    const providerIds = [...new Set(orderRes.data.items.map(i => i.providerId))];

    for (const providerId of providerIds) {
      await db.collection('reviews').add({
        data: {
          orderId,
          userId: openid,
          providerId,
          rating,
          content: content || '',
          images,
          createTime: db.serverDate(),
        }
      });

      // 更新服务商评分
      const reviewRes = await db.collection('reviews').where({ providerId }).get();
      const totalRating = reviewRes.data.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = Math.round(totalRating / reviewRes.data.length * 10) / 10;

      await db.collection('providers').doc(providerId).update({
        data: {
          rating: avgRating,
          reviewCount: reviewRes.data.length,
        }
      });
    }

    // 更新订单状态
    await db.collection('orders').doc(orderId).update({
      data: { orderStatus: 'reviewed', updateTime: db.serverDate() }
    });

    return { code: 0, data: {}, message: '评价成功' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};

