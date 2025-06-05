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
       * #desc    Get statistics for all categories
       */
      try {
        // Get all categories with their related content
        const categories = await strapi.db
          .query("api::category.category")
          .findMany({
            populate: {
              articles: {
                select: [
                  "read_count",
                  "download_count",
                  "share_count",
                  "likes",
                  "dislikes",
                ],
              },
              videos: {
                select: ["view_count", "share_count", "likes", "dislikes"],
              },
              podcasts: {
                select: ["view_count", "share_count", "likes", "dislikes"],
              },
            },
          });

        const allStatistics = categories.map((category) => {
          const statistics = {
            categoryId: category.id,
            categoryName: category.name,
            articles: {
              totalCount: category.articles?.length || 0,
              totalReads: 0,
              totalDownloads: 0,
              totalShares: 0,
              totalLikes: 0,
              totalDislikes: 0,
            },
            videos: {
              totalCount: category.videos?.length || 0,
              totalViews: 0,
              totalShares: 0,
              totalLikes: 0,
              totalDislikes: 0,
            },
            podcasts: {
              totalCount: category.podcasts?.length || 0,
              totalViews: 0,
              totalShares: 0,
              totalLikes: 0,
              totalDislikes: 0,
            },
            overall: {
              totalContent: 0,
              totalEngagement: 0,
              totalShares: 0,
              totalLikes: 0,
              totalDislikes: 0,
            },
          };

          // Calculate statistics for each category
          if (category.articles) {
            category.articles.forEach((article) => {
              statistics.articles.totalReads += parseInt(
                article.read_count || 0
              );
              statistics.articles.totalDownloads += parseInt(
                article.download_count || 0
              );
              statistics.articles.totalShares += parseInt(
                article.share_count || 0
              );
              statistics.articles.totalLikes += parseInt(article.likes || 0);
              statistics.articles.totalDislikes += parseInt(
                article.dislikes || 0
              );
            });
          }

          if (category.videos) {
            category.videos.forEach((video) => {
              statistics.videos.totalViews += parseInt(video.view_count || 0);
              statistics.videos.totalShares += parseInt(video.share_count || 0);
              statistics.videos.totalLikes += parseInt(video.likes || 0);
              statistics.videos.totalDislikes += parseInt(video.dislikes || 0);
            });
          }

          if (category.podcasts) {
            category.podcasts.forEach((podcast) => {
              statistics.podcasts.totalViews += parseInt(
                podcast.view_count || 0
              );
              statistics.podcasts.totalShares += parseInt(
                podcast.share_count || 0
              );
              statistics.podcasts.totalLikes += parseInt(podcast.likes || 0);
              statistics.podcasts.totalDislikes += parseInt(
                podcast.dislikes || 0
              );
            });
          }

          // Calculate overall statistics
          statistics.overall.totalContent =
            statistics.articles.totalCount +
            statistics.videos.totalCount +
            statistics.podcasts.totalCount;

          statistics.overall.totalShares =
            statistics.articles.totalShares +
            statistics.videos.totalShares +
            statistics.podcasts.totalShares;

          statistics.overall.totalLikes =
            statistics.articles.totalLikes +
            statistics.videos.totalLikes +
            statistics.podcasts.totalLikes;

          statistics.overall.totalDislikes =
            statistics.articles.totalDislikes +
            statistics.videos.totalDislikes +
            statistics.podcasts.totalDislikes;

          statistics.overall.totalEngagement =
            statistics.articles.totalReads +
            statistics.articles.totalDownloads +
            statistics.videos.totalViews +
            statistics.podcasts.totalViews +
            statistics.overall.totalShares +
            statistics.overall.totalLikes +
            statistics.overall.totalDislikes;

          return statistics;
        });

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
