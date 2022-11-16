"use strict";

/**
 * article controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { getIdsForSpecificLocales } = require("../../utils/utils.js");

module.exports = createCoreController("api::article.article", ({ strapi }) => ({
  async addReadCount(ctx) {
    /**
     * #route   PUT /articles/addReadCount/:id
     * #desc    Add 1 to the readCount of the article
     */
    try {
      const { id } = ctx.params;

      const result = await strapi.db
        .query("api::article.article")
        .findOne({ select: ["read_count"], where: { id: id } });

      const resultAfterUpdate = await strapi.db
        .query("api::article.article")
        .update({
          where: { id: id },
          data: { read_count: parseInt(result.read_count) + 1 },
        });

      ctx.body = resultAfterUpdate;
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },

  async getArticleLocales(ctx) {
    /**
     * #route   GET /articles/getArticleLocales/:id
     * #desc    Get an object containing all the available locales for an article with associated localized id {"kk": 17,"en": 12,"ru": 18}
     */
    try {
      const { id } = ctx.params;

      const result = await strapi.db
        .query("api::article.article")
        .findOne({ where: { id: id }, populate: true });

      let locales = {};
      locales[result.locale] = result.id;
      //Checck if the article has any locales
      if (result.localizations.length > 0) {
        //Loop through the locales and create an object with the locale code as the key and the id as the value
        result.localizations.forEach((locale) => {
          locales[locale.locale] = locale.id;
        });
      }

      ctx.body = locales;
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },

  async getArticlesLocalesMapping(ctx) {
    /**
     * #route   GET /articles/locales/mapping
     * #desc    Get the available locales for a list of articles in an object such as {id: {en: id, fr: id}}
     */
    try {
      const result = await strapi
        .service("api::article.article")
        .computeAvailableLocalesForListOfArticleIds(ctx);

      ctx.body = result;
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },

  async find(ctx) {
    /**
     * #route   GET /articles/locales/mapping
     * #desc    Get multiple articles
     */
    const { query } = ctx;
    let availableLocales = {};
    let localizedIds = [];
    if (query.ids) {
      availableLocales = await strapi
        .service("api::article.article")
        .computeAvailableLocalesForListOfArticleIds(ctx);

      localizedIds = getIdsForSpecificLocales(query.locale, availableLocales);
    }

    if (!query.isForAdmin) {
      ctx.query.filters = {
        ...ctx.query.filters,
        id: {
          ...ctx.query.filters?.id,
          $in: localizedIds,
        },
      };
    }

    let { data, meta } = await super.find(ctx);

    meta.availableLocales = availableLocales;
    meta.localizedIds = localizedIds;

    return { data, meta };
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const { query } = ctx;

    const result = await strapi.db
      .query("api::article.article")
      .findOne({ where: { id: id }, populate: true });

    // will store data in the following format {'locale-alpha2': 'article-id'} }
    let availableLocales = {};
    availableLocales[result.locale] = result.id;

    //Checck if the article has any availableLocales
    if (result.localizations.length > 0) {
      //Loop through the availableLocales and create an object with the locale code as the key and the id as the value
      result.localizations.forEach((locale) => {
        availableLocales[locale.locale] = locale.id;
      });
    }

    // If there is version with the provided locale fetch the data for that id
    if (Object.keys(availableLocales).includes(query.locale)) {
      ctx.params.id = availableLocales[query.locale];
    }

    let res = await super.findOne(ctx);

    return res;
  },
}));
