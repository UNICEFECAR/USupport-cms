"use strict";

/**
 * sos-center service
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService(
  "api::sos-center.sos-center",
  ({ strapi }) => ({
    async computeAvailableLocalesForListOfSOSCentersIds(ctx) {
      const { query } = ctx;

      // Convert querry.ids to array
      const ids = query.ids.split(",");

      const result = {};

      // Create object with keys beeing the values of an array mapped to empty objects
      ids.forEach((id) => {
        result[id] = {};
      });

      // Get all the sos centers with the ids from the query
      for (let i = 0; i < ids.length; i++) {
        const sosCenter = await strapi.db
          .query("api::sos-center.sos-center")
          .findOne({ where: { id: ids[i] }, populate: true });

        result[sosCenter.id][sosCenter.locale] = sosCenter.id;
        for (let j = 0; j < sosCenter.localizations.length; j++) {
          result[sosCenter.id][sosCenter.localizations[j].locale] =
            sosCenter.localizations[j].id;
        }
      }

      return result;
    },
  })
);
