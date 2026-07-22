const { getCategoryList, getProviderList } = require('../../services/serviceService');

const CATEGORY_META = {
  photographer: { glyph: '影', grad: 'g-rouge' },
  makeup: { glyph: '妆', grad: 'g-gold' },
  hanfu_shop: { glyph: '服', grad: 'g-cel' },
};
const metaOf = (t) => CATEGORY_META[t] || CATEGORY_META.photographer;

Page({
  data: {
    categoryType: 'photographer',
    categoryName: '摄影师',
    categories: [],
    keyword: '',
    sortBy: 'sortOrder',
    sortOptions: [
      { key: 'sortOrder', label: '综合排序' },
      { key: 'rating', label: '评分最高' },
      { key: 'orderCount', label: '预约最多' },
    ],
    providers: [],
    page: 1,
    total: 0,
    hasMore: true,
  },

  onLoad(options) {
    const type = options.type || 'photographer';
    const nameMap = { photographer: '摄影跟拍', makeup: '妆造造型', hanfu_shop: '汉服体验' };
    this.setData({ categoryType: type, categoryName: nameMap[type] || '服务商' });
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
      if (this.data.keyword) params.keyword = this.data.keyword;

      const res = await getProviderList(params);
      const rawList = this.data.page === 1 ? res.list : this.data.providers.concat(res.list);
      const list = rawList.map(p => Object.assign({}, p, {
        _glyph: (p.name || '店').charAt(0),
        _grad: metaOf(p.categoryType).grad,
        _tags: (p.featureTags || []).slice(0, 3),
      }));
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
  onProviderTap(e) { wx.navigateTo({ url: '/pages/serviceDetail/index?id=' + e.currentTarget.dataset.id }); },
  onCategorySwitch(e) {
    const type = e.currentTarget.dataset.type;
    if (type === this.data.categoryType) return;
    const nameMap = { photographer: '摄影跟拍', makeup: '妆造造型', hanfu_shop: '汉服体验' };
    this.setData({ categoryType: type, categoryName: nameMap[type], page: 1, providers: [] });
    this.loadData();
  },
  onSearchInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() { this.setData({ page: 1, providers: [] }); this.loadData(); },
  onClearSearch() { this.setData({ keyword: '', page: 1, providers: [] }); this.loadData(); },
  onReachBottom() { if (this.data.hasMore) { this.setData({ page: this.data.page + 1 }); this.loadData(); } },
});
