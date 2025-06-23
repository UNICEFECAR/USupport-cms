module.exports = {
  async beforeCreate(ctx) {
    const { data } = ctx.params;
    if (data) {
      data.likes = 0;
      data.dislikes = 0;
      data.share_count = 0;
      data.download_count = 0;
      data.read_count = 0;
    }
  },
};
