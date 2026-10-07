"use strict";

/**
 * Replace the `is_playandheal` boolean with the `program` enumeration on the
 * program scoped content types.
 *
 * Strapi runs migrations before syncing the schema, so the `program` column is
 * created here, filled from `is_playandheal` and the schema sync then drops
 * the old column.
 */

const TABLES = [
  "privacy_policies",
  "terms_of_uses",
  "cookie_policies",
  "about_us_pages",
];

module.exports = {
  async up(knex) {
    for (const table of TABLES) {
      if (!(await knex.schema.hasTable(table))) continue;

      if (!(await knex.schema.hasColumn(table, "program"))) {
        await knex.schema.alterTable(table, (t) => {
          t.string("program");
        });
      }

      if (await knex.schema.hasColumn(table, "is_playandheal")) {
        await knex(table)
          .where({ is_playandheal: true })
          .update({ program: "playandheal" });
      }

      await knex(table).whereNull("program").update({ program: "usupport" });
    }
  },

  async down() {
    throw new Error("Down migration is not supported");
  },
};
