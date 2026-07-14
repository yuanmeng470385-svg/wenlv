const { callFunction } = require('../../services/cloud');

Page({
  data: { works: [], page: 1, hasMore: true },

  onShow() { this.setData({ page: 1, works: [] }); this.loadWorks(); },

  async loadWorks() {
    if (!this.data.hasMore) return;
    wx.showLoading({ title: '加载中...' });
    try {
      const data = await callFunction('getMyPortfolios', { page: this.data.page, pageSize: 20 });
      const list = this.data.page === 1 ? data.list : [...this.data.works, ...data.list];
      this.setData({ works: list, hasMore: list.length < data.total });
    } catch (err) { console.error(err); }
    finally { wx.hideLoading(); }
  },

  onReachBottom() { if (this.data.hasMore) { this.setData({ page: this.data.page + 1 }); this.loadWorks(); } },
  onDelete(e) {
    wx.showModal({ title: '确认删除', content: '删除后不可恢复', success: (res) => {
      if (res.confirm) {
        callFunction('deletePortfolio', { portfolioId: e.currentTarget.dataset.id }).then(() => {
          wx.showToast({ title: '已删除', icon: 'success' });
          this.setData({ page: 1, works: [] }); this.loadWorks();
        });
      }
    }});
  },
});
