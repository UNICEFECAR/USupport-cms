"use strict";

/**
 * terms-of-use controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { createProgramScopedFind } = require("../../utils/program-scoped");

const UID = "api::terms-of-use.terms-of-use";

module.exports = createCoreController(UID, () => ({
  /**
   * #route   GET /terms-of-uses/find
   * #desc    Get the terms of use for a program, country or global
   */
  customFind: createProgramScopedFind(UID),
}));
