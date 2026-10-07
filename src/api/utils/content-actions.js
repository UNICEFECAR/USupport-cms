/**
 * Reusable controller actions and lifecycle helpers for content types.
 */
const { ApplicationError } = require("@strapi/utils").errors;

/**
 * Set the given counter fields to 0, used in `beforeCreate` lifecycles so
 * counters can't be set from the admin panel.
 *
 * @param {object} data - lifecycle data
 * @param {string[]} fields - counter attribute names
 */
function resetCounters(data, fields) {
  if (!data) return;
  fields.forEach((field) => {
    data[field] = 0;
  });
}

/**
 * @param {object} data - lifecycle data
 * @returns {boolean} whether the update publishes the entry
 */
const isPublishing = (data) => Boolean(data?.publishedAt);

/**
 * Run a validation when an entry gets published, so drafts can be saved
 * incomplete. Call from a `beforeUpdate` lifecycle.
 *
 * @param {object} event - lifecycle event
 * @param {string} uid - content type UID
 * @param {string[]} populate - relations / media / components the validator needs
 * @param {function} validate - receives the stored entry, returns an error message or null
 */
async function validateOnPublish(event, uid, populate, validate) {
  const { data, where } = event.params;
  if (!isPublishing(data) || !where?.id) return;

  const entry = await strapi.entityService.findOne(uid, where.id, { populate });
  const error = entry && validate(entry);

  if (error) throw new ApplicationError(error);
}

/**
 * Create a controller action that atomically increments a counter.
 * Route: PUT /<plural>/<action>/:id
 *
 * @param {string} uid - content type UID
 * @param {string} field - counter attribute name
 * @returns {function} Koa controller action
 */
function createIncrementAction(uid, field) {
  return async function increment(ctx) {
    try {
      const { id } = ctx.params;
      const { tableName } = strapi.db.metadata.get(uid);

      const updatedRows = await strapi.db
        .connection(tableName)
        .where({ id })
        .increment(field, 1);

      if (!updatedRows) return ctx.notFound();

      ctx.body = await strapi.db
        .query(uid)
        .findOne({ select: ["id", field], where: { id } });
    } catch (err) {
      strapi.log.error(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  };
}

/**
 * Create a controller action returning the ids of all localizations of an
 * entry, e.g. {"en": 12, "ar": 17}.
 * Route: GET /<plural>/available-locales/:id
 *
 * @param {string} uid - content type UID
 * @returns {function} Koa controller action
 */
function createLocalesAction(uid) {
  return async function getLocales(ctx) {
    try {
      const { id } = ctx.params;
      const entry = await strapi.db.query(uid).findOne({
        select: ["id", "locale"],
        where: { id },
        populate: { localizations: { select: ["id", "locale"] } },
      });

      if (!entry) return ctx.notFound();

      const locales = { [entry.locale]: entry.id };
      (entry.localizations || []).forEach((localization) => {
        locales[localization.locale] = localization.id;
      });

      ctx.body = locales;
    } catch (err) {
      strapi.log.error(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  };
}

module.exports = {
  resetCounters,
  isPublishing,
  validateOnPublish,
  createIncrementAction,
  createLocalesAction,
};
