"use strict";

/**
 * podcast service
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService("api::podcast.podcast", ({ strapi }) => ({
  async computeAvailableLocalesForListOfPodcastIds(ctx) {
    const { query } = ctx;
    const ids = query.ids ? query.ids.split(",") : [];

    let availableLocales = {};

    if (ids.length <= 0) return availableLocales;

    const podcasts = await strapi.db.query("api::podcast.podcast").findMany({
      where: {
        id: { $in: ids },
      },
      populate: true,
    });

    for (const podcast of podcasts) {
      if (!availableLocales[podcast.id]) {
        availableLocales[podcast.id] = {};
      }

      availableLocales[podcast.id][podcast.locale] = podcast.id;

      if (podcast.localizations) {
        for (const localization of podcast.localizations) {
          availableLocales[podcast.id][localization.locale] = localization.id;
        }
      }
    }

    return availableLocales;
  },
}));
