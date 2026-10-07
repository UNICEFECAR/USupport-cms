"use strict";

/**
 * hosn-bundle controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { createLocalesAction } = require("../../utils/content-actions");

const UID = "api::hosn-bundle.hosn-bundle";

module.exports = createCoreController(UID, () => ({
  /**
   * #route   GET /hosn-bundles/available-locales/:id
   * #desc    Get the ids of all localizations of a bundle e.g {"en": 3, "ar": 8}
   */
  getLocales: createLocalesAction(UID),
}));
