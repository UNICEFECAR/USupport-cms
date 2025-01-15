"use strict";

/**
 * about-us-page controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::about-us-page.about-us-page",
  ({ strapi }) => ({
    async customFind(ctx) {
      /**
       * #route   GET /about-us-pages/find
       * #desc    Get about us page
       */
      try {
        const { query } = ctx;

        const aboutUsPage = await strapi.db
          .query("api::about-us-page.about-us-page")
          .findMany({ where: { locale: query.locale } });

        let result = null;
        for (let i = 0; i < aboutUsPage.length; i++) {
          const currentData = aboutUsPage[i];
          if (currentData.country === query.country) {
            result = currentData;
          }
        }

        ctx.body = result;
      } catch (err) {
        ctx.status = 500;
        ctx.body = { error: err.message };
      }
    },
  })
);
