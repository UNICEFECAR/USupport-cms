const { ApplicationError } = require("@strapi/utils").errors;

/**
 *
 * @param {string} locale
 * @param {object} availableLocales e.g {"10": {"en": 10,"kk": 15}}
 *
 * @returns {array} array of ids for the given locale
 */
function getIdsForSpecificLocales(locale, availableLocales) {
  let ids = [];
  // loop through each key of the availableLocales
  for (const key in availableLocales) {
    // check if the object associated to the keay contains another key equal to locale
    if (locale in availableLocales[key]) {
      // if yes, then push the id to the ids array
      ids.push(availableLocales[key][locale].toString());
    }
  }
  return ids;
}

/**
 * Validates that English locale entry exists before creating entries in other locales.
 * Should be called in beforeCreate lifecycle hook.
 *
 * @param {object} ctx - Strapi lifecycle context
 * @param {string} contentType - The content type UID (e.g., 'api::article.article')
 * @throws {Error} If trying to create non-English entry without English version
 */
async function validateEnglishLocaleFirst(ctx, contentType) {
  const { data } = ctx.params;
  const locale = data?.locale;

  // If creating in English, no validation needed
  if (!locale || locale === "en") {
    return;
  }

  // Check if this is a localization of an existing entry
  // When creating a localization, Strapi passes the related localizations
  const localizations = data?.localizations;

  if (!localizations || localizations.length === 0) {
    // This is a new entry and it's not in English - block it
    throw new ApplicationError(
      "Please add the entry in English language first before adding other languages."
    );
  }

  // If localizations exist, check if English exists
  const existingLocalizations = await strapi.entityService.findMany(
    contentType,
    {
      filters: {
        id: { $in: localizations.map((l) => l.id || l) },
      },
      locale: "all",
      fields: ["id", "locale"],
    }
  );

  const hasEnglishVersion = existingLocalizations.some(
    (entry) => entry.locale === "en"
  );

  if (!hasEnglishVersion) {
    throw new ApplicationError(
      "Please add the entry in English language first before adding other languages."
    );
  }
}

exports.getIdsForSpecificLocales = getIdsForSpecificLocales;
exports.validateEnglishLocaleFirst = validateEnglishLocaleFirst;
