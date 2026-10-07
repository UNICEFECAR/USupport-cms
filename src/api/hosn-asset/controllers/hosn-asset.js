"use strict";

/**
 * hosn-asset controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const {
  createIncrementAction,
  createLocalesAction,
} = require("../../utils/content-actions");

const UID = "api::hosn-asset.hosn-asset";

module.exports = createCoreController(UID, () => ({
  /**
   * #route   GET /hosn-assets/available-locales/:id
   * #desc    Get the ids of all localizations of an asset e.g {"en": 12, "ar": 17}
   */
  getLocales: createLocalesAction(UID),

  /**
   * #route   PUT /hosn-assets/addViewCount/:id
   * #desc    Add 1 to the view count of an asset
   */
  addViewCount: createIncrementAction(UID, "view_count"),

  /**
   * #route   PUT /hosn-assets/addDownloadCount/:id
   * #desc    Add 1 to the download count of an asset
   */
  addDownloadCount: createIncrementAction(UID, "download_count"),
}));
