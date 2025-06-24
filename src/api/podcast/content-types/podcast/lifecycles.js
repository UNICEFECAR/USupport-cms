module.exports = {
  async beforeCreate(ctx) {
    const { data } = ctx.params;
    if (data) {
      data.likes = 0;
      data.dislikes = 0;
      data.share_count = 0;
      data.view_count = 0;
    }
  },
};
