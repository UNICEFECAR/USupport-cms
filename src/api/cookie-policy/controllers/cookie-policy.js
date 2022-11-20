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
        for (let i = 0; i < cookiePolicy.length; i++) {
          const currentData = cookiePolicy[i];
          if (currentData.country === query.country) {
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
