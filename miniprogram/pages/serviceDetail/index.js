const { getProviderDetail } = require('../../services/serviceService');
const { toggleLike, toggleFavorite } = require('../../services/orderService');

Page({
  data: {
    providerId: '',
    provider: null,
    serviceItems: [],
    portfolios: [],
    reviews: [],
    isFavorited: false,
    activeTab: 'service',
  },

  onLoad(options) {
    this.setData({ providerId: options.id });
    this.loadDetail();
  },

  async loadDetail() {
    wx.showLoading({ title: '加载中...' });
    try {
      const data = await getProviderDetail(this.data.providerId);
      const p = data.provider;
      if (p) {
        const META = {
          photographer: { grad: 'g-rouge', icon: 'camera' },
          makeup: { grad: 'g-gold', icon: 'lipstick' },
          hanfu_shop: { grad: 'g-cel', icon: 'robe' },
        };
        const m = META[p.categoryType] || META.photographer;
        p._glyph = (p.name || '店').charAt(0);
        p._grad = m.grad;
        p._icon = m.icon;
      }
      this.setData({
        provider: p,
        serviceItems: data.serviceItems || [],
        portfolios: data.portfolios || [],
        reviews: data.reviews || [],
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onTabChange(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onPortfolioTap(e) {
    wx.navigateTo({ url: `/pages/portfolioDetail/index?id=${e.currentTarget.dataset.id}` });
  },

  async onToggleFavorite() {
    if (!this.data.provider) return;
    await toggleFavorite('provider', this.data.providerId);
    this.setData({ isFavorited: !this.data.isFavorited });
    wx.showToast({ title: this.data.isFavorited ? '已收藏' : '已取消收藏', icon: 'none' });
  },

  async onLikePortfolio(e) {
    const id = e.currentTarget.dataset.id;
    const liked = e.currentTarget.dataset.liked;
    await toggleLike('portfolio', id);
    const portfolios = this.data.portfolios.map(p => {
      if (p._id === id) {
        return { ...p, likeCount: (p.likeCount || 0) + (liked ? -1 : 1) };
      }
      return p;
    });
    this.setData({ portfolios });
  },

  async onCallPhone() {
    if (!this.data.providerId) return;
    wx.showLoading({ title: '获取中...' });
    try {
      const { getContactPhone } = require('../../services/orderService');
      const res = await getContactPhone('provider', this.data.providerId);
      wx.hideLoading();
      if (res && res.phone) {
        wx.makePhoneCall({ phoneNumber: res.phone });
      } else {
        wx.showToast({ title: '暂无电话', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '获取失败', icon: 'none' });
    }
  },
  onBookTap() {
    // 默认带上第一个服务套餐
    const items = this.data.serviceItems || [];
    const sid = items.length > 0 ? items[0]._id : '';
    wx.navigateTo({ url: `/pages/booking/index?providerId=${this.data.providerId}&serviceItemId=${sid}` });
  },

  onServiceSelect(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({ url: `/pages/booking/index?providerId=${this.data.providerId}&serviceItemId=${item._id}` });
  },
});
