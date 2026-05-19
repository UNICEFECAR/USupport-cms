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

/** Columns on admin::user (country may come from country-select plugin when present). */
const CMS_ADMIN_USER_NAME_FIELDS = [
  "firstname",
  "lastname",
  "username",
  "email",
];

/**
 * @param {Record<string, unknown>} query
 * @returns {boolean}
 */
function queryIsForAdmin(query) {
  const v = query?.isForAdmin;
  return v === true || v === "true" || v === 1 || v === "1";
}

/**
 * Optionally merge createdBy into populate. When the client sends `populate=*`,
 * leave it unchanged so category/image/etc. still load; creator fields are
 * attached after find via `attachCmsAdminCreatorFields`.
 *
 * @param {unknown} populate
 */
function mergeAdminCreatedByPopulate(populate) {
  if (!populate || populate === "*") {
    return populate;
  }
  const createdByPopulate = { fields: CMS_ADMIN_USER_NAME_FIELDS };
  if (typeof populate === "string") {
    return { createdBy: createdByPopulate };
  }
  if (Array.isArray(populate)) {
    return [...populate, "createdBy"];
  }
  if (typeof populate === "object") {
    return { ...populate, createdBy: createdByPopulate };
  }
  return { createdBy: createdByPopulate };
}

/**
 * @param {Record<string, unknown> | undefined} attributes
 */
function cmsUserFromContentAttributes(attributes) {
  const createdBy = attributes?.createdBy;
  if (!createdBy || typeof createdBy !== "object") return null;
  if (
    createdBy.data &&
    typeof createdBy.data === "object" &&
    createdBy.data.attributes
  ) {
    return createdBy.data.attributes;
  }
  if (
    "firstname" in createdBy ||
    "username" in createdBy ||
    "email" in createdBy
  ) {
    return createdBy;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} attributes
 * @param {{ firstname?: string, lastname?: string, username?: string, email?: string, country?: string } | null | undefined} cmsUser
 */
function setCmsAdminAttributes(attributes, cmsUser) {
  const first =
    typeof cmsUser?.firstname === "string" ? cmsUser.firstname.trim() : "";
  const last =
    typeof cmsUser?.lastname === "string" ? cmsUser.lastname.trim() : "";
  const fullName = [first, last].filter(Boolean).join(" ");
  attributes.cmsCreatedBy =
    fullName ||
    (typeof cmsUser?.username === "string" ? cmsUser.username.trim() : null) ||
    (typeof cmsUser?.email === "string" ? cmsUser.email.trim() : null) ||
    null;
  const country =
    typeof cmsUser?.country === "string" ? cmsUser.country.trim() : "";
  attributes.cmsUploaderCountry = country ? country.toUpperCase() : null;
}

/**
 * @param {import("@strapi/strapi").Strapi} strapi
 * @param {string} contentTypeUid
 * @param {number[]} ids
 * @returns {Promise<Map<number, object>>}
 */
async function loadCmsUsersByContentId(strapi, contentTypeUid, ids) {
  const rows = await strapi.db.query(contentTypeUid).findMany({
    where: { id: { $in: ids } },
    select: ["id"],
    populate: {
      createdBy: true,
    },
  });
  return new Map(rows.map((r) => [r.id, r.createdBy]));
}

/**
 * Country-admin only: set `cmsCreatedBy` and `cmsUploaderCountry` from Strapi
 * `createdBy` (admin::user). Uses populated `createdBy` when present, else one
 * lean batch query per request (not per row).
 *
 * @param {import("@strapi/strapi").Strapi} strapi
 * @param {{ id: number, attributes: Record<string, unknown> }[]} entries
 * @param {Record<string, unknown>} query
 * @param {string} [contentTypeUid='api::article.article']
 */
async function attachCmsAdminCreatorFields(
  strapi,
  entries,
  query,
  contentTypeUid = "api::article.article",
) {
  if (!queryIsForAdmin(query)) return;
  if (!Array.isArray(entries) || entries.length === 0) return;

  const ids = entries
    .map((e) => e.id)
    .filter((id) => id != null && !Number.isNaN(Number(id)));

  if (ids.length === 0) return;

  try {
    const cmsUserById = await loadCmsUsersByContentId(
      strapi,
      contentTypeUid,
      ids,
    );
    for (const entry of entries) {
      const cmsUser =
        cmsUserFromContentAttributes(entry.attributes) ||
        cmsUserById.get(entry.id);
      setCmsAdminAttributes(entry.attributes, cmsUser);
    }
  } catch (err) {
    strapi.log.warn("attachCmsAdminCreatorFields failed", err);
  }
}

exports.getIdsForSpecificLocales = getIdsForSpecificLocales;
exports.validateEnglishLocaleFirst = validateEnglishLocaleFirst;
exports.queryIsForAdmin = queryIsForAdmin;
exports.mergeAdminCreatedByPopulate = mergeAdminCreatedByPopulate;
exports.attachCmsAdminCreatorFields = attachCmsAdminCreatorFields;
