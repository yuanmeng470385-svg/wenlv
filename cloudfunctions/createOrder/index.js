const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) return { code: 1002, message: '未登录' };
  const { items, contactName, contactPhone, remark } = event;

  try {
    // 参数校验
    if (!items || items.length === 0) {
      return { code: 1001, message: '请至少选择一个服务项目' };
    }
    if (!contactName || !contactPhone) {
      return { code: 1001, message: '请填写联系人信息' };
    }

    // 校验每个服务项
    let totalFee = 0;
    const orderItems = [];

    for (const item of items) {
      const itemRes = await db.collection('serviceItems').doc(item.serviceItemId).get();
      if (!itemRes.data || itemRes.data.status !== 'active') {
        return { code: 1003, message: `服务项 [${item.name || item.serviceItemId}] 不可用` };
      }

      const serviceItem = itemRes.data;

      // 检查商家是否休假
      const provider = await db.collection('providers').doc(serviceItem.providerId).get();
      if (provider.data && provider.data.isOpen === false) {
        return { code: 2002, message: `[${serviceItem.name}] 的商家已暂停接单，请稍后再试` };
      }

      let itemPrice = serviceItem.price;
      let duration = serviceItem.duration;
      const quantity = item.quantity || 1;
      let subtotal = 0;

      if (serviceItem.priceType === 'hourly') {
        // 按时计费: 用户选的小时数 * 时价
        const hours = item.hours || 1;
        duration = hours * 60;
        subtotal = serviceItem.price * hours * quantity;
      } else {
        subtotal = serviceItem.price * quantity;
      }

      totalFee += subtotal;

      // 校验预约时段是否被商家开放
      if (item.appointmentDate && item.appointmentTime) {
        const slotCheck = await db.collection('timeSlots').where({
          providerId: serviceItem.providerId,
          date: item.appointmentDate,
          time: item.appointmentTime,
        }).get();
        if (slotCheck.data.length > 0 && !slotCheck.data[0].available) {
          return { code: 2002, message: `${item.appointmentDate} ${item.appointmentTime} 该时段已被商家关闭，请选择其他时段` };
        }
      }

      orderItems.push({
        providerId: serviceItem.providerId,
        serviceItemId: item.serviceItemId,
        categoryType: serviceItem.categoryType,
        name: serviceItem.name,
        price: serviceItem.price,
        priceType: serviceItem.priceType,
        quantity,
        duration,
        appointmentDate: item.appointmentDate || '',
        appointmentTime: item.appointmentTime || '',
        status: 'pending_pay',
      });
    }

    // 生成订单号
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const orderNo = `WL${y}${mo}${d}${h}${mi}${s}${rand}`;

    // 写入订单
    const orderData = {
      orderNo,
      userId: openid,
      items: orderItems,
      totalFee,
      contactName,
      contactPhone,
      remark: remark || '',
      orderStatus: 'pending_pay',
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
    };

    const result = await db.collection('orders').add({ data: orderData });

    return {
      code: 0,
      data: { orderId: result._id, orderNo, totalFee },
      message: '订单创建成功',
    };
  } catch (err) {
    console.error('[createOrder]', err);
    return { code: 9999, message: err.message };
  }
};

