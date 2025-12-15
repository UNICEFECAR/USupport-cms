const { validateEnglishLocaleFirst } = require("../../../utils/utils");

module.exports = {
  async beforeCreate(ctx) {
    // Validate English locale exists first
    await validateEnglishLocaleFirst(ctx, "api::category.category");
  },
};

