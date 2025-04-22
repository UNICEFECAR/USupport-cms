const { ApplicationError } = require("@strapi/utils").errors;

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    const { global } = data;

    if (global) {
      const existingRecord = await strapi.db
        .query("api::about-us-page.about-us-page")
        .findOne({ where: { global: true } });

      if (existingRecord) {
        throw new ApplicationError("About us page for global already exists.");
      }
    } else {
      const existingRecord = await strapi.db
        .query("api::about-us-page.about-us-page")
        .findOne({ where: { country: data.country } });

      if (existingRecord) {
        throw new ApplicationError(
          `About us page for ${data.country} already exists.`
        );
      }
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    const { global } = data;

    if (global) {
      const existingRecord = await strapi.db
        .query("api::about-us-page.about-us-page")
        .findOne({ where: { global: true } });

      if (existingRecord && existingRecord.id !== where.id) {
        throw new ApplicationError("About us page for global already exists.");
      }
    } else if (data.country) {
      const existingRecord = await strapi.db
        .query("api::about-us-page.about-us-page")
        .findOne({ where: { country: data.country } });

      if (existingRecord && existingRecord.id !== where.id) {
        throw new ApplicationError(
          `About us page for ${data.country} already exists.`
        );
      }
    }
  },
};
