Page({
  data: { list: [], loading: true },
  onShow() { this.loadData(); },
  onPullDownRefresh() { this.loadData().finally(() => wx.stopPullDownRefresh()); },

  async loadData() {
    this.setData({ loading: true });
    try {
      const { callFunction } = require('../../services/cloud');
      const TYPE_META = {
        photographer: ['摄影师', '影', 'g-rouge'],
        makeup: ['妆造师', '妆', 'g-gold'],
        hanfu_shop: ['汉服店', '服', 'g-cel'],
      };
      const list = ((await callFunction('getPendingProviders')) || []).map(p => {
        const m = TYPE_META[p.categoryType] || ['服务商', '店', 'g-ink'];
        return Object.assign({}, p, { _typeLabel: m[0], _glyph: (p.name || m[1]).charAt(0), _grad: m[2] });
      });
      this.setData({ list });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { this.setData({ loading: false }); }
  },

  getTypeLabel(t) { const m = { photographer: '摄影师', makeup: '妆造师', hanfu_shop: '汉服店' }; return m[t] || t; },

  onPass(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认通过',
      content: '通过后将创建商家身份，确定吗？',
      success: (res) => { if (res.confirm) this.doAction(id, 'approved', 0); },
    });
  },

  onReject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '驳回申请',
      content: '确定驳回此申请？',
      editable: true, placeholderText: '驳回原因（选填）',
      success: (res) => {
        if (res.confirm) this.doAction(id, 'rejected', 0, res.content || '');
      },
    });
  },

  async doAction(id, action, level, reason) {
    wx.showLoading({ title: '处理中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('approveProvider', { providerId: id, action, level, reason });
      wx.hideLoading();
      wx.showToast({ title: action === 'approved' ? '已通过' : '已驳回', icon: 'success' });
      this.loadData();
    } catch (e) { wx.hideLoading(); wx.showToast({ title: '操作失败', icon: 'none' }); }
  },

  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({ current: url, urls: JSON.parse(urls) });
  },

  onCardTap(e) {
    const item = this.data.list.find(i => i._id === e.currentTarget.dataset.id);
    if (!item) return;
    const tags = (item.featureTags || []).join('、') || '无';
    const city = item.city || '未填写';
    const desc = item.description || '无';
    const covers = item.coverImages ? item.coverImages.length : 0;
    const works = item.images ? item.images.length : 0;
    const lines = [
      '【' + this.getTypeLabel(item.categoryType) + '】' + item.name,
      '电话：' + (item.phone || '未填写'),
      '城市：' + city,
      '特色标签：' + tags,
      '描述：' + desc,
      '封面图数量：' + covers,
      '作品图数量：' + works,
      '申请时间：' + (item.createTime || ''),
    ].join('\n');
    wx.showModal({ title: '申请详情', content: lines, showCancel: false, confirmText: '关闭' });
  },
});
