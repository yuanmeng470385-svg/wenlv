const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return { code: 1002, message: '未登录' };
    const _admin = await db.collection('users').where({ _openid: openid }).get();
    if (!(_admin.data[0] && (_admin.data[0].roles || []).includes('admin'))) {
      return { code: 1002, message: '无管理员权限' };
    }
    // 1. 插入分类
    const catCollection = db.collection('categories');
    await catCollection.add({
      data: { name: '摄影师', type: 'photographer', icon: '📷', sortOrder: 1, status: 'active', createTime: db.serverDate() }
    });
    await catCollection.add({
      data: { name: '妆造师', type: 'makeup', icon: '💄', sortOrder: 2, status: 'active', createTime: db.serverDate() }
    });
    await catCollection.add({
      data: { name: '汉服店', type: 'hanfu_shop', icon: '👘', sortOrder: 3, status: 'active', createTime: db.serverDate() }
    });

    // 2. 插入摄影师(3人)
    const p1 = await db.collection('providers').add({
      data: { userId: 'test_p1', categoryType: 'photographer', name: '云裳摄影工作室', avatar: '', coverImages: [], description: '专注古风汉服摄影5年，善用自然光，捕捉最美瞬间。', level: 4, levelName: '资深', phone: '13800001111', city: '杭州', featureTags: ['古风','汉服','旅拍','夜景'], rating: 4.8, reviewCount: 126, orderCount: 520, status: 'active', createTime: db.serverDate(), updateTime: db.serverDate() }
    });
    const p2 = await db.collection('providers').add({
      data: { userId: 'test_p2', categoryType: 'photographer', name: '柳絮映像', avatar: '', coverImages: [], description: '90后新锐摄影师，风格清新自然。', level: 2, levelName: '中级', phone: '13800002222', city: '杭州', featureTags: ['清新','写真','情侣','日系'], rating: 4.6, reviewCount: 48, orderCount: 186, status: 'active', createTime: db.serverDate(), updateTime: db.serverDate() }
    });
    const p3 = await db.collection('providers').add({
      data: { userId: 'test_p3', categoryType: 'photographer', name: '墨白摄影', avatar: '', coverImages: [], description: '擅长汉服古风题材，从业8年，多个汉服文化节官方摄影师。', level: 5, levelName: '首席', phone: '13800003333', city: '西安', featureTags: ['汉服','古风','文化','艺术'], rating: 4.9, reviewCount: 312, orderCount: 890, status: 'active', createTime: db.serverDate(), updateTime: db.serverDate() }
    });

    // 3. 插入妆造师(3人)
    const m1 = await db.collection('providers').add({
      data: { userId: 'test_m1', categoryType: 'makeup', name: '花颜妆造', avatar: '', coverImages: [], description: '专业汉服妆造师，擅长唐制、宋制妆容。', level: 3, levelName: '高级', phone: '13800004444', city: '杭州', featureTags: ['汉服妆造','唐风','宋韵'], rating: 4.7, reviewCount: 89, orderCount: 340, status: 'active', createTime: db.serverDate(), updateTime: db.serverDate() }
    });
    const m2 = await db.collection('providers').add({
      data: { userId: 'test_m2', categoryType: 'makeup', name: '青黛造型工作室', avatar: '', coverImages: [], description: '影视级妆造，为多部古装剧提供服务。', level: 5, levelName: '首席', phone: '13800005555', city: '横店', featureTags: ['影视妆','古装','特效','定制'], rating: 4.9, reviewCount: 205, orderCount: 670, status: 'active', createTime: db.serverDate(), updateTime: db.serverDate() }
    });
    const m3 = await db.collection('providers').add({
      data: { userId: 'test_m3', categoryType: 'makeup', name: '海棠妆坊', avatar: '', coverImages: [], description: '汉服妆造新秀，主打明制妆容，价格亲民。', level: 1, levelName: '初级', phone: '13800006666', city: '南京', featureTags: ['明制','汉服','平价'], rating: 4.5, reviewCount: 26, orderCount: 78, status: 'active', createTime: db.serverDate(), updateTime: db.serverDate() }
    });

    // 4. 插入汉服店(2家)
    const h1 = await db.collection('providers').add({
      data: { userId: 'test_h1', categoryType: 'hanfu_shop', name: '锦绣华裳汉服馆', avatar: '', coverImages: [], description: '汉服租赁与售卖，300+款式可选。', level: 0, levelName: '', phone: '13800007777', city: '杭州', featureTags: ['租赁','售卖','唐制','宋制','明制'], rating: 4.8, reviewCount: 156, orderCount: 480, status: 'active', createTime: db.serverDate(), updateTime: db.serverDate() }
    });
    const h2 = await db.collection('providers').add({
      data: { userId: 'test_h2', categoryType: 'hanfu_shop', name: '霓裳羽衣坊', avatar: '', coverImages: [], description: '高端定制汉服，手工苏绣工艺。', level: 0, levelName: '', phone: '13800008888', city: '苏州', featureTags: ['定制','刺绣','高端'], rating: 4.9, reviewCount: 98, orderCount: 235, status: 'active', createTime: db.serverDate(), updateTime: db.serverDate() }
    });

    // 5. 插入服务项
    const serviceItems = [
      { providerId: p1._id, categoryType: 'photographer', name: '古风人像精拍', description: '2小时拍摄+30张精修+所有底片', priceType: 'fixed', price: 69900, originalPrice: 89900, duration: 120, includes: ['2小时拍摄','30张精修','所有底片','服装建议'], maxDailyBooking: 3, status: 'active', sortOrder: 1 },
      { providerId: p1._id, categoryType: 'photographer', name: '汉服旅拍跟拍', description: '4小时全程跟拍+50张精修', priceType: 'fixed', price: 129900, originalPrice: 159900, duration: 240, includes: ['4小时跟拍','50张精修','拍摄地推荐'], maxDailyBooking: 2, status: 'active', sortOrder: 2 },
      { providerId: p1._id, categoryType: 'photographer', name: '夜景汉服写真', description: '专业灯光+夜景拍摄', priceType: 'fixed', price: 89900, originalPrice: 109900, duration: 180, includes: ['3小时拍摄','专业灯光','20张精修'], maxDailyBooking: 1, status: 'active', sortOrder: 3 },
      { providerId: p2._id, categoryType: 'photographer', name: '日常写真', description: '2小时拍摄+20张精修', priceType: 'fixed', price: 39900, originalPrice: 49900, duration: 120, includes: ['2小时拍摄','20张精修','所有底片'], maxDailyBooking: 4, status: 'active', sortOrder: 1 },
      { providerId: p2._id, categoryType: 'photographer', name: '情侣写真', description: '3小时双人拍摄+30张精修', priceType: 'fixed', price: 59900, originalPrice: 79900, duration: 180, includes: ['3小时拍摄','30张精修','双人指导'], maxDailyBooking: 3, status: 'active', sortOrder: 2 },
      { providerId: p3._id, categoryType: 'photographer', name: '汉服文化主题拍摄', description: '全天文化主题策划+拍摄+精修', priceType: 'fixed', price: 159900, originalPrice: 199900, duration: 360, includes: ['主题策划','全天拍摄','60张精修'], maxDailyBooking: 1, status: 'active', sortOrder: 1 },
      { providerId: p3._id, categoryType: 'photographer', name: '按时计费拍摄', description: '按小时计费，自由灵活', priceType: 'hourly', price: 30000, originalPrice: 35000, duration: 60, includes: ['专业拍摄','基础调色','底片全送'], maxDailyBooking: 8, status: 'active', sortOrder: 2 },
      { providerId: p3._id, categoryType: 'photographer', name: '商业汉服拍摄', description: '面向品牌/电商的商业级拍摄', priceType: 'project', price: 299900, originalPrice: 399900, duration: 480, includes: ['全天拍摄','100+精修','商业授权'], maxDailyBooking: 1, status: 'active', sortOrder: 3 },
      { providerId: m1._id, categoryType: 'makeup', name: '汉服妆造体验', description: '基础汉服妆造+发型设计', priceType: 'fixed', price: 29900, originalPrice: 39900, duration: 60, includes: ['底妆','汉服妆容','发髻造型','配饰搭配'], maxDailyBooking: 6, status: 'active', sortOrder: 1 },
      { providerId: m1._id, categoryType: 'makeup', name: '唐风精致妆造', description: '唐代风格全套装造+头饰搭配', priceType: 'fixed', price: 49900, originalPrice: 59900, duration: 90, includes: ['全妆','唐风发髻','花钿','全套头饰'], maxDailyBooking: 4, status: 'active', sortOrder: 2 },
      { providerId: m2._id, categoryType: 'makeup', name: '影视级妆造', description: '专业影视化妆+特效妆', priceType: 'project', price: 89900, originalPrice: 129900, duration: 120, includes: ['全妆设计','特效妆','发型','持久定妆'], maxDailyBooking: 2, status: 'active', sortOrder: 1 },
      { providerId: m3._id, categoryType: 'makeup', name: '明制日常妆', description: '明代风格淡雅日常妆造', priceType: 'fixed', price: 19900, originalPrice: 29900, duration: 45, includes: ['底妆','淡雅妆容','简单发髻'], maxDailyBooking: 8, status: 'active', sortOrder: 1 },
      { providerId: m3._id, categoryType: 'makeup', name: '按小时妆造', description: '灵活计费，按需选择', priceType: 'hourly', price: 15000, originalPrice: 20000, duration: 60, includes: ['妆造服务','基础造型'], maxDailyBooking: 6, status: 'active', sortOrder: 2 },
      { providerId: h1._id, categoryType: 'hanfu_shop', name: '汉服日租(基础款)', description: '任选基础款汉服一套，含基础配饰', priceType: 'fixed', price: 9900, originalPrice: 12900, duration: 1440, includes: ['汉服一套','基础配饰','试穿服务'], maxDailyBooking: 20, status: 'active', sortOrder: 1 },
      { providerId: h1._id, categoryType: 'hanfu_shop', name: '汉服日租(精品款)', description: '任选精品汉服一套，含全套配饰', priceType: 'fixed', price: 19900, originalPrice: 25900, duration: 1440, includes: ['精品汉服','全套配饰','妆容建议'], maxDailyBooking: 10, status: 'active', sortOrder: 2 },
      { providerId: h1._id, categoryType: 'hanfu_shop', name: '汉服购买定制', description: '高端手工定制汉服', priceType: 'project', price: 99900, originalPrice: 129900, duration: 0, includes: ['量身定制','手工制作','面料任选'], maxDailyBooking: 2, status: 'active', sortOrder: 3 },
      { providerId: h2._id, categoryType: 'hanfu_shop', name: '手工刺绣汉服定制', description: '苏绣工艺手工定制汉服', priceType: 'project', price: 199900, originalPrice: 299900, duration: 0, includes: ['苏绣工艺','量身定制','设计稿','3次修改'], maxDailyBooking: 1, status: 'active', sortOrder: 1 },
      { providerId: h2._id, categoryType: 'hanfu_shop', name: '团体汉服租赁', description: '5人以上团体租赁优惠', priceType: 'fixed', price: 69900, originalPrice: 89900, duration: 1440, includes: ['5套汉服','配饰5套','专人服务'], maxDailyBooking: 5, status: 'active', sortOrder: 2 },
    ];
    for (const item of serviceItems) {
      await db.collection('serviceItems').add({ data: { ...item, createTime: db.serverDate(), updateTime: db.serverDate() } });
    }

    // 6. 插入作品示例
    const portfolios = [
      { providerId: p1._id, categoryType: 'photographer', title: '柳岸春晓-汉服人像', images: [], styleTags: ['古风','汉服','春季'], description: '西湖畔春日汉服拍摄', shootDate: '2026-04-15', shootLocation: '杭州西湖', status: 'approved', likeCount: 230, viewCount: 1520, createTime: db.serverDate() },
      { providerId: p1._id, categoryType: 'photographer', title: '月下独舞-夜景汉服', images: [], styleTags: ['夜景','汉服','古风'], description: '中秋月圆之夜夜景汉服系列', shootDate: '2025-09-15', shootLocation: '杭州雷峰塔', status: 'approved', likeCount: 345, viewCount: 2180, createTime: db.serverDate() },
      { providerId: p3._id, categoryType: 'photographer', title: '长安十二时辰', images: [], styleTags: ['唐风','文化','古建筑'], description: '以唐代长安为主题的文化摄影系列', shootDate: '2026-03-20', shootLocation: '西安大唐芙蓉园', status: 'approved', likeCount: 567, viewCount: 3250, createTime: db.serverDate() },
      { providerId: m1._id, categoryType: 'makeup', title: '唐风花钿妆', images: [], styleTags: ['唐风','花钿','精致'], description: '还原唐代宫廷妆容', makeupDuration: 90, productBrands: ['MAC','NARS'], status: 'approved', likeCount: 189, viewCount: 980, createTime: db.serverDate() },
      { providerId: m2._id, categoryType: 'makeup', title: '古装剧人物造型', images: [], styleTags: ['影视','古装','定妆'], description: '为古装网剧设计的人物造型', makeupDuration: 120, productBrands: ['Dior','Bobbi Brown'], status: 'approved', likeCount: 423, viewCount: 2650, createTime: db.serverDate() },
      { providerId: h1._id, categoryType: 'hanfu_shop', title: '明制立领长袄套装', images: [], styleTags: ['明制','立领','刺绣'], description: '明制立领长袄+马面裙套装', hanfuType: '明制', sizeRange: 'S-XXL', condition: '全新', forRent: true, forSale: true, status: 'approved', likeCount: 156, viewCount: 890, createTime: db.serverDate() },
      { providerId: h2._id, categoryType: 'hanfu_shop', title: '手工苏绣齐胸襦裙', images: [], styleTags: ['唐制','刺绣','手工'], description: '纯手工苏绣齐胸襦裙', hanfuType: '唐制', sizeRange: '定制', condition: '全新', forRent: false, forSale: true, status: 'approved', likeCount: 289, viewCount: 1560, createTime: db.serverDate() },
    ];
    for (const p of portfolios) {
      await db.collection('portfolios').add({ data: p });
    }

    return {
      code: 0,
      data: { photographers: 3, makeupArtists: 3, hanfuShops: 2, serviceItems: serviceItems.length, portfolios: portfolios.length },
      message: `测试数据初始化完成：3摄影师 + 3妆造师 + 2汉服店 + ${serviceItems.length}服务项 + ${portfolios.length}作品`,
    };
  } catch (err) {
    console.error('[initTestData]', err);
    return { code: 9999, message: err.message };
  }
};
