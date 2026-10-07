"use strict";

/**
 * about-us-page controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { createProgramScopedFind } = require("../../utils/program-scoped");

const UID = "api::about-us-page.about-us-page";

module.exports = createCoreController(UID, () => ({
  /**
   * #route   GET /about-us-pages/find
   * #desc    Get the published about us page for a program, country or global
   */
  customFind: createProgramScopedFind(UID, {
    returnEntry: true,
    publishedOnly: true,
  }),
}));
