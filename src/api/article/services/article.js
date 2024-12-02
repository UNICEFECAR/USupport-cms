"use strict";

/**
 * article service
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService("api::article.article", ({ strapi }) => ({
  async computeAvailableLocalesForListOfArticleIds(ctx) {
    const { query } = ctx;

    // Convert query.ids to an array and handle potential edge cases
    const ids = query.ids?.split(",") || [];

    if (!ids.length) {
      return {}; // Return an empty result if no IDs are provided
    }

    // Fetch all articles with the provided IDs in a single query
    const articles = await strapi.db.query("api::article.article").findMany({
      where: { id: { $in: ids } },
      populate: true, // Only populate what's necessary
    });

    // Construct the result object
    const result = articles.reduce((acc, article) => {
      // Initialize the article's entry in the result object
      acc[article.id] = { [article.locale]: article.id };

      // Map localizations to their respective locales
      article.localizations.forEach((localization) => {
        acc[article.id][localization.locale] = localization.id;
      });

      return acc;
    }, {});

    return result;
  },
}));
