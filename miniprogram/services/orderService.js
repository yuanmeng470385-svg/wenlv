/**
 * 订单/支付/评价相关服务
 */
const { callFunction } = require('./cloud');

/** 创建订单 */
const createOrder = (data) => callFunction('createOrder', data);

/** 调起支付 */
const payOrder = (orderId) => callFunction('payOrder', { orderId });

/** 获取订单列表 */
const getOrderList = (params) => callFunction('getOrderList', params);

/** 获取订单详情 */
const getOrderDetail = (orderId) => callFunction('getOrderDetail', { orderId });

/** 取消订单 */
const cancelOrder = (orderId, cancelReason) =>
  callFunction('cancelOrder', { orderId, cancelReason });

/** 提交评价 */
const createReview = (data) => callFunction('createReview', data);

/** 获取评价列表 */
const getReviews = (providerId) => callFunction('getReviews', { providerId });

/** 点赞/取消点赞 */
const toggleLike = (targetType, targetId) =>
  callFunction('toggleLike', { targetType, targetId });

/** 收藏/取消收藏 */
const toggleFavorite = (targetType, targetId) =>
  callFunction('toggleFavorite', { targetType, targetId });

/** 获取收藏列表 */
const getFavorites = () => callFunction('getFavorites');

module.exports = {
  createOrder,
  payOrder,
  getOrderList,
  getOrderDetail,
  cancelOrder,
  createReview,
  getReviews,
  toggleLike,
  toggleFavorite,
  getFavorites,
};

