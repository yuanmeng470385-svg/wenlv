/**
 * 服务商/服务项相关服务
 */
const { callFunction } = require('./cloud');

/**
 * 获取分类列表
 */
const getCategoryList = () => callFunction('getCategoryList');

/**
 * 获取服务商列表
 */
const getProviderList = (params) => callFunction('getProviderList', params);

/**
 * 获取服务商详情(含服务项+作品)
 */
const getProviderDetail = (providerId) =>
  callFunction('getProviderDetail', { providerId });

/**
 * 获取作品详情
 */
const getPortfolioDetail = (portfolioId) =>
  callFunction('getPortfolioDetail', { portfolioId });

module.exports = {
  getCategoryList,
  getProviderList,
  getProviderDetail,
  getPortfolioDetail,
};

