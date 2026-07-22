const { callFunction } = require('../../services/cloud');
const app = getApp();

Page({
  data: { works: [], page: 1, hasMore: true },

  onShow() { this.setData({ page: 1, works: [] }); this.loadWorks(); },

  async loadWorks() {
    if (!this.data.hasMore) return;
    wx.showLoading({ title: '加载中...' });
    try {
      const data = await callFunction('getMyPortfolios', { page: this.data.page, pageSize: 20, role: app.getActiveRole() });
      const STATUS_CHIP = {
        approved: ['st-cel', '已发布'], pending_review: ['st-gold', '审核中'],
        rejected: ['st-red', '已驳回'],
      };
      const rawList = this.data.page === 1 ? data.list : this.data.works.concat(data.list);
      const list = rawList.map(w => {
        const chip = STATUS_CHIP[w.status] || ['st-gray', w.status || ''];
        return Object.assign({}, w, { _statusClass: chip[0], _statusLabel: chip[1] });
      });
      this.setData({ works: list, hasMore: list.length < data.total });
    } catch (err) { console.error(err); }
    finally { wx.hideLoading(); }
  },

  onReachBottom() { if (this.data.hasMore) { this.setData({ page: this.data.page + 1 }); this.loadWorks(); } },
  onPullDownRefresh() { this.setData({ page: 1, works: [] }); this.loadWorks().finally(() => wx.stopPullDownRefresh()); },
  goUpload() { wx.navigateTo({ url: '/pages/provider/uploadWork' }); },
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
