const { validateEnglishLocaleFirst } = require("../../../utils/utils");
const fetch = require("node-fetch");

const CLIENT_SERVICE_URL = process.env.API_URL;

/** Stable compare for CKEditor JSON or string payloads */
function serializeBodyCk(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function bodyCkChanged(previous, current) {
  return serializeBodyCk(previous) !== serializeBodyCk(current);
}

const voiceMap = {
  en: "en-US-JennyNeural",
  ru: "ru-RU-SvetlanaNeural",
  kk: "kk-KZ-AigulNeural",
  uz: "uz-UZ-MadinaNeural",
  sr: "sr-RS-SophieNeural",
  hr: "hr-HR-GabrijelaNeural",
  sq: "sq-AL-AnilaNeural",
  hy: "hy-AM-AnahitNeural",
  pl: "pl-PL-AgnieszkaNeural",
  ro: "ro-RO-AlinaNeural",
  uk: "uk-UA-PolinaNeural",
  el: "el-GR-AthinaNeural",
  tr: "tr-TR-EmelNeural",
};

function getVoiceForLocale(locale) {
  return voiceMap[locale] || voiceMap["en"];
}

module.exports = {
  async beforeCreate(ctx) {
    // Validate English locale exists first
    await validateEnglishLocaleFirst(ctx, "api::article.article");

    const { data } = ctx.params;
    if (data) {
      data.likes = 0;
      data.dislikes = 0;
      data.share_count = 0;
      data.download_count = 0;
      data.read_count = 0;
    }
  },

  async beforeUpdate(event) {
    const { where } = event.params;
    if (!where?.id) return;

    const existing = await strapi.db.query("api::article.article").findOne({
      where: { id: where.id },
      select: ["id", "body_ck"],
    });
    event.state = event.state || {};
    event.state.previousBodyCk = existing?.body_ck ?? null;
  },

  async afterUpdate(event) {
    const { where } = event.params;
    if (!where?.id) return;

    const fresh = await strapi.db.query("api::article.article").findOne({
      where: { id: where.id },
      select: ["id", "body_ck", "locale"],
    });

    const previousBodyCk = event.state?.previousBodyCk;
    const currentBodyCk = fresh?.body_ck ?? null;

    if (bodyCkChanged(previousBodyCk, currentBodyCk)) {
      const text =
        typeof currentBodyCk === "string"
          ? currentBodyCk
          : serializeBodyCk(currentBodyCk);

      if (!CLIENT_SERVICE_URL || !text) {
        strapi.log.warn(
          `[article] TTS trigger skipped for id=${where.id} (missing CLIENT_SERVICE_URL, INTERNAL_TTS_SECRET, or text)`
        );
        return;
      }

      try {
        const voice = getVoiceForLocale(fresh?.locale || "en");
        fetch(`${CLIENT_SERVICE_URL}/client/tts/synthesize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            contentFormat: "html",
            voice,
            articleId: String(where.id),
            locale: fresh?.locale || "en",
            storeInS3: true,
          }),
        }).then(async (response) => {
          if (!response.ok) {
            const errorBody = await response.text();
            strapi.log.error(
              `[article] TTS synthesis failed for id=${where.id}. status=${response.status} body=${errorBody}`
            );
            return;
          }

          const responseBody = await response.json();
          const ttsHash = responseBody?.data?.ttsHash;
          const ttsKey = responseBody?.data?.ttsKey;
          const ttsS3Key = responseBody?.data?.s3Key;
          const ttsS3Url = responseBody?.data?.s3Url;

          if (ttsS3Url) {
            await strapi.db.query("api::article.article").update({
              where: { id: where.id },
              data: { s3_tts_url: ttsS3Url },
            });
          }

          strapi.log.info(
            `[article] TTS synthesis triggered successfully for id=${where.id}, ttsHash=${ttsHash}, ttsKey=${ttsKey}, s3Key=${ttsS3Key}, s3Url=${ttsS3Url}`
          );
        });
      } catch (error) {
        strapi.log.error(
          `[article] TTS synthesis request error for id=${where.id}: ${error.message}`
        );
      }
    }
  },
};
