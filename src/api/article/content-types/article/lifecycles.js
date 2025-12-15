const { validateEnglishLocaleFirst } = require("../../../utils/utils");

module.exports = {
  async beforeCreate(ctx) {
    // Validate English locale exists first
    await validateEnglishLocaleFirst(ctx, "api::article.article");

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
