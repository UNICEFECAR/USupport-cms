"use strict";

/**
 * terms-of-use controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::terms-of-use.terms-of-use",
  ({ strapi }) => ({
    async customFind(ctx) {
      /**
       * #route   GET /terms-of-uses/find
       * #desc    Get terms of use
       */
      try {
        const { query } = ctx;

        const termsOfUse = await strapi.db
          .query("api::terms-of-use.terms-of-use")
          .findMany({ where: { locale: query.locale } });

        let result = null;
        for (let i = 0; i < termsOfUse.length; i++) {
          const currentData = termsOfUse[i];
          if (currentData.country === query.country) {
            result = currentData[query.platform];
          } else if (currentData.global && query.filters?.global) {
            result = currentData[query.platform];
          }
        }

        ctx.body = result;
      } catch (err) {
        console.log(err);
        ctx.status = 500;
        ctx.body = { error: err.message };
      }
    },
  })
);
