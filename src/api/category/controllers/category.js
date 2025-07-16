"use strict";

/**
 * category controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::category.category",
  ({ strapi }) => ({
    async getAllCategoriesStatistics(ctx) {
      /**
       * #route   GET /categories/statistics
       * #desc    Get statistics for all categories aggregated across all locales
       */
      try {
        const headers = ctx.request.headers;
        const language = headers["x-language-alpha-2"];
        const contentType = ctx.query.contentType;

        // Get all categories with their localizations
        const categories = await strapi.db
          .query("api::category.category")
          .findMany({
            populate: {
              localizations: {
                select: ["id", "name", "locale"],
              },
            },
          });

        let allArticles = [];
        let allVideos = [];
        let allPodcasts = [];

        if (contentType === "articles" || contentType === "all") {
          allArticles = await strapi.db.query("api::article.article").findMany({
            populate: {
              category: {
                select: ["id"],
              },
            },
            select: [
              "read_count",
              "download_count",
              "share_count",
              "likes",
              "dislikes",
            ],
          });
        }

        if (contentType === "videos" || contentType === "all") {
          allVideos = await strapi.db.query("api::video.video").findMany({
            populate: {
              category: {
                select: ["id"],
              },
            },
            select: ["view_count", "share_count", "likes", "dislikes"],
          });
        }

        if (contentType === "podcasts" || contentType === "all") {
          allPodcasts = await strapi.db.query("api::podcast.podcast").findMany({
            populate: {
              category: {
                select: ["id"],
              },
            },
            select: ["view_count", "share_count", "likes", "dislikes"],
          });
        }

        // Group content by category ID for quick lookup
        const articlesByCategory = new Map();
        const videosByCategory = new Map();
        const podcastsByCategory = new Map();

        allArticles.forEach((article) => {
          const categoryId = article.category?.id;
          if (categoryId) {
            if (!articlesByCategory.has(categoryId)) {
              articlesByCategory.set(categoryId, []);
            }
            articlesByCategory.get(categoryId).push(article);
          }
        });

        allVideos.forEach((video) => {
          const categoryId = video.category?.id;
          if (categoryId) {
            if (!videosByCategory.has(categoryId)) {
              videosByCategory.set(categoryId, []);
            }
            videosByCategory.get(categoryId).push(video);
          }
        });

        allPodcasts.forEach((podcast) => {
          const categoryId = podcast.category?.id;
          if (categoryId) {
            if (!podcastsByCategory.has(categoryId)) {
              podcastsByCategory.set(categoryId, []);
            }
            podcastsByCategory.get(categoryId).push(podcast);
          }
        });

        // Helper function to get category name in requested language
        const getCategoryNameInLanguage = (category, requestedLanguage) => {
          // Create array of all available category versions with their names and locales
          const allVersions = [
            { name: category.name, locale: category.locale },
            ...(category.localizations || []).map((loc) => ({
              name: loc.name,
              locale: loc.locale,
            })),
          ];

          // Try to find the requested language
          const requestedVersion = allVersions.find(
            (version) => version.locale === requestedLanguage
          );
          if (requestedVersion) {
            console.log(
              `Found ${requestedLanguage} version: "${requestedVersion.name}"`
            );
            return requestedVersion.name;
          }

          // Fallback: try English first
          const englishVersion = allVersions.find(
            (version) => version.locale === "en"
          );
          if (englishVersion) {
            console.log(
              `Fallback to English version: "${englishVersion.name}"`
            );
            return englishVersion.name;
          }

          // Final fallback: use the main category name
          console.log(
            `Using main category name as fallback: "${category.name}"`
          );
          return category.name;
        };

        // Calculate average rating for a whole category (any content type)
        const calculateAverageCategoryRating = (contentList) => {
          if (contentList.length === 0) return 0;

          let totalLikes = 0;
          let totalDislikes = 0;

          for (const { likes, dislikes } of contentList) {
            totalLikes += Number(likes) || 0;
            totalDislikes += Number(dislikes) || 0;
          }

          const totalReactions = totalLikes + totalDislikes;
          if (totalReactions === 0) return null;
          return 1 + 9 * (totalLikes / totalReactions);
        };

        const calculateItemEngagement = (item, type) => {
          // Get views based on content type
          let views = 0;
          if (type === "article") {
            views = item.read_count || 0;
          } else if (type === "video" || type === "podcast") {
            views = item.view_count || 0;
          }

          const downloads = Number(item.downloads) || 0;
          const shares = Number(item.share_count) || 0;
          const likes = Number(item.likes) || 0;
          const dislikes = Number(item.dislikes) || 0;

          const rawScore =
            Number(views) + downloads * 5 + shares * 3 + likes * 2 - dislikes;

          return rawScore;
        };

        const calculateCategoryEngagement = (articles, videos, podcasts) => {
          const allItems = [...articles, ...videos, ...podcasts];
          if (allItems.length === 0) return 0;

          let totalScore = 0;

          // Calculate score for each item
          articles.forEach((item) => {
            totalScore += calculateItemEngagement(item, "article");
          });

          videos.forEach((item) => {
            totalScore += calculateItemEngagement(item, "video");
          });

          podcasts.forEach((item) => {
            totalScore += calculateItemEngagement(item, "podcast");
          });

          const normalized = Math.log10(totalScore + 1) * 10;
          return normalized;
        };
        // Create a Set to track which categories we've already processed
        const processedCategoryIds = new Set();
        const allStatistics = [];

        for (const category of categories) {
          // Skip if we've already processed this category (or its localizations)
          if (processedCategoryIds.has(category.id)) {
            console.log(
              `Skipping category ${category.id} (${category.name}) - already processed`
            );
            continue;
          }

          // Get all localization IDs for this category group
          const allLocalizationIds = [
            category.id,
            ...(category.localizations || []).map((loc) => loc.id),
          ];

          console.log(allLocalizationIds);

          // Mark all related localizations as processed
          allLocalizationIds.forEach((id) => {
            processedCategoryIds.add(id);
          });

          // Get content for all localizations of this category from pre-fetched data
          const categoryArticles = [];
          const categoryVideos = [];
          const categoryPodcasts = [];

          allLocalizationIds.forEach((categoryId) => {
            if (articlesByCategory.has(categoryId)) {
              categoryArticles.push(...articlesByCategory.get(categoryId));
            }
            if (videosByCategory.has(categoryId)) {
              categoryVideos.push(...videosByCategory.get(categoryId));
            }
            if (podcastsByCategory.has(categoryId)) {
              categoryPodcasts.push(...podcastsByCategory.get(categoryId));
            }
          });

          // Get the category name in the requested language
          const categoryName = getCategoryNameInLanguage(category, language);
          const allCategoryNames = [
            category.name,
            ...(category.localizations || []).map(
              (loc) => `${loc.name} (${loc.locale})`
            ),
          ];

          const statistics = {
            categoryId: category.id,
            categoryName: categoryName,
            allLocalizedNames: allCategoryNames,
            localizationIds: allLocalizationIds,
            articles: {
              count: categoryArticles.length,
              reads: 0,
              downloads: 0,
              shares: 0,
              likes: 0,
              dislikes: 0,
            },
            videos: {
              count: categoryVideos.length,
              views: 0,
              shares: 0,
              likes: 0,
              dislikes: 0,
            },
            podcasts: {
              count: categoryPodcasts.length,
              views: 0,
              shares: 0,
              likes: 0,
              dislikes: 0,
            },
            overall: {
              content: 0,
              engagement: 0,
              shares: 0,
              likes: 0,
              dislikes: 0,
            },
          };

          const { articles, podcasts, videos } = statistics;

          // Calculate article statistics
          categoryArticles.forEach((article) => {
            articles.reads += parseInt(article.read_count || 0);
            articles.downloads += parseInt(article.download_count || 0);
            articles.shares += parseInt(article.share_count || 0);
            articles.likes += parseInt(article.likes || 0);
            articles.totalDislikes += parseInt(article.dislikes || 0);
          });

          // Calculate video statistics
          categoryVideos.forEach((video) => {
            videos.views += parseInt(video.view_count || 0);
            videos.shares += parseInt(video.share_count || 0);
            videos.likes += parseInt(video.likes || 0);
            videos.dislikes += parseInt(video.dislikes || 0);
          });

          // Calculate podcast statistics
          categoryPodcasts.forEach((podcast) => {
            podcasts.views += parseInt(podcast.view_count || 0);
            podcasts.shares += parseInt(podcast.share_count || 0);
            podcasts.likes += parseInt(podcast.likes || 0);
            podcasts.dislikes += parseInt(podcast.dislikes || 0);
          });
          console.log(videos, "videos");
          statistics.views = articles.reads + videos.views + podcasts.views;

          statistics.shares = articles.shares + videos.shares + podcasts.shares;

          statistics.downloads = articles.downloads;

          statistics.likes = articles.likes + videos.likes + podcasts.likes;

          statistics.dislikes =
            articles.dislikes + videos.dislikes + podcasts.dislikes;

          statistics.avgRating =
            calculateAverageCategoryRating([
              ...categoryArticles,
              ...categoryVideos,
              ...categoryPodcasts,
            ]) || 0;
          statistics.engagementScore =
            calculateCategoryEngagement(
              categoryArticles,
              categoryVideos,
              categoryPodcasts
            ) || 0;

          allStatistics.push(statistics);
        }

        // Sort by name descending
        allStatistics.sort((a, b) =>
          a.categoryName.localeCompare(b.categoryName)
        );

        ctx.body = {
          success: true,
          data: allStatistics,
        };
      } catch (err) {
        console.log(err);
        ctx.status = 500;
        ctx.body = { error: err.message };
      }
    },
  })
);
