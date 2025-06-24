module.exports = {
  routes: [
    {
      method: "GET",
      path: "/videos/available-locales/:id",
      handler: "video.getVideoLocales",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/videos/addViewCount/:id",
      handler: "video.addViewCount",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/videos/addRating/:id",
      handler: "video.addRating",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/videos/addShareCount/:id",
      handler: "video.addShareCount",
      config: {
        auth: false,
      },
    },
  ],
};
