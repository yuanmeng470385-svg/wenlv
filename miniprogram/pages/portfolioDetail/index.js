const { getPortfolioDetail } = require('../../services/serviceService');
const { toggleLike, toggleFavorite } = require('../../services/orderService');

Page({
  data: {
    portfolio: null,
    isLiked: false,
    isFavorited: false,
    currentImage: 0,
  },

  onLoad(options) {
    this.loadDetail(options.id);
  },

  async loadDetail(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const data = await getPortfolioDetail(id);
      this.setData({ portfolio: data });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onSwiperChange(e) {
    this.setData({ currentImage: e.detail.current });
  },

  async onLike() {
    if (!this.data.portfolio) return;
    await toggleLike('portfolio', this.data.portfolio._id);
    const portfolio = { ...this.data.portfolio };
    if (this.data.isLiked) {
      portfolio.likeCount = (portfolio.likeCount || 1) - 1;
    } else {
      portfolio.likeCount = (portfolio.likeCount || 0) + 1;
    }
    this.setData({ portfolio, isLiked: !this.data.isLiked });
  },

  async onFavorite() {
    if (!this.data.portfolio) return;
    await toggleFavorite('portfolio', this.data.portfolio._id);
    this.setData({ isFavorited: !this.data.isFavorited });
    wx.showToast({ title: this.data.isFavorited ? '已收藏' : '已取消收藏', icon: 'none' });
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: this.data.portfolio.images,
      current: url,
    });
  },
});
