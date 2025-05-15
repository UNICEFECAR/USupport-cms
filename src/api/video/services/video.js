"use strict";

/**
 * video service
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService("api::video.video", ({ strapi }) => ({
  async computeAvailableLocalesForListOfVideoIds(ctx) {
    const { query } = ctx;
    const ids = query.ids ? query.ids.split(",") : [];

    let availableLocales = {};

    if (ids.length <= 0) return availableLocales;

    // Get all videos with matching IDs
    const videos = await strapi.db.query("api::video.video").findMany({
      where: {
        id: { $in: ids },
      },
      populate: true,
    });

    for (const video of videos) {
      if (!availableLocales[video.id]) {
        availableLocales[video.id] = {};
      }

      // Store locale for the original item
      availableLocales[video.id][video.locale] = video.id;

      if (video.localizations) {
        for (const localization of video.localizations) {
          // Store locale for each available localization
          availableLocales[video.id][localization.locale] = localization.id;
        }
      }
    }

    return availableLocales;
  },
}));
