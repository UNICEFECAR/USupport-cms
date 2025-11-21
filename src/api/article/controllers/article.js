"use strict";

/**
 * article controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { getIdsForSpecificLocales } = require("../../utils/utils.js");

module.exports = createCoreController("api::article.article", ({ strapi }) => ({
  // eslint-disable-next-line
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

  async addDownloadCount(ctx) {
    /**
     * #route   PUT /articles/addDownloadCount/:id
     * #desc    Add 1 to the downloadCount of the article
     */
    try {
      const { id } = ctx.params;

      const result = await strapi.db
        .query("api::article.article")
        .findOne({ select: ["download_count"], where: { id: id } });

      // Handle null/undefined download_count by defaulting to 0
      const currentCount = result?.download_count
        ? parseInt(result.download_count)
        : 0;

      const resultAfterUpdate = await strapi.db
        .query("api::article.article")
        .update({
          where: { id: id },
          data: { download_count: currentCount + 1 },
        });

      ctx.body = resultAfterUpdate;
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },

  async addShareCount(ctx) {
    /**
     * #route   PUT /articles/addShareCount/:id
     * #desc    Add 1 to the shareCount of the article
     */
    try {
      const { id } = ctx.params;

      const result = await strapi.db
        .query("api::article.article")
        .findOne({ select: ["share_count"], where: { id: id } });

      // Handle null/undefined share_count by defaulting to 0
      const currentCount = result?.share_count
        ? parseInt(result.share_count)
        : 0;

      const resultAfterUpdate = await strapi.db
        .query("api::article.article")
        .update({
          where: { id: id },
          data: { share_count: currentCount + 1 },
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

      // Add age group filter if provided
      if (query.ageGroupId) {
        ctx.query.filters.age_groups = {
          ...ctx.query.filters?.age_groups,
          id: query.ageGroupId,
        };
      }

      // Add category filter if provided
      if (query.categoryId) {
        ctx.query.filters.category = {
          ...ctx.query.filters?.category,
          id: query.categoryId,
        };
      }
    }

    let { data, meta } = await super.find(ctx);

    meta.availableLocales = availableLocales;
    meta.localizedIds = localizedIds;

    data.forEach((article) => {
      article.attributes.createdBy = {
        data: {
          attributes: {
            firstname: article.attributes.author,
            lastname: "",
          },
        },
      };
    });

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

    if (res?.data) {
      res.data.attributes.createdBy = {
        data: {
          attributes: {
            firstname: res.data.attributes.author,
            lastname: "",
          },
        },
      };
    }

    return res;
  },

  async addRating(ctx) {
    try {
      const { id } = ctx.params;
      const { action } = ctx.request.body;

      const fieldToSelect =
        action === "add-like" || action === "remove-like"
          ? "likes"
          : "dislikes";

      const result = await strapi.db
        .query("api::article.article")
        .findOne({ select: ["likes", "dislikes"], where: { id: id } });

      const updatedField =
        action === "add-like"
          ? parseInt(result.likes) + 1
          : action === "remove-like"
          ? parseInt(result.likes) - 1
          : action === "add-dislike"
          ? parseInt(result.dislikes) + 1
          : parseInt(result.dislikes) - 1;

      const resultAfterUpdate = await strapi.db
        .query("api::article.article")
        .update({
          where: { id: id },
          data: {
            [fieldToSelect]:
              updatedField < 0 ? 0 : isNaN(updatedField) ? 1 : updatedField,
          },
        });
      ctx.body = resultAfterUpdate;
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },

  async getArticleCategoryIds(ctx) {
    /**
     * #route   GET /articles/category-ids
     * #desc    Get all unique category IDs from articles for a specific locale,
     *          optionally filtered by age group and/or specific article IDs
     */
    try {
      const { locale = "en", ageGroupId, ids } = ctx.query;

      let targetArticleIds = null; // null = do NOT filter by IDs

      // If the client provides IDs, process them
      if (ids) {
        const articleIdsArray = ids.split(",").map((id) => parseInt(id));

        targetArticleIds = [...articleIdsArray]; // default to English IDs

        // If locale != 'en', resolve localized versions
        if (locale !== "en") {
          const localizedArticles = await strapi.db
            .query("api::article.article")
            .findMany({
              where: {
                locale,
                localizations: {
                  id: { $in: articleIdsArray },
                },
                publishedAt: { $notNull: true },
              },
              select: ["id"],
            });

          targetArticleIds = localizedArticles.map((a) => a.id);
        }
      }

      // Build main query
      const whereClause = {
        locale,
        publishedAt: { $notNull: true },
      };

      // Only add ID filtering if IDs were provided
      if (targetArticleIds && targetArticleIds.length > 0) {
        whereClause.id = { $in: targetArticleIds };
      }

      if (ageGroupId) {
        whereClause.age_groups = { id: ageGroupId };
      }

      // Fetch articles with categories
      const articles = await strapi.db.query("api::article.article").findMany({
        where: whereClause,
        select: [],
        populate: {
          category: {
            select: ["id"],
          },
        },
      });

      // Extract unique category IDs
      const categoryIds = [
        ...new Set(
          articles
            .map((article) => article.category?.id)
            .filter((id) => id != null)
        ),
      ];

      ctx.body = categoryIds;
    } catch (err) {
      console.error(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },

  async getRecommendedArticlesForCategory(ctx) {
    try {
      const {
        categoryId,
        categoryWeight,
        page = 1,
        limit = 10,
        language = "en",
        excludeIds = [],
        countryArticleIds = [],
        ageGroupId = null,
        tagIds = [],
        contains = "",
      } = ctx.request.body;

      const offset = (page - 1) * limit;

      const whereClause = {
        category: { id: categoryId },
        locale: language,
        publishedAt: { $notNull: true },
        id: { $notIn: excludeIds, $in: countryArticleIds },
      };

      // Add age group filter if provided
      if (ageGroupId) {
        whereClause.age_groups = { id: ageGroupId };
      }

      // Add search filter if provided
      if (contains) {
        whereClause.$or = [
          { title: { $containsi: contains } },
          { description: { $containsi: contains } },
        ];
      }

      const categoryArticles = await strapi.db
        .query("api::article.article")
        .findMany({
          where: whereClause,
          populate: true,
          orderBy: [
            { read_count: "desc" },
            { likes: "desc" },
            { createdAt: "desc" },
          ],
          offset,
          limit,
        });

      // Add category weight and recommendation score to articles
      const weightedArticles = categoryArticles.map((article) => ({
        ...article,
        categoryWeight,
        recommendationScore: this.calculateRecommendationScore(
          article,
          categoryWeight,
          tagIds
        ),
      }));

      // sort by weight and recommendation score
      weightedArticles.sort(
        (a, b) => b.recommendationScore - a.recommendationScore
      );

      // Get total count for pagination using same where clause
      const countWhereClause = {
        ...whereClause,
        id: { $notIn: excludeIds },
      };

      const totalCount = await strapi.db.query("api::article.article").count({
        where: countWhereClause,
      });

      const hasMore = offset + limit < totalCount;

      const transformedArticles = weightedArticles.map((article) =>
        optimizedTransform(article)
      );

      ctx.body = {
        success: true,
        data: transformedArticles,
        categoryId,
        categoryWeight,
        pagination: {
          page,
          limit,
          total: totalCount,
          hasMore,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (err) {
      console.log(err);
      ctx.status = 500;
      ctx.body = { error: err.message };
    }
  },

  // Helper method to calculate recommendation score
  calculateRecommendationScore(article, categoryWeight, tagIds) {
    const tagWeight = 0.5;
    const readCountWeight = 0.4;
    const likesWeight = 0.3;
    const categoryWeight_ = 0.2;
    const freshnessWeight = 0.1;

    const currentArticleTagIds = article.labels?.map((x) => Number(x.id));
    const matchingTagIds = currentArticleTagIds.filter((id) =>
      tagIds.includes(id)
    );

    // Normalize values (you may want to adjust these based on your data)
    const normalizedReadCount = Math.log(1 + (article.read_count || 0)) / 10;
    const normalizedLikes = Math.log(1 + (article.likes || 0)) / 5;
    const normalizedCategoryWeight = Math.log(1 + categoryWeight) / 3;

    // Freshness score (newer articles get higher score)
    const daysSinceCreated =
      (Date.now() - new Date(article.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0, 1 - daysSinceCreated / 365); // Decay over a year

    const score =
      normalizedReadCount * readCountWeight +
      normalizedLikes * likesWeight +
      normalizedCategoryWeight * categoryWeight_ +
      freshnessScore * freshnessWeight +
      matchingTagIds.length * tagWeight;
    console.log("score", score);
    return score;
  },
}));

const optimizedTransform = (rawData) => {
  const transformArticle = (article) => {
    const { id, ...attributes } = article;

    return {
      id,
      attributes: {
        ...attributes,
        // Transform specific relations
        image: attributes.image
          ? {
              data: attributes.image.id
                ? {
                    id: attributes.image.id,
                    attributes: { ...attributes.image, id: undefined },
                  }
                : null,
            }
          : null,

        category: attributes.category
          ? {
              data: {
                id: attributes.category.id,
                attributes: { ...attributes.category, id: undefined },
              },
            }
          : null,

        age_groups: attributes.age_groups
          ? {
              data: attributes.age_groups.map((group) => ({
                id: group.id,
                attributes: { ...group, id: undefined },
              })),
            }
          : { data: [] },

        labels: attributes.labels
          ? {
              data: attributes.labels.map((label) => ({
                id: label.id,
                attributes: { ...label, id: undefined },
              })),
            }
          : { data: [] },

        createdBy: attributes.createdBy
          ? {
              data: {
                id: attributes.createdBy.id,
                attributes: { ...attributes.createdBy, id: undefined },
              },
            }
          : null,

        updatedBy: attributes.updatedBy
          ? {
              data: {
                id: attributes.updatedBy.id,
                attributes: { ...attributes.updatedBy, id: undefined },
              },
            }
          : null,

        localizations: attributes.localizations
          ? {
              data: attributes.localizations.map((loc) => ({
                id: loc.id,
                attributes: { ...loc, id: undefined },
              })),
            }
          : { data: [] },
      },
    };
  };

  if (Array.isArray(rawData)) {
    return {
      data: rawData.map(transformArticle),
    };
  }

  return {
    data: transformArticle(rawData),
  };
};
