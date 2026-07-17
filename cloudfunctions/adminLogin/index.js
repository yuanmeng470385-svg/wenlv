const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID;
  if (!openid) return { code: 1002, message: '未登录' };

  const { password } = event;
  if (!password) return { code: 1001, message: '请输入密码' };

  try {
    // 检查用户是否拥有 admin 角色
    const userRes = await db.collection('users').where({ _openid: openid }).get();
    if (userRes.data.length === 0 || !(userRes.data[0].roles || []).includes('admin')) {
      return { code: 1003, message: '无管理员权限，需在数据库中手动添加 admin 角色' };
    }

    // 从 config 集合读取管理员密码，默认 "admin123"
    const configRes = await db.collection('config').where({ key: 'adminPassword' }).get();
    const correctPwd = (configRes.data.length > 0) ? configRes.data[0].value : 'admin123';
    if (password === correctPwd) {
      return { code: 0, data: {}, message: '验证通过' };
    }
    return { code: 1002, message: '密码错误' };
  } catch (err) {
    return { code: 9999, message: err.message };
  }
};
