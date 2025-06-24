"use strict";

/**
 * podcast controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { getIdsForSpecificLocales } = require("../../utils/utils.js");

module.exports = createCoreController("api::podcast.podcast", ({ strapi }) => ({
  async find(ctx) {
    /**
     * #route   GET /podcasts
     * #desc    Get multiple podcasts
     */
    const { query } = ctx;
    let availableLocales = {};
    let localizedIds = [];

    if (query.ids) {
      availableLocales = await strapi
        .service("api::podcast.podcast")
        .computeAvailableLocalesForListOfPodcastIds(ctx);

      localizedIds = getIdsForSpecificLocales(query.locale, availableLocales);
    }

    if (!query.isForAdmin) {
      ctx.query.filters = {
        ...ctx.query.filters,
        id: {
          ...ctx.query.filters?.id,
          $in: localizedIds,
        },
      };
    }

    let { data, meta } = await super.find(ctx);

    meta.availableLocales = availableLocales;
    meta.localizedIds = localizedIds;

    return { data, meta };
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const { query } = ctx;

    const basePodcast = await strapi.db.query("api::podcast.podcast").findOne({
      where: { id },
      populate: true,
    });

    if (!basePodcast) {
      return ctx.notFound("Podcast not found");
    }

    let availableLocales = { [basePodcast.locale]: basePodcast.id };

    if (basePodcast.localizations && basePodcast.localizations.length > 0) {
      basePodcast.localizations.forEach((loc) => {
        availableLocales[loc.locale] = loc.id;
      });
    }

    // Determine which ID to fetch based on query.locale
    const targetId = availableLocales[query.locale] || id;

    // Add view count before returning the data
    await this.addViewCount({ ...ctx, params: { id: targetId } });

    const entity = await strapi.entityService.findOne(
      "api::podcast.podcast",
      targetId,
      {
        populate: "*",
      }
    );

    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized, { availableLocales });
  },

  async addViewCount(ctx) {
    /**
     * #route   PUT /podcasts/addViewCount/:id
     * #desc    Add 1 to the viewCount of the podcast
     */
    try {
      const { id } = ctx.params;

      const result = await strapi.db
        .query("api::podcast.podcast")
        .findOne({ select: ["view_count"], where: { id: id } });

      const resultAfterUpdate = await strapi.db
        .query("api::podcast.podcast")
        .update({
          where: { id: id },
          data: { view_count: parseInt(result.view_count || 0) + 1 },
        });

      ctx.body = resultAfterUpdate;
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },

  async addShareCount(ctx) {
    /**
     * #route   PUT /podcasts/addShareCount/:id
     * #desc    Add 1 to the shareCount of the podcast
     */
    try {
      const { id } = ctx.params;

      const result = await strapi.db
        .query("api::podcast.podcast")
        .findOne({ select: ["share_count"], where: { id: id } });

      const resultAfterUpdate = await strapi.db
        .query("api::podcast.podcast")
        .update({
          where: { id: id },
          data: { share_count: parseInt(result.share_count || 0) + 1 },
        });

      ctx.body = resultAfterUpdate;
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },

  async getPodcastLocales(ctx) {
    /**
     * #route   GET /podcasts/getPodcastLocales/:id
     * #desc    Get an object containing all the available locales for a podcast with associated localized id {"kk": 17,"en": 12,"ru": 18}
     */
    try {
      const { id } = ctx.params;

      const result = await strapi.db
        .query("api::podcast.podcast")
        .findOne({ where: { id: id }, populate: true });

      let locales = {};
      locales[result.locale] = result.id;

      if (result.localizations && result.localizations.length > 0) {
        result.localizations.forEach((locale) => {
          locales[locale.locale] = locale.id;
        });
      }

      ctx.body = locales;
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },

  async addRating(ctx) {
    /**
     * #route   PUT /podcasts/addRating/:id
     * #desc    Add like/dislike to the podcast
     */
    try {
      const { id } = ctx.params;
      const { action } = ctx.request.body;

      const fieldToSelect =
        action === "add-like" || action === "remove-like"
          ? "likes"
          : "dislikes";

      const result = await strapi.db
        .query("api::podcast.podcast")
        .findOne({ select: ["likes", "dislikes"], where: { id: id } });

      const updatedField =
        action === "add-like"
          ? parseInt(result.likes || 0) + 1
          : action === "remove-like"
          ? parseInt(result.likes || 0) - 1
          : action === "add-dislike"
          ? parseInt(result.dislikes || 0) + 1
          : parseInt(result.dislikes || 0) - 1;

      const resultAfterUpdate = await strapi.db
        .query("api::podcast.podcast")
        .update({
          where: { id: id },
          data: {
            [fieldToSelect]:
              updatedField < 0 ? 0 : isNaN(updatedField) ? 1 : updatedField,
          },
        });
      ctx.body = resultAfterUpdate;
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },
}));
