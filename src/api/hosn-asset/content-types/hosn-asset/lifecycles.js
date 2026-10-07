const { validateEnglishLocaleFirst } = require("../../../utils/utils");
const {
  resetCounters,
  validateOnPublish,
} = require("../../../utils/content-actions");
const {
  createVideoProcessingLifecycles,
} = require("../../../utils/video-processing");

const UID = "api::hosn-asset.hosn-asset";

// What each format needs before it can be published
const REQUIRED_CONTENT = {
  video: {
    isValid: (asset) => Boolean(asset.video?.hls_url),
    label: "a processed video (upload a source video and wait until its status is ready, or paste an HLS url)",
  },
  audio: {
    isValid: (asset) => Boolean(asset.audio_file),
    label: "an audio file",
  },
  visual: {
    isValid: (asset) => Boolean(asset.file_web),
    label: "a web image",
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
  ...createVideoProcessingLifecycles(UID, "video"),

  async beforeCreate(event) {
    await validateEnglishLocaleFirst(event, UID);
    resetCounters(event.params.data, ["view_count", "download_count"]);
  },

  async beforeUpdate(event) {
    await validateOnPublish(
      event,
      UID,
      ["video", "audio_file", "file_web", "file_print", "interactive_content"],
      (asset) => {
        const required = REQUIRED_CONTENT[asset.format];
        if (!required || required.isValid(asset)) return null;
        return `A ${asset.format} asset needs ${required.label} before it can be published.`;
      }
    );
  },
};
