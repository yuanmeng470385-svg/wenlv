Component({
  properties: {
    icon: {
      type: String,
      value: 'photo'
    },
    text: {
      type: String,
      value: '暂无数据'
    },
    subText: {
      type: String,
      value: ''
    },
    btnText: {
      type: String,
      value: ''
    },
    showBtn: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onAction() {
      this.triggerEvent('action');
    }
  }
});
