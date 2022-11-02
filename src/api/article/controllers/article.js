"use strict";

/**
 * article controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::article.article", ({ strapi }) => ({
  async addReadCount(ctx) {
    try {
      const { id } = ctx.params;

      const result = await strapi.db
        .query("api::article.article")
        .findOne({ select: ["read_count"], where: { id: id } });

      const resultAfterUpdate = await strapi.db
        .query("api::article.article")
        .update({
          where: { id: id },
          data: { read_count: parseInt(result.read_count) + 1 },
        });

      ctx.body = resultAfterUpdate;
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },
}));
