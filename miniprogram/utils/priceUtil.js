/**
 * 金额处理工具
 * 数据库存储单位为"分"，前端展示为"元"
 */

/** 分转元 */
const fenToYuan = (fen) => {
  return (fen / 100).toFixed(2);
};

/** 元转分 */
const yuanToFen = (yuan) => {
  return Math.round(parseFloat(yuan) * 100);
};

/** 格式化价格显示 */
const formatPrice = (fen) => {
  const yuan = fen / 100;
  if (yuan >= 10000) {
    return `${(yuan / 10000).toFixed(1)}万`;
  }
  return yuan % 1 === 0 ? `¥${yuan}` : `¥${yuan.toFixed(2)}`;
};

/** 计算总价(分) */
const calcTotalFee = (items) => {
  return items.reduce((sum, item) => {
    if (item.priceType === 'hourly') {
      // 按时计费: 单价 * 小时数
      const hours = Math.ceil(item.duration / 60);
      return sum + item.price * hours * (item.quantity || 1);
    }
    return sum + item.price * (item.quantity || 1);
  }, 0);
};

/** 计算退款金额 */
const calcRefundAmount = (totalFee, dateStr, timeStr) => {
  const timeUtil = require('./timeUtil');
  if (timeUtil.isMoreThan24Hours(dateStr, timeStr)) {
    return totalFee; // 全额退款
  }
  return Math.floor(totalFee * 0.5); // 退50%
};

module.exports = {
  fenToYuan,
  yuanToFen,
  formatPrice,
  calcTotalFee,
  calcRefundAmount,
};

