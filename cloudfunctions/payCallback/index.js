const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const returnCode = event.return_code || '';
    const outTradeNo = event.out_trade_no || '';
    const transactionId = event.transaction_id || '';

    if (returnCode === 'SUCCESS') {
      await db.collection('orders').where({ orderNo: outTradeNo }).update({
        data: {
          orderStatus: 'paid',
          payTime: db.serverDate(),
          updateTime: db.serverDate(),
        }
      });

      await db.collection('payments').where({ orderNo: outTradeNo }).update({
        data: {
          transactionId,
          payStatus: 'success',
          payTime: db.serverDate(),
          updateTime: db.serverDate(),
        }
      });

      return { statusCode: 200, body: '<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>' };
    }

    return { statusCode: 200, body: '<xml><return_code><![CDATA[FAIL]]></return_code></xml>' };
  } catch (err) {
    console.error('[payCallback]', err);
    return { statusCode: 500, body: '<xml><return_code><![CDATA[FAIL]]></return_code></xml>' };
  }
};

