Page({
  data: { dateList: [], timeSlots: [], selectedDate: '', selectedLabel: '' },
  onLoad() {
    const now = new Date();
    const list = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i);
      list.push({ date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, label: i===0?'今天':i===1?'明天':`${d.getMonth()+1}月${d.getDate()}日` });
    }
    this.setData({ dateList: list });
  },

  async onSelectDate(e) {
    const { date, label } = e.currentTarget.dataset;
    this.setData({ selectedDate: date, selectedLabel: label });
    wx.showLoading({ title: '加载中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      const data = await callFunction('getMyTimeSlots', { date });
      this.setData({ timeSlots: data.slots || [] });
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); }
    finally { wx.hideLoading(); }
  },

  async onToggleSlot(e) {
    const time = e.currentTarget.dataset.time;
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('toggleTimeSlot', { date: this.data.selectedDate, time });
      this.onSelectDate({ currentTarget: { dataset: { date: this.data.selectedDate, label: this.data.selectedLabel } } });
    } catch (e) { wx.showToast({ title: '操作失败', icon: 'none' }); }
  },

  async onBatchAction(e) {
    const action = e.currentTarget.dataset.action;
    wx.showLoading({ title: '处理中...' });
    try {
      const { callFunction } = require('../../services/cloud');
      await callFunction('toggleTimeSlot', { date: this.data.selectedDate, action });
      wx.hideLoading();
      wx.showToast({ title: action === 'all_on' ? '全天已开启' : '全天已关闭', icon: 'success' });
      this.onSelectDate({ currentTarget: { dataset: { date: this.data.selectedDate, label: this.data.selectedLabel } } });
    } catch (e) { wx.hideLoading(); wx.showToast({ title: '操作失败', icon: 'none' }); }
  },
});
