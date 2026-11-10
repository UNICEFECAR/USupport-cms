const TUTORIAL_UID = "api::tutorial.tutorial";

/**
 * Install after Strapi's i18n entity-service decorator, so its localization
 * synchronization is part of the same transaction as the entry/components.
 * A failed save must not leave a draft behind on the CMS create screen.
 */
function registerTutorialTransactions(strapi) {
  strapi.entityService.decorate((service) => {
    const methods = {};
    for (const action of ["create", "update", "delete"]) {
      methods[action] = async function (uid, ...args) {
        if (uid !== TUTORIAL_UID) {
          return service[action].call(this, uid, ...args);
        }

        // Nested i18n updates reuse the transaction via Strapi's context.
        return strapi.db.transaction(() => service[action].call(this, uid, ...args));
      };
    }
    return methods;
  });
}

module.exports = { registerTutorialTransactions };
