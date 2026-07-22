const { callFunction } = require('../../services/cloud');
const { getProviderList } = require('../../services/serviceService');

Component({
  data: {
    city: '',           // 当前选中的城市
    locating: true,     // 定位加载中
    loaded: false,      // 是否已加载过结果
    activeSec: 'in',    // in=平台入驻 / near=附近门店
    inProviders: [],    // 已入住汉服店
    nearbyShops: [],    // 附近外部汉服店
    inLoading: false,
    nearLoading: false,
    inEmpty: false,
    nearEmpty: false,
  },

  lifetimes: {
    attached() {
      this.autoLocate();
    },
  },

  methods: {
    // ===== 自动定位 =====
    async autoLocate() {
      this.setData({ locating: true });
      try {
        const loc = await new Promise((resolve, reject) => {
          wx.getLocation({ type: 'gcj02', success: resolve, fail: reject });
        });

        // 逆地理编码取城市名（通过云函数调腾讯地图 API）
        const cityData = await callFunction('searchNearbyShops', {
          action: 'reverseGeocode', lat: loc.latitude, lng: loc.longitude,
        });
        if (cityData && cityData.city) {
          this.setData({ city: cityData.city });
          this.loadAll();
        } else {
          this.setData({ locating: false });
        }
      } catch (err) {
        console.error('定位失败:', err);
        wx.showToast({ title: '定位失败，请手动选择城市', icon: 'none' });
        this.setData({ locating: false });
      }
    },

    // ===== 手动选择城市 =====
    onSelectCity() {
      wx.showModal({
        title: '选择城市',
        editable: true,
        placeholderText: '请输入城市名（如：杭州）',
        success: (res) => {
          if (res.confirm && res.content && res.content.trim()) {
            const city = res.content.trim().replace(/市$/, '');
            this.setData({ city, locating: false });
            this.loadAll();
          }
        },
      });
    },

    // ===== 重新定位 =====
    onRelocate() {
      this.autoLocate();
    },

    // ===== 加载结果 =====
    async loadAll() {
      this.setData({ loaded: true, locating: false });
      await Promise.all([this.loadInProviders(), this.loadNearbyShops()]);
    },

    // 加载平台已入住
    async loadInProviders() {
      this.setData({ inLoading: true });
      try {
        const res = await getProviderList({
          categoryType: 'hanfu_shop',
          city: this.data.city,
          page: 1,
          pageSize: 10,
        });
        const list = res && res.list ? res.list : [];
        const mapped = list.map(p => Object.assign({}, p, { _glyph: (p.name || '服').charAt(0) }));
        this.setData({ inProviders: mapped, inEmpty: mapped.length === 0, inLoading: false });
      } catch (err) {
        console.error('加载入驻汉服店失败:', err);
        this.setData({ inLoading: false });
      }
    },

    // 加载附近外部汉服店
    async loadNearbyShops() {
      this.setData({ nearLoading: true });
      try {
        const res = await callFunction('searchNearbyShops', {
          action: 'search',
          city: this.data.city,
          keyword: '汉服店',
          page: 1,
          pageSize: 10,
        });
        const list = res && res.list ? res.list : [];
        this.setData({ nearbyShops: list, nearEmpty: list.length === 0, nearLoading: false });
      } catch (err) {
        console.error('加载附近汉服店失败:', err);
        wx.showToast({ title: '附近搜索失败: ' + (err.message || '未知'), icon: 'none', duration: 3000 });
        this.setData({ nearLoading: false, nearEmpty: true });
      }
    },

    // ===== 跳转 =====
    onSecSwitch(e) {
      this.setData({ activeSec: e.currentTarget.dataset.sec });
    },

    onInProviderTap(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({ url: `/pages/serviceDetail/index?id=${id}` });
    },

    onCallPhone(e) {
      const phone = e.currentTarget.dataset.phone;
      if (phone) {
        wx.makePhoneCall({ phoneNumber: phone });
      } else {
        wx.showToast({ title: '暂无电话', icon: 'none' });
      }
    },
  },
});
