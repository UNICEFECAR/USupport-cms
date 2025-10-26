const { ApplicationError } = require("@strapi/utils").errors;

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    const { global, country, locale, is_playandheal } = data;
    console.log(global, country, locale);

    if (!locale) {
      throw new ApplicationError("Locale is required when creating.");
    }

    if (!global && !country && !is_playandheal) {
      console.log("Please choose a country or mark as global.");
      throw new ApplicationError("Please choose a country or mark as global.");
    }

    if (global) {
      const existing = await strapi.db
        .query("api::privacy-policy.privacy-policy")
        .findOne({
          where: { global: true, locale },
        });

      if (existing) {
        throw new ApplicationError(
          `A global Privacy Policy already exists for locale "${locale}".`
        );
      }
    } else if (is_playandheal) {
      const existing = await strapi.db
        .query("api::privacy-policy.privacy-policy")
        .findOne({
          where: { is_playandheal: true, locale },
        });

      if (existing) {
        throw new ApplicationError(
          `A Play and Heal Privacy Policy already exists for locale "${locale}".`
        );
      }
    } else if (country) {
      const existing = await strapi.db
        .query("api::privacy-policy.privacy-policy")
        .findOne({
          where: { country, locale },
        });

      if (existing) {
        throw new ApplicationError(
          `Privacy Policy for ${country} already exists in "${locale}".`
        );
      }
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    const { global, country, is_playandheal } = data;

    // If only localizations are being updated or publish/unpublish - skip validation
    if (
      (Object.keys(data).length === 2 &&
        data.localizations &&
        data.updatedAt) ||
      (Object.keys(data).length === 2 &&
        data.hasOwnProperty("country") &&
        data.updatedAt) ||
      (Object.keys(data).length === 3 &&
        data.updatedAt &&
        data.updatedBy &&
        data.hasOwnProperty("publishedAt"))
    ) {
      return;
    }

    const currentRecord = await strapi.db
      .query("api::privacy-policy.privacy-policy")
      .findOne({ where: { id: where.id } });

    const locale = currentRecord?.locale;

    if (!locale) {
      throw new ApplicationError(
        "Unable to determine locale for the entry being updated."
      );
    }

    if (!global && !country && !is_playandheal) {
      throw new ApplicationError("Please choose a country or mark as global.");
    }

    if (global) {
      const existingRecord = await strapi.db
        .query("api::privacy-policy.privacy-policy")
        .findOne({
          where: {
            global: true,
            locale,
          },
        });

      if (existingRecord && existingRecord.id !== where.id) {
        throw new ApplicationError(
          `A global Privacy Policy already exists for locale "${locale}".`
        );
      }
    } else if (is_playandheal) {
      const existingRecord = await strapi.db
        .query("api::privacy-policy.privacy-policy")
        .findOne({
          where: {
            is_playandheal: true,
            locale,
          },
        });

      if (existingRecord && existingRecord.id !== where.id) {
        throw new ApplicationError(
          `A Play and Heal Privacy Policy already exists for locale "${locale}".`
        );
      }
    } else if (country) {
      const existingRecord = await strapi.db
        .query("api::privacy-policy.privacy-policy")
        .findOne({
          where: {
            country,
            locale,
          },
        });

      if (existingRecord && existingRecord.id !== where.id) {
        throw new ApplicationError(
          `A Privacy Policy for ${country} already exists in locale "${locale}".`
        );
      }
    }
  },
};
