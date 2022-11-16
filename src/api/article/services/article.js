"use strict";

/**
 * article service
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService("api::article.article", ({ strapi }) => ({
  async computeAvailableLocalesForListOfArticleIds(ctx) {
    const { query } = ctx;

    // Convert querry.ids to array
    const ids = query.ids.split(",");

    const result = {};

    // Create object with keys beeing the values of an array mapped to empty objects
    ids.forEach((id) => {
      result[id] = {};
    });

    // Get all the articles with the ids from the query
    for (let i = 0; i < ids.length; i++) {
      const article = await strapi.db
        .query("api::article.article")
        .findOne({ where: { id: ids[i] }, populate: true });

      result[article.id][article.locale] = article.id;
      for (let j = 0; j < article.localizations.length; j++) {
        result[article.id][article.localizations[j].locale] =
          article.localizations[j].id;
      }
    }

    return result;
  },
}));
