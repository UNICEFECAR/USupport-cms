const { ApplicationError } = require("@strapi/utils").errors;
const { validateEnglishLocaleFirst } = require("../../../utils/utils");
const { validateOnPublish } = require("../../../utils/content-actions");
const {
  createMediaProcessingLifecycles,
} = require("../../../utils/media-processing");

const UID = "api::tutorial.tutorial";
const PLATFORMS = ["website", "client", "provider"];
const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * @param {*} value - id, { id }, or { set / connect }
 * @returns {number[]}
 */
function localizationIds(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : value.connect || value.set || [];
  return list
    .map((item) => (item && typeof item === "object" ? item.id : item))
    .filter((id) => id !== undefined && id !== null)
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));
}

/**
 * @param {*} value - media relation as sent by the admin
 * @returns {number|null}
 */
function getMediaId(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return getMediaId(value[0]);
  if (typeof value === "object") {
    if (value.id !== undefined && value.id !== null) return Number(value.id);
    if (value.set || value.connect)
      return getMediaId(value.set ?? value.connect);
    return null;
  }
  const id = Number(value);
  return Number.isNaN(id) ? null : id;
}

/**
 * Lowercase and trim a key when the editor sent one.
 * Non-localized fields are copied from the English entry, so a localization
 * create may omit them.
 *
 * @param {object} data - lifecycle data
 */
async function applyIdentity(data) {
  if (typeof data.key === "string") {
    data.key = data.key.trim().toLowerCase();
  }

  if (data.platform && data.key) return;

  const sourceId = localizationIds(data.localizations)[0];
  if (!sourceId) return;

  const source = await strapi.db.query(UID).findOne({
    where: { id: sourceId },
    select: ["platform", "key"],
  });
  if (!source) return;

  if (!data.platform) data.platform = source.platform;
  if (!data.key) data.key = source.key;
}

/**
 * One tutorial per platform and key. Other locales of the same tutorial are
 * not a conflict: Strapi stores each locale as its own row.
 *
 * @param {object} params
 * @param {number} [params.id]
 * @param {string} params.platform
 * @param {string} params.key
 * @param {number[]} [params.siblingIds]
 */
async function validateUniqueKey({ id, platform, key, siblingIds = [] }) {
  if (!PLATFORMS.includes(platform)) {
    throw new ApplicationError("Please choose a platform.");
  }

  if (!key || !KEY_PATTERN.test(key)) {
    throw new ApplicationError(
      "Key must be a lowercase slug, for example home-intro."
    );
  }

  const allowed = new Set(siblingIds);
  if (id) allowed.add(Number(id));

  const matches = await strapi.db.query(UID).findMany({
    where: { platform, key },
    select: ["id"],
  });

  const conflict = matches.find((entry) => !allowed.has(Number(entry.id)));
  if (conflict) {
    throw new ApplicationError(
      `A ${platform} tutorial with key "${key}" already exists.`
    );
  }
}

/**
 * Uploaded tutorial files must be MP4. A missing source is allowed so a
 * draft can be saved, or an HLS url can be pasted on the video component.
 *
 * @param {object} [video]
 */
async function assertMp4Source(video) {
  if (!video || typeof video !== "object") return;
  if (!Object.prototype.hasOwnProperty.call(video, "source")) return;

  const sourceId = getMediaId(video.source);
  if (!sourceId) return;

  const file = await strapi.db.query("plugin::upload.file").findOne({
    where: { id: sourceId },
    select: ["ext", "mime"],
  });
  if (!file) return;

  const ext = String(file.ext || "").toLowerCase();
  const mime = String(file.mime || "").toLowerCase();
  if (ext !== ".mp4" && ext !== "mp4" && mime !== "video/mp4") {
    throw new ApplicationError("Tutorial videos must be MP4 files.");
  }
}

module.exports = {
  ...createMediaProcessingLifecycles(UID, ["video"]),

  async beforeCreate(event) {
    const { data } = event.params;
    if (!data) return;

    await validateEnglishLocaleFirst(
      {
        ...event,
        params: {
          ...event.params,
          data: { ...data, localizations: localizationIds(data.localizations) },
        },
      },
      UID
    );

    await applyIdentity(data);
    await validateUniqueKey({
      platform: data.platform,
      key: data.key,
      siblingIds: localizationIds(data.localizations),
    });
    await assertMp4Source(data.video);
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    const id = where?.id;
    if (!data || !id || typeof id === "object") return;

    const current = await strapi.db.query(UID).findOne({
      where: { id },
      populate: { localizations: { select: ["id"] } },
    });
    if (!current) return;

    if (typeof data.key === "string") {
      data.key = data.key.trim().toLowerCase();
    }

    const platform = Object.prototype.hasOwnProperty.call(data, "platform")
      ? data.platform
      : current.platform;
    const key = Object.prototype.hasOwnProperty.call(data, "key")
      ? data.key
      : current.key;

    await validateUniqueKey({
      id: current.id,
      platform,
      key,
      // Strapi links a newly created locale back to its siblings afterwards.
      // The incoming sibling does not exist in current.localizations yet.
      siblingIds: [
        ...(current.localizations || []).map((item) => item.id),
        ...localizationIds(data.localizations),
      ],
    });
    await assertMp4Source(data.video);
    await validateOnPublish(event, UID, ["video"], (tutorial) => {
      if (tutorial.video?.hls_url) return null;
      return "Upload an MP4 and wait until its status is ready before publishing.";
    });
  },
};
