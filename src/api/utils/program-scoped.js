/**
 * Shared logic for content types that exist once per locale and are scoped
 * either to a program (Play and Heal, Hosn El Hal) or, for uSupport, to a
 * country / global (privacy policy, terms of use, cookie policy, about us).
 */
const { ApplicationError } = require("@strapi/utils").errors;
const {
  PROGRAMS,
  PROGRAM_LABELS,
  getRequestedProgram,
  getEntryProgram,
} = require("./program");

const SCOPE_FIELDS = ["program", "global", "country"];

const isGlobalRequest = (query) =>
  Boolean(query.filters?.global) ||
  String(query.country || "").toLowerCase() === "global";

/**
 * Pick the entry that matches the requested program / global / country.
 *
 * @param {object[]} entries - entries of a single locale
 * @param {object} query - Koa query object
 * @returns {object|undefined}
 */
function findEntryForRequest(entries, query) {
  const program = getRequestedProgram(query);

  if (program !== PROGRAMS.USUPPORT) {
    return entries.find((entry) => getEntryProgram(entry) === program);
  }

  const usupportEntries = entries.filter(
    (entry) => getEntryProgram(entry) === PROGRAMS.USUPPORT
  );

  if (isGlobalRequest(query)) {
    return usupportEntries.find((entry) => entry.global);
  }

  return usupportEntries.find((entry) => entry.country === query.country);
}

/**
 * Create the `customFind` controller action.
 *
 * @param {string} uid - content type UID
 * @param {object} [options]
 * @param {boolean} [options.returnEntry=false] - return the whole entry instead of the `platform` field
 * @param {boolean} [options.publishedOnly=false] - ignore draft entries
 * @returns {function} Koa controller action
 */
function createProgramScopedFind(
  uid,
  { returnEntry = false, publishedOnly = false } = {}
) {
  return async function customFind(ctx) {
    try {
      const { query } = ctx;
      const where = { locale: query.locale };
      if (publishedOnly) where.publishedAt = { $notNull: true };

      const entries = await strapi.db.query(uid).findMany({ where });
      const entry = findEntryForRequest(entries, query);

      if (!entry) {
        ctx.body = null;
        return;
      }

      // Platform specific content (website / client / provider), CKEditor version first
      ctx.body = returnEntry
        ? entry
        : entry[`${query.platform}_ck`] || entry[query.platform] || null;
    } catch (err) {
      strapi.log.error(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  };
}

/**
 * Create lifecycles that allow a single entry per locale and scope.
 *
 * @param {string} uid - content type UID
 * @param {string} label - human readable content type name used in errors
 * @returns {object} Strapi lifecycles
 */
function createProgramScopedLifecycles(uid, label) {
  async function validateScope({ id, locale, program, global, country }) {
    if (!locale) {
      throw new ApplicationError("Locale is required.");
    }

    const entryProgram = program || PROGRAMS.USUPPORT;
    let where;
    let scopeLabel;

    if (entryProgram !== PROGRAMS.USUPPORT) {
      where = { program: entryProgram };
      scopeLabel = PROGRAM_LABELS[entryProgram];
    } else if (global) {
      where = { program: PROGRAMS.USUPPORT, global: true };
      scopeLabel = "global";
    } else if (country) {
      where = { program: PROGRAMS.USUPPORT, country };
      scopeLabel = country;
    } else {
      throw new ApplicationError(
        "Please choose a country, mark as global or select a program."
      );
    }

    const existing = await strapi.db
      .query(uid)
      .findOne({ where: { ...where, locale } });

    if (existing && existing.id !== id) {
      throw new ApplicationError(
        `A ${scopeLabel} ${label} already exists for locale "${locale}".`
      );
    }
  }

  return {
    async beforeCreate(event) {
      await validateScope(event.params.data);
    },

    async beforeUpdate(event) {
      const { data, where } = event.params;
      const id = where?.id;
      if (!id || typeof id === "object") return;

      const current = await strapi.db.query(uid).findOne({ where: { id } });
      if (!current) return;

      // Partial updates (publish, localization sync) keep the stored scope
      const scope = {};
      SCOPE_FIELDS.forEach((field) => {
        scope[field] = Object.prototype.hasOwnProperty.call(data, field)
          ? data[field]
          : current[field];
      });

      await validateScope({ id: current.id, locale: current.locale, ...scope });
    },
  };
}

module.exports = {
  createProgramScopedFind,
  createProgramScopedLifecycles,
};
