const { validateEnglishLocaleFirst } = require("../../../utils/utils");
const {
  resetCounters,
  validateOnPublish,
} = require("../../../utils/content-actions");
const {
  createMediaProcessingLifecycles,
} = require("../../../utils/media-processing");

const UID = "api::hosn-asset.hosn-asset";

// What each format needs before it can be published
const REQUIRED_CONTENT = {
  video: {
    isValid: (asset) => Boolean(asset.video?.hls_url),
    label: "a processed video (upload a source video and wait until its status is ready, or paste an HLS url)",
  },
  audio: {
    isValid: (asset) => Boolean(asset.audio?.audio_url),
    label: "a processed audio file (upload an audio or video file and wait until its status is ready)",
  },
  thumbnail: {
    isValid: (asset) => Boolean(asset.file_web || asset.file_print),
    label: "an image or PDF",
  },
  worksheet: {
    isValid: (asset) =>
      Boolean(
        asset.file_web || asset.file_print || asset.interactive_content?.length
      ),
    label: "a PDF or interactive content",
  },
};

module.exports = {
  ...createMediaProcessingLifecycles(UID, ["video", "audio"]),

  async beforeCreate(event) {
    await validateEnglishLocaleFirst(event, UID);
    resetCounters(event.params.data, ["view_count", "download_count"]);
  },

  async beforeUpdate(event) {
    await validateOnPublish(
      event,
      UID,
      ["video", "audio", "file_web", "file_print", "interactive_content"],
      (asset) => {
        const required = REQUIRED_CONTENT[asset.format];
        if (!required || required.isValid(asset)) return null;
        return `A ${asset.format} asset needs ${required.label} before it can be published.`;
      }
    );
  },
};
