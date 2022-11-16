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

  /**
   *
   * @param {string} locale
   * @param {object} articlesAvailableLocales e.g {"10": {"en": 10,"kk": 15}}
   *
   * @returns {array} array of ids for the given locale
   */
  async getIdsForSpecificLocale(locale, articlesAvailableLocales) {
    let ids = [];
    // loop through each key of the articlesAvailableLocales
    for (const key in articlesAvailableLocales) {
      // check if the object associated to the keay contains another key equal to locale
      if (locale in articlesAvailableLocales[key]) {
        // if yes, then push the id to the ids array
        ids.push(articlesAvailableLocales[key][locale].toString());
      }
    }
    return ids;
  },
}));
