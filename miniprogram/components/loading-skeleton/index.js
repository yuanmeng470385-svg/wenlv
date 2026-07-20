Component({
  properties: {
    type: {
      type: String,
      value: 'list'
    },
    count: {
      type: Number,
      value: 3
    }
  },

  computed: {
    skeletonItems() {
      return Array.from({ length: this.data.count }, (_, i) => i);
    }
  },

  observers: {
    'count': function(count) {
      this.setData({
        skeletonItems: Array.from({ length: count }, (_, i) => i)
      });
    }
  },

  lifetimes: {
    attached() {
      this.setData({
        skeletonItems: Array.from({ length: this.data.count }, (_, i) => i)
      });
    }
  }
});
