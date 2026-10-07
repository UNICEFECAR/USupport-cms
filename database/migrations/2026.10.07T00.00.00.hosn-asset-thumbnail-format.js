"use strict";

/**
 * Hosn El Hal assets: the "visual" format is now called "thumbnail".
 */
module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable("hosn_assets"))) return;
    await knex("hosn_assets").where({ format: "visual" }).update({ format: "thumbnail" });
  },

  async down() {
    throw new Error("Down migration is not supported");
  },
};
