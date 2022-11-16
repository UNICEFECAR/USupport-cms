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

exports.getIdsForSpecificLocales = getIdsForSpecificLocales;
