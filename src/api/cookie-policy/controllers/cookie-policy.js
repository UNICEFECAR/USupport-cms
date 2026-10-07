"use strict";

/**
 * cookie-policy controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { createProgramScopedFind } = require("../../utils/program-scoped");

const UID = "api::cookie-policy.cookie-policy";

module.exports = createCoreController(UID, () => ({
  /**
   * #route   GET /policy-cookies/find
   * #desc    Get the cookie policy for a program, country or global
   */
  customFind: createProgramScopedFind(UID),
}));
