"use strict";

/**
 * faq service
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService("api::faq.faq", ({ strapi }) => ({
  async computeAvailableLocalesForListOfFAQs(ctx) {
    const { query } = ctx;

    // Convert querry.ids to array
    const ids = query.ids.split(",");

    const result = {};

    // Create object with keys beeing the values of an array mapped to empty objects
    ids.forEach((id) => {
      result[id] = {};
    });

    // Get all the faq's with the ids from the query
    for (let i = 0; i < ids.length; i++) {
      const faq = await strapi.db
        .query("api::faq.faq")
        .findOne({ where: { id: ids[i] }, populate: true });

      result[faq.id][faq.locale] = faq.id;
      for (let j = 0; j < faq.localizations.length; j++) {
        result[faq.id][faq.localizations[j].locale] = faq.localizations[j].id;
      }
    }

    return result;
  },
}));
