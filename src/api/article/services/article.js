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

    // Construct the result object, keyed by every id in the localization family
    const result = {};

    articles.forEach((article) => {
      const localeMap = { [article.locale]: article.id };

      (article.localizations || []).forEach((localization) => {
        localeMap[localization.locale] = localization.id;
      });

      Object.values(localeMap).forEach((id) => {
        result[id] = { ...localeMap };
      });
    });

    return result;
  },

  /**
   * Resolve a list of article IDs (any locale) to IDs in the target locale.
   */
  async resolveArticleIdsForLocale(articleIds, locale) {
    const numericIds = articleIds
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id));

    if (!numericIds.length) {
      console.log("[resolveArticleIdsForLocale] no valid numeric ids");
      return [];
    }

    const articles = await strapi.db.query("api::article.article").findMany({
      where: { id: { $in: numericIds } },
      populate: { localizations: true },
    });

    const resolved = new Set();

    articles.forEach((article) => {
      if (article.locale === locale) {
        resolved.add(article.id);
      }

      (article.localizations || []).forEach((localization) => {
        if (localization.locale === locale) {
          resolved.add(localization.id);
        }
      });
    });

    const resolvedIds = [...resolved];

    return resolvedIds;
  },
}));
