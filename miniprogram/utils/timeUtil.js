/**
 * 时间相关工具
 */

/** 获取未来N天的日期列表 */
const getDateList = (days = 30) => {
  const list = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    list.push({
      date: `${y}-${m}-${day}`,
      week: i === 0 ? '今天' : (i === 1 ? '明天' : week),
      monthDay: `${m}月${day}日`,
      isToday: i === 0,
    });
  }
  return list;
};

/** 默认时段列表 */
const getDefaultTimeSlots = () => {
  return [
    '08:00', '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00',
  ];
};

/** 计算两个日期时间相差的小时数 */
const hoursBetween = (dateStr, timeStr) => {
  const target = new Date(`${dateStr}T${timeStr}:00`);
  const now = new Date();
  return (target - now) / (1000 * 60 * 60);
};

/** 判断是否超过24小时 */
const isMoreThan24Hours = (dateStr, timeStr) => {
  return hoursBetween(dateStr, timeStr) > 24;
};

/** 格式化时长(分钟) */
const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
};

module.exports = {
  getDateList,
  getDefaultTimeSlots,
  hoursBetween,
  isMoreThan24Hours,
  formatDuration,
};

