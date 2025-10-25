module.exports = {
  routes: [
    {
      method: "GET",
      path: "/podcasts/available-locales/:id",
      handler: "podcast.getPodcastLocales",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/podcasts/addViewCount/:id",
      handler: "podcast.addViewCount",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/podcasts/addShareCount/:id",
      handler: "podcast.addShareCount",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/podcasts/addRating/:id",
      handler: "podcast.addRating",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/podcasts/custom/category-ids",
      handler: "podcast.getPodcastCategoryIds",
      config: {
        auth: false,
      },
    },
  ],
};
