"use strict";

/**
 * privacy-policy controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::privacy-policy.privacy-policy",
  ({ strapi }) => ({
    async customFind(ctx) {
      /**
       * #route   GET /privacy-policies/find
       * #desc    Get privacy policies
       */
      try {
        const { query } = ctx;

        const privacyPolicies = await strapi.db
          .query("api::privacy-policy.privacy-policy")
          .findMany({ where: { locale: query.locale } });

        let result = null;
        let data = null;
        for (let i = 0; i < privacyPolicies.length; i++) {
          const currentData = privacyPolicies[i];
          if (currentData.country === query.country) {
            result = currentData[query.platform];
          } else if (
            currentData.is_playandheal &&
            query.filters?.is_playandheal
          ) {
            result = currentData[query.platform];
            data = currentData;
          } else if (currentData.global && query.filters?.global) {
            result = currentData[query.platform];
            data = currentData;
          }
        }

        ctx.body = data.ck_editor;
      } catch (err) {
        console.log(err);
        ctx.status = 500;
        ctx.body = { error: err.message };
      }
    },
  })
);
