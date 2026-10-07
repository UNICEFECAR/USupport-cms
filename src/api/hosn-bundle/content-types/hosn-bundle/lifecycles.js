const { validateEnglishLocaleFirst } = require("../../../utils/utils");
const { validateOnPublish } = require("../../../utils/content-actions");

const UID = "api::hosn-bundle.hosn-bundle";

module.exports = {
  async beforeCreate(event) {
    await validateEnglishLocaleFirst(event, UID);
  },

  async beforeUpdate(event) {
    await validateOnPublish(event, UID, ["assets"], (bundle) => {
      const assets = bundle.assets || [];

      if (!assets.length) {
        return "A bundle needs at least one asset before it can be published.";
      }

      if (
        bundle.type === "audio_package" &&
        assets.some((asset) => asset.format !== "audio")
      ) {
        return "An audio package can only contain audio assets.";
      }

      return null;
    });
  },
};
