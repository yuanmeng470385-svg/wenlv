const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 腾讯地图 WebService API Key（仅服务端，不暴露前端）
const TENCENT_MAP_KEY = 'UDDBZ-7PWL4-KL7UQ-FT5MW-XVZ7Q-5ABZR';

// 简单内存缓存：同一城市+关键词 10 分钟内不重复调 API，省配额
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10分钟

/** 通用 HTTPS GET → JSON */
function httpGet(url) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('解析地图API响应失败')); }
      });
    }).on('error', reject);
  });
}

exports.main = async (event, context) => {
  const { action = 'search' } = event;

  try {
    if (action === 'reverseGeocode') {
      return handleReverseGeocode(event);
    }
    return handleSearch(event);
  } catch (err) {
    console.error('[searchNearbyShops]', err);
    return { code: 9999, message: err.message };
  }
};

// ===== 地点搜索 =====
async function handleSearch(event) {
  const { city, keyword = '汉服店', page = 1, pageSize = 10 } = event;
  if (!city) return { code: 1001, message: '请指定城市' };

  // 检查缓存（同一城市+关键词有效期内直接返回）
  const cacheKey = `${city}:${keyword}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return { code: 0, data: { list: cached.list, total: cached.total }, message: 'success (cached)' };
  }

  const url = `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(keyword)}&boundary=region(${encodeURIComponent(city)},0)&page_size=${pageSize}&page_index=${page}&key=${TENCENT_MAP_KEY}`;
  const data = await httpGet(url);

  if (data.status !== 0) {
    return { code: 9999, message: data.message || '地图服务异常' };
  }

  const list = (data.data || []).map(poi => ({
    _id: poi.id,
    name: poi.title,
    address: poi.address,
    phone: poi.tel || '',
    lat: poi.location && poi.location.lat,
    lng: poi.location && poi.location.lng,
    category: poi.category,
  }));

  const total = data.count || 0;
  cache.set(cacheKey, { list, total, time: Date.now() });

  return { code: 0, data: { list, total }, message: 'success' };
}

// ===== 逆地理编码（经纬度→城市名） =====
async function handleReverseGeocode(event) {
  const { lat, lng } = event;
  if (lat == null || lng == null) return { code: 1001, message: '缺少经纬度' };

  // 检查缓存（经纬度四舍五入到小数点后 2 位 ≈ 1km 范围，同一区域城市名不变）
  const geoKey = `geo:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const geoCached = cache.get(geoKey);
  if (geoCached && Date.now() - geoCached.time < CACHE_TTL) {
    return { code: 0, data: { city: geoCached.city }, message: 'success (cached)' };
  }

  const geoUrl = `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=${TENCENT_MAP_KEY}`;
  const geo = await httpGet(geoUrl);

  if (geo.status === 0 && geo.result) {
    const ad = geo.result.address_component || geo.result.ad_info || {};
    const city = ad.city || (geo.result.address_component && geo.result.address_component.district) || '';
    // city 值带"市"后缀时去掉
    const cityClean = city ? city.replace(/市$/, '') : '';
    cache.set(geoKey, { city: cityClean, time: Date.now() });
    return { code: 0, data: { city: cityClean }, message: 'success' };
  }

  return { code: 0, data: { city: '' }, message: '逆地理编码失败' };
}
