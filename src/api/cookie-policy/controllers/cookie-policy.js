"use strict";

/**
 * cookie-policy controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::cookie-policy.cookie-policy",
  ({ strapi }) => ({
    async customFind(ctx) {
      /**
       * #route   GET /policy-cookies/find
       * #desc    Get cookie policies
       */
      try {
        const { query } = ctx;

        const cookiePolicy = await strapi.db
          .query("api::cookie-policy.cookie-policy")
          .findMany({ where: { locale: query.locale } });

        let result = null;
        const platformKey = query.platform;
        const platformKeyCK = `${platformKey}_ck`;

        if (query.country === "global") {
          // Look for cookie policy with global flag set to true
          for (let i = 0; i < cookiePolicy.length; i++) {
            const currentData = cookiePolicy[i];
            if (currentData.global === true) {
              result = currentData[platformKeyCK] || currentData[platformKey];
              break;
            }
          }
        } else if (query.filters?.is_playandheal) {
          // Look for cookie policy with play and heal flag set to true
          for (let i = 0; i < cookiePolicy.length; i++) {
            const currentData = cookiePolicy[i];
            if (currentData.is_playandheal === true) {
              result = currentData[platformKeyCK] || currentData[platformKey];
              break;
            }
          }
        } else {
          // Look for cookie policy with matching country
          for (let i = 0; i < cookiePolicy.length; i++) {
            const currentData = cookiePolicy[i];
            if (currentData.country === query.country) {
              result = currentData[platformKeyCK] || currentData[platformKey];
              break;
            }
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
