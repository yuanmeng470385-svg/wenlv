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
    const wasLiked = this.data.isLiked;
    const oldPortfolio = this.data.portfolio;
    const portfolio = { ...oldPortfolio };
    if (wasLiked) {
      portfolio.likeCount = (portfolio.likeCount || 1) - 1;
    } else {
      portfolio.likeCount = (portfolio.likeCount || 0) + 1;
    }
    this.setData({ portfolio, isLiked: !wasLiked });
    try {
      await toggleLike('portfolio', portfolio._id);
    } catch (err) {
      this.setData({ portfolio: oldPortfolio, isLiked: wasLiked });
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async onFavorite() {
    if (!this.data.portfolio) return;
    const wasFavorited = this.data.isFavorited;
    this.setData({ isFavorited: !wasFavorited });
    try {
      await toggleFavorite('portfolio', this.data.portfolio._id);
      wx.showToast({ title: this.data.isFavorited ? '已收藏' : '已取消收藏', icon: 'none' });
    } catch (err) {
      this.setData({ isFavorited: wasFavorited });
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: this.data.portfolio.images,
      current: url,
    });
  },
});
