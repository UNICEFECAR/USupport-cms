const { validateEnglishLocaleFirst } = require("../../../utils/utils");

module.exports = {
  async beforeCreate(event) {
    await validateEnglishLocaleFirst(event, "api::hosn-pillar.hosn-pillar");
  },
};
