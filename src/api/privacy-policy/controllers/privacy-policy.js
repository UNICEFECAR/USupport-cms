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
        const platformKey = query.platform;
        const platformKeyCK = `${platformKey}_ck`;

        for (let i = 0; i < privacyPolicies.length; i++) {
          const currentData = privacyPolicies[i];
          if (currentData.country === query.country) {
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
