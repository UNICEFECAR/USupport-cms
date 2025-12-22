"use strict";

const fetch = require("node-fetch");

const API_URL = process.env.API_URL;
const API_ENDPOINT = `${API_URL}/user`;

/**
 * Helper function to fetch content engagements from user service
 */
const fetchCountryContentEngagements = async ({
  country,
  language,
  contentType,
  sex,
  yearOfBirth,
  urbanRural,
  startDate,
  endDate,
}) => {
  try {
    const queryParams = new URLSearchParams();
    if (contentType) queryParams.append("contentType", contentType);
    if (sex) queryParams.append("sex", sex);
    if (yearOfBirth) queryParams.append("yearOfBirth", yearOfBirth);
    if (urbanRural) queryParams.append("urbanRural", urbanRural);
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);

    const response = await fetch(
      `${API_ENDPOINT}/country-content-engagements?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-country-alpha-2": country,
          "x-language-alpha-2": language,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    return result || [];
  } catch (error) {
    console.error("Error fetching country content engagements:", error);
    return [];
  }
};

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
        const country = headers["x-country-alpha-2"];
        const contentType = ctx.query.contentType;
        const sex = ctx.query.sex;
        const yearOfBirth = ctx.query.yearOfBirth;
        const urbanRural = ctx.query.urbanRural;
        const startDate = ctx.query.startDate;
        const endDate = ctx.query.endDate;

        // Check if startDate exists and is before November 5th, 2025
        const shouldAddLegacyViews =
          !startDate ||
          (startDate && new Date(startDate) < new Date("2025-11-05"));

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

        // Fetch content engagements from user service
        const contentEngagements = await fetchCountryContentEngagements({
          country,
          language,
          contentType,
          sex,
          yearOfBirth,
          urbanRural,
          startDate,
          endDate,
        });

        // Process engagements to count all engagement metrics per content item
        const contentMetrics = new Map();
        contentEngagements.forEach((engagement) => {
          const key = `${engagement.content_type}_${engagement.content_id}`;
          if (!contentMetrics.has(key)) {
            contentMetrics.set(key, {
              likes: 0,
              dislikes: 0,
              views: 0,
              downloads: 0,
              shares: 0,
            });
          }
          const metrics = contentMetrics.get(key);
          if (engagement.action === "like") {
            metrics.likes += 1;
          } else if (engagement.action === "dislike") {
            metrics.dislikes += 1;
          } else if (engagement.action === "view") {
            metrics.views += 1;
          } else if (engagement.action === "download") {
            metrics.downloads += 1;
          } else if (engagement.action === "share") {
            metrics.shares += 1;
          }
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
            select: ["id"],
          });

          // Add engagement metrics from engagements data
          allArticles = allArticles.map((article) => {
            const metrics = contentMetrics.get(`article_${article.id}`) || {
              likes: 0,
              dislikes: 0,
              views: 0,
              downloads: 0,
              shares: 0,
            };
            return {
              ...article,
              likes: metrics.likes,
              dislikes: metrics.dislikes,
              read_count: metrics.views,
              download_count: metrics.downloads,
              share_count: metrics.shares,
            };
          });
        }

        if (contentType === "videos" || contentType === "all") {
          allVideos = await strapi.db.query("api::video.video").findMany({
            populate: {
              category: {
                select: ["id"],
              },
            },
            select: ["id"],
          });

          // Add engagement metrics from engagements data
          allVideos = allVideos.map((video) => {
            const metrics = contentMetrics.get(`video_${video.id}`) || {
              likes: 0,
              dislikes: 0,
              views: 0,
              downloads: 0,
              shares: 0,
            };
            return {
              ...video,
              likes: metrics.likes,
              dislikes: metrics.dislikes,
              view_count: metrics.views,
              share_count: metrics.shares,
            };
          });
        }

        if (contentType === "podcasts" || contentType === "all") {
          allPodcasts = await strapi.db.query("api::podcast.podcast").findMany({
            populate: {
              category: {
                select: ["id"],
              },
            },
            select: ["id"],
          });

          // Add engagement metrics from engagements data
          allPodcasts = allPodcasts.map((podcast) => {
            const metrics = contentMetrics.get(`podcast_${podcast.id}`) || {
              likes: 0,
              dislikes: 0,
              views: 0,
              downloads: 0,
              shares: 0,
            };
            return {
              ...podcast,
              likes: metrics.likes,
              dislikes: metrics.dislikes,
              view_count: metrics.views,
              share_count: metrics.shares,
            };
          });
        }

        // Group content by category ID for quick lookup
        const articlesByCategory = new Map();
        const videosByCategory = new Map();
        const podcastsByCategory = new Map();

        allArticles.forEach((article) => {
          const categoryId = article.category?.id;
          const engagements = contentMetrics.get(`article_${article.id}`) || {
            likes: 0,
            dislikes: 0,
            views: 0,
            downloads: 0,
            shares: 0,
          };

          if (categoryId) {
            if (!articlesByCategory.has(categoryId)) {
              articlesByCategory.set(categoryId, []);
            }
            articlesByCategory.get(categoryId).push({
              ...article,
              ...engagements,
            });
          }
        });

        allVideos.forEach((video) => {
          const categoryId = video.category?.id;
          const engagements = contentMetrics.get(`video_${video.id}`) || {
            likes: 0,
            dislikes: 0,
            views: 0,
            downloads: 0,
            shares: 0,
          };
          if (categoryId) {
            if (!videosByCategory.has(categoryId)) {
              videosByCategory.set(categoryId, []);
            }
            videosByCategory.get(categoryId).push({
              ...video,
              ...engagements,
            });
          }
        });

        allPodcasts.forEach((podcast) => {
          const categoryId = podcast.category?.id;
          const engagements = contentMetrics.get(`podcast_${podcast.id}`) || {
            likes: 0,
            dislikes: 0,
            views: 0,
            downloads: 0,
            shares: 0,
          };
          if (categoryId) {
            if (!podcastsByCategory.has(categoryId)) {
              podcastsByCategory.set(categoryId, []);
            }
            podcastsByCategory.get(categoryId).push({
              ...podcast,
              ...engagements,
            });
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
            // console.log(
            //   `Found ${requestedLanguage} version: "${requestedVersion.name}"`
            // );
            return requestedVersion.name;
          }

          // Fallback: try English first
          const englishVersion = allVersions.find(
            (version) => version.locale === "en"
          );
          if (englishVersion) {
            // console.log(
            //   `Fallback to English version: "${englishVersion.name}"`
            // );
            return englishVersion.name;
          }

          // Final fallback: use the main category name
          // console.log(
          //   `Using main category name as fallback: "${category.name}"`
          // );
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
        let allStatistics = [];

        for (const category of categories) {
          // Skip if we've already processed this category (or its localizations)
          if (processedCategoryIds.has(category.id)) {
            // console.log(
            //   `Skipping category ${category.id} (${category.name}) - already processed`
            // );
            continue;
          }

          // Get all localization IDs for this category group
          const allLocalizationIds = [
            category.id,
            ...(category.localizations || []).map((loc) => loc.id),
          ];

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
              views: 0,
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
            articles.views += parseInt(article.views || 0);
            if (shouldAddLegacyViews) {
              articles.views += parseInt(article.read_count || 0);
            }
            articles.downloads += parseInt(article.downloads || 0);
            articles.shares += parseInt(article.shares || 0);
            articles.likes += parseInt(article.likes || 0);
            articles.dislikes += parseInt(article.dislikes || 0);
          });

          // Calculate video statistics
          categoryVideos.forEach((video) => {
            videos.views += parseInt(video.views || 0);
            if (shouldAddLegacyViews) {
              videos.views += parseInt(video.view_count || 0);
            }
            videos.shares += parseInt(video.shares || 0);
            videos.likes += parseInt(video.likes || 0);
            videos.dislikes += parseInt(video.dislikes || 0);
          });

          // Calculate podcast statistics
          categoryPodcasts.forEach((podcast) => {
            podcasts.views += parseInt(podcast.views || 0);
            if (shouldAddLegacyViews) {
              podcasts.views += parseInt(podcast.view_count || 0);
            }
            podcasts.shares += parseInt(podcast.shares || 0);
            podcasts.likes += parseInt(podcast.likes || 0);
            podcasts.dislikes += parseInt(podcast.dislikes || 0);
          });

          statistics.views = articles.views + videos.views + podcasts.views;

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

        // check if category has no content
        allStatistics.forEach((category) => {
          if (
            category.articles.count === 0 &&
            category.videos.count === 0 &&
            category.podcasts.count === 0
          ) {
            category.hasContent = false;
          } else {
            category.hasContent = true;
          }
        });

        // Sort by name descending
        allStatistics = allStatistics
          .filter((category) => category.hasContent)
          .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

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
