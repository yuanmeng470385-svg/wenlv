Component({
  properties: {
    message: {
      type: String,
      value: '加载失败，请重试'
    },
    icon: {
      type: String,
      value: 'warning'
    },
    showRetry: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    onRetry() {
      this.triggerEvent('retry');
    }
  }
});
