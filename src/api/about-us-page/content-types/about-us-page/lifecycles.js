const { ApplicationError } = require("@strapi/utils").errors;

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    const { global, country, locale } = data;

    if (!locale) {
      throw new ApplicationError("Locale is required when creating.");
    }

    if (global) {
      const existing = await strapi.db
        .query("api::about-us-page.about-us-page")
        .findOne({
          where: { global: true, locale },
        });

      if (existing) {
        throw new ApplicationError(
          `A global About Us page already exists for locale "${locale}".`
        );
      }
    } else if (country) {
      const existing = await strapi.db
        .query("api::about-us-page.about-us-page")
        .findOne({
          where: { country, locale },
        });

      if (existing) {
        throw new ApplicationError(
          `About Us page for ${country} already exists in "${locale}".`
        );
      }
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    const { global, country } = data;

    const currentRecord = await strapi.db
      .query("api::about-us-page.about-us-page")
      .findOne({ where: { id: where.id } });

    const locale = currentRecord?.locale;

    if (!locale) {
      throw new ApplicationError(
        "Unable to determine locale for the entry being updated."
      );
    }

    if (global) {
      const existingRecord = await strapi.db
        .query("api::about-us-page.about-us-page")
        .findOne({
          where: {
            global: true,
            locale,
          },
        });

      if (existingRecord && existingRecord.id !== where.id) {
        throw new ApplicationError(
          `A global About Us page already exists for locale "${locale}".`
        );
      }
    } else if (country) {
      const existingRecord = await strapi.db
        .query("api::about-us-page.about-us-page")
        .findOne({
          where: {
            country,
            locale,
          },
        });

      if (existingRecord && existingRecord.id !== where.id) {
        throw new ApplicationError(
          `An About Us page for ${country} already exists in locale "${locale}".`
        );
      }
    }
  },
};
