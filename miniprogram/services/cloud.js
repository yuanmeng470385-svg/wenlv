/**
 * 云函数统一调用封装
 * 所有云函数返回 { code: 0, data: ..., message: "success" }
 */

const app = getApp();

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {object} data - 参数
 * @returns {Promise<any>} 返回 result.data
 */
const callFunction = async (name, data = {}) => {
  try {
    const res = await wx.cloud.callFunction({ name, data });
    if (res.result && res.result.code === 0) {
      return res.result.data;
    }
    throw new Error((res.result && res.result.message) || '请求失败');
  } catch (err) {
    console.error(`[cloud] ${name}:`, err);
    throw err;
  }
};

/**
 * 带 loading 的云函数调用
 */
const callFunctionWithLoading = async (name, data = {}, title = '加载中...') => {
  wx.showLoading({ title, mask: true });
  try {
    return await callFunction(name, data);
  } finally {
    wx.hideLoading();
  }
};

/**
 * 上传文件到云存储
 */
const uploadFile = async (cloudPath, filePath) => {
  try {
    const res = await wx.cloud.uploadFile({ cloudPath, filePath });
    return res.fileID;
  } catch (err) {
    console.error('[cloud] uploadFile:', err);
    throw err;
  }
};

/**
 * 获取临时链接
 */
const getTempFileURL = async (fileIDList) => {
  try {
    const res = await wx.cloud.getTempFileURL({ fileList: fileIDList });
    return res.fileList;
  } catch (err) {
    console.error('[cloud] getTempFileURL:', err);
    throw err;
  }
};

module.exports = {
  callFunction,
  callFunctionWithLoading,
  uploadFile,
  getTempFileURL,
};

