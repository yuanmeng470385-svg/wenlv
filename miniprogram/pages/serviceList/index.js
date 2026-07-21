const { getCategoryList, getProviderList } = require('../../services/serviceService');

Page({
  data: {
    categoryType: 'photographer',
    categoryName: '摄影师',
    categories: [],
    keyword: '',
    sortBy: 'sortOrder',
    sortOptions: [
      { key: 'sortOrder', label: '默认排序' },
      { key: 'rating', label: '评分最高' },
      { key: 'orderCount', label: '预约最多' },
    ],
    levelFilter: 0,
    levels: [
      { value: 0, label: '全部' },
      { value: 1, label: '初级' },
      { value: 2, label: '中级' },
      { value: 3, label: '高级' },
      { value: 4, label: '资深' },
      { value: 5, label: '首席' },
    ],
    providers: [],
    page: 1,
    total: 0,
    hasMore: true,
  },

  onLoad(options) {
    const type = options.type || 'photographer';
    const nameMap = { photographer: '摄影师', makeup: '妆造师', hanfu_shop: '汉服店' };
    this.setData({ categoryType: type, categoryName: nameMap[type] || '服务商' });

    if (type !== 'hanfu_shop') {
      // 汉服店不显示等级筛选
      this.setData({ levels: this.data.levels });
    }
    this.loadCategories();
    this.loadData();
  },

  async loadCategories() {
    try {
      const cats = await getCategoryList();
      this.setData({ categories: cats || [] });
    } catch (e) {}
  },

  async loadData() {
    wx.showLoading({ title: '加载中...' });
    try {
      const params = {
        categoryType: this.data.categoryType,
        page: this.data.page,
        pageSize: 10,
        sortBy: this.data.sortBy,
      };
      if (this.data.levelFilter > 0) params.level = this.data.levelFilter;
      if (this.data.keyword) params.keyword = this.data.keyword;

      const res = await getProviderList(params);
      const list = this.data.page === 1 ? res.list : this.data.providers.concat(res.list);
      this.setData({
        providers: list,
        total: res.total,
        hasMore: list.length < res.total,
      });
    } catch (err) {
      console.error(err);
    } finally {
      wx.hideLoading();
    }
  },

  onSortChange(e) { this.setData({ sortBy: e.currentTarget.dataset.key, page: 1, providers: [] }); this.loadData(); },
  onLevelChange(e) { this.setData({ levelFilter: e.currentTarget.dataset.value, page: 1, providers: [] }); this.loadData(); },
  onProviderTap(e) { wx.navigateTo({ url: '/pages/serviceDetail/index?id=' + e.currentTarget.dataset.id }); },
  onCategorySwitch(e) {
    const type = e.currentTarget.dataset.type;
    const nameMap = { photographer: '摄影师', makeup: '妆造师', hanfu_shop: '汉服店' };
    this.setData({ categoryType: type, categoryName: nameMap[type], page: 1, providers: [], levelFilter: 0 });
    this.loadData();
  },
  onSearchInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() { this.setData({ page: 1, providers: [] }); this.loadData(); },
  onClearSearch() { this.setData({ keyword: '', page: 1, providers: [] }); this.loadData(); },
  onReachBottom() { if (this.data.hasMore) { this.setData({ page: this.data.page + 1 }); this.loadData(); } },
});

