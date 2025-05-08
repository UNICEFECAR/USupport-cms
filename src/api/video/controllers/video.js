"use strict";

/**
 * video controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { getIdsForSpecificLocales } = require("../../utils/utils.js");

module.exports = createCoreController("api::video.video", ({ strapi }) => ({
  async find(ctx) {
    /**
     * #route   GET /videos
     * #desc    Get multiple videos
     */
    const { query } = ctx;
    let availableLocales = {};
    let localizedIds = [];
    console.log(query.ids, "IDS");
    if (query.ids) {
      availableLocales = await strapi
        .service("api::video.video")
        .computeAvailableLocalesForListOfVideoIds(ctx);

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

    // Process videos to extract Vimeo thumbnails if needed
    if (data && data.length > 0) {
      const processedData = await Promise.all(
        data.map(async (videoEntry) => {
          const video = videoEntry;
          // Check if the video URL is from Vimeo
          if (
            video.attributes.url &&
            video.attributes.url.includes("vimeo.com")
          ) {
            try {
              // Extract Vimeo video ID from the URL
              let videoId = "";
              if (video.attributes.url.includes("vimeo.com/")) {
                videoId = video.attributes.url
                  .split("vimeo.com/")[1]
                  .split(/[?&]/)[0];
              }
              if (videoId) {
                // Fetch thumbnail from Vimeo API
                const response = await fetch(
                  `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`
                );

                if (response.ok) {
                  const vimeoData = await response.json();

                  if (vimeoData.thumbnail_url) {
                    video.attributes.vimeoThumbnailUrl =
                      vimeoData.thumbnail_url;
                  }
                }
              }
            } catch (error) {
              console.error("Error fetching Vimeo thumbnail:", error);
            }
          }
          return video;
        })
      );

      // Update data with processed videos
      data = processedData;
    }

    return { data, meta };
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const { query } = ctx;

    const baseVideo = await strapi.db.query("api::video.video").findOne({
      where: { id },
      populate: true,
    });

    if (!baseVideo) {
      return ctx.notFound("Video not found");
    }

    let availableLocales = { [baseVideo.locale]: baseVideo.id };

    if (baseVideo.localizations && baseVideo.localizations.length > 0) {
      baseVideo.localizations.forEach((loc) => {
        availableLocales[loc.locale] = loc.id;
      });
    }

    // Determine which ID to fetch based on query.locale
    const targetId = availableLocales[query.locale] || id;

    // Add view count before returning the data
    await this.addViewCount({ ...ctx, params: { id: targetId } });

    const entity = await strapi.entityService.findOne(
      "api::video.video",
      targetId,
      {
        populate: "*",
      }
    );

    // Optional: sanitize the entity if you're returning to a public API
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized, { availableLocales });
  },

  // eslint-disable-next-line
  async addViewCount(ctx) {
    /**
     * #route   PUT /videos/addViewCount/:id
     * #desc    Add 1 to the viewCount of the video
     */
    try {
      const { id } = ctx.params;

      const result = await strapi.db
        .query("api::video.video")
        .findOne({ select: ["view_count"], where: { id: id } });

      const resultAfterUpdate = await strapi.db
        .query("api::video.video")
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

  async getVideoLocales(ctx) {
    /**
     * #route   GET /videos/getVideoLocales/:id
     * #desc    Get an object containing all the available locales for a video with associated localized id {"kk": 17,"en": 12,"ru": 18}
     */
    try {
      const { id } = ctx.params;

      const result = await strapi.db
        .query("api::video.video")
        .findOne({ where: { id: id }, populate: true });

      let locales = {};
      locales[result.locale] = result.id;
      //Check if the video has any locales
      if (result.localizations && result.localizations.length > 0) {
        //Loop through the locales and create an object with the locale code as the key and the id as the value
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

  async getVideosLocalesMapping(ctx) {
    /**
     * #route   GET /videos/locales/mapping
     * #desc    Get the available locales for a list of videos in an object such as {id: {en: id, fr: id}}
     */
    try {
      const result = await strapi
        .service("api::video.video")
        .computeAvailableLocalesForListOfVideoIds(ctx);

      ctx.body = result;
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },

  async addRating(ctx) {
    try {
      const { id } = ctx.params;
      const { action } = ctx.request.body;

      const fieldToSelect =
        action === "add-like" || action === "remove-like"
          ? "likes"
          : "dislikes";

      const result = await strapi.db
        .query("api::video.video")
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
        .query("api::video.video")
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
