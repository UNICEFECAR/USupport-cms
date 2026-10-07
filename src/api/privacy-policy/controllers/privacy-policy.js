"use strict";

/**
 * privacy-policy controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { createProgramScopedFind } = require("../../utils/program-scoped");

const UID = "api::privacy-policy.privacy-policy";

module.exports = createCoreController(UID, () => ({
  /**
   * #route   GET /privacy-policies/find
   * #desc    Get the privacy policy for a program, country or global
   */
  customFind: createProgramScopedFind(UID),
}));
