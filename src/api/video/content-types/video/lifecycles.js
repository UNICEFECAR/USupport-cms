const { validateEnglishLocaleFirst } = require("../../../utils/utils");

module.exports = {
  async beforeCreate(ctx) {
    // Validate English locale exists first
    await validateEnglishLocaleFirst(ctx, "api::video.video");

    const { data } = ctx.params;
    if (data) {
      data.likes = 0;
      data.dislikes = 0;
      data.share_count = 0;
      data.view_count = 0;
    }
  },
};
