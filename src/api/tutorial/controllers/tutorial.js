"use strict";

/**
 * tutorial controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

const UID = "api::tutorial.tutorial";
const PLATFORMS = ["website", "client", "provider"];

module.exports = createCoreController(UID, () => ({
  /**
   * #route   GET /tutorials/find
   * #desc    Get a published tutorial for a platform, key and locale
   */
  async customFind(ctx) {
    try {
      const { query } = ctx;
      const platform = typeof query.platform === "string" ? query.platform : "";
      const key = typeof query.key === "string" ? query.key.trim().toLowerCase() : "";
      const locale = typeof query.locale === "string" ? query.locale.trim() : "";

      if (!platform || !key || !locale) {
        ctx.status = 400;
        ctx.body = { error: "platform, key, and locale are required." };
        return;
      }

      if (!PLATFORMS.includes(platform)) {
        ctx.status = 400;
        ctx.body = { error: "platform is invalid." };
        return;
      }

      const entry = await strapi.db.query(UID).findOne({
        where: {
          platform,
          key,
          locale,
          publishedAt: { $notNull: true },
        },
        populate: { video: true },
      });

      if (!entry) {
        ctx.body = null;
        return;
      }

      const { video } = entry;
      ctx.body = {
        id: entry.id,
        key: entry.key,
        platform: entry.platform,
        locale: entry.locale,
        video: video
          ? {
            hls_url: video.hls_url || null,
            download_url: video.download_url || null,
            status: video.status || null,
            duration_seconds: video.duration_seconds ?? null,
          }
          : null,
      };
    } catch (err) {
      strapi.log.error(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },
}));
