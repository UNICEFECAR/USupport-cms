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
        const platformKey = query.platform;
        const platformKeyCK = `${platformKey}_ck`;

        for (let i = 0; i < termsOfUse.length; i++) {
          const currentData = termsOfUse[i];
          if (currentData.country === query.country) {
            result = currentData[platformKeyCK] || currentData[platformKey];
          } else if (
            currentData.is_playandheal &&
            query.filters?.is_playandheal
          ) {
            result = currentData[platformKeyCK] || currentData[platformKey];
          } else if (currentData.global && query.filters?.global) {
            result = currentData[platformKeyCK] || currentData[platformKey];
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
