/**
 * 表单校验工具
 */

/** 手机号校验 */
const isValidPhone = (phone) => /^1[3-9]\d{9}$/.test(phone);

/** 必填校验 */
const isRequired = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
};

/** 校验预约表单 */
const validateBookingForm = (form) => {
  const errors = [];
  if (!form.contactName || !form.contactName.trim()) {
    errors.push('请输入联系人姓名');
  }
  if (!isValidPhone(form.contactPhone)) {
    errors.push('请输入正确的手机号');
  }
  if (!form.items || form.items.length === 0) {
    errors.push('请选择服务项目');
  }
  for (const item of form.items) {
    if (!item.appointmentDate) {
      errors.push('请选择预约日期');
      break;
    }
    if (!item.appointmentTime) {
      errors.push('请选择预约时段');
      break;
    }
  }
  return errors;
};

module.exports = {
  isValidPhone,
  isRequired,
  validateBookingForm,
};

