"use strict";

/**
 * sos-center controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { getIdsForSpecificLocales } = require("../../utils/utils.js");

module.exports = createCoreController(
  "api::sos-center.sos-center",
  ({ strapi }) => ({
    async getSOSCenterAvailableLocales(ctx) {
      /**
       * #route   GET /sos-centers/available-locales/:id
       * #desc    Get an object containing all the available locales for a SOS Center with associated localized id {"kk": 17,"en": 12,"ru": 18}
       */
      try {
        const { id } = ctx.params;

        const result = await strapi.db
          .query("api::sos-center.sos-center")
          .findOne({ where: { id: id }, populate: true });

        let locales = {};
        locales[result.locale] = result.id;
        //Checck if the SOS Center has any locales
        if (result.localizations.length > 0) {
          //Loop through the locales and create an object with the locale code as the key and the id as the value
          result.localizations.forEach((locale) => {
            locales[locale.locale] = locale.id;
          });
        }

        ctx.body = locales;
      } catch (err) {
        console.log(err);
        ctx.status = 500;
        ctx.body = { error: err.message };
      }
    },

    async find(ctx) {
      /**
       * #route   GET /sos-centers
       * #desc    Get multiple articles
       */
      const { query } = ctx;

      let availableLocales = {};
      let localizedIds = [];
      if (query.ids) {
        availableLocales = await strapi
          .service("api::sos-center.sos-center")
          .computeAvailableLocalesForListOfSOSCentersIds(ctx);

        localizedIds = getIdsForSpecificLocales(query.locale, availableLocales);
      }

      if (!query.isForAdmin) {
        ctx.query.filters = {
          ...ctx.query.filters,
          id: {
            ...ctx.query.filters?.id,
            $in: localizedIds,
          },
        };
      }

      let { data, meta } = await super.find(ctx);

      meta.availableLocales = availableLocales;
      meta.localizedIds = localizedIds;

      return { data, meta };
    },
  })
);
