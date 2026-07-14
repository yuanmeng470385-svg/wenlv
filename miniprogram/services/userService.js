/**
 * 用户相关服务
 */
const { callFunction } = require('./cloud');

/**
 * 微信登录 / 自动注册
 */
const login = () => callFunction('login');

/**
 * 更新用户资料
 */
const updateUserInfo = (data) => callFunction('updateUserInfo', data);

/**
 * 申请成为服务商
 */
const applyProvider = (data) => callFunction('applyProvider', data);

/**
 * 切换当前身份
 */
const switchRole = (role) => callFunction('switchRole', { role });

module.exports = {
  login,
  updateUserInfo,
  applyProvider,
  switchRole,
};

