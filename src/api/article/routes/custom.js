module.exports = {
  routes: [
    {
      method: "GET",
      path: "/articles/locales/mapping",
      handler: "article.getArticlesLocalesMapping",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/articles/addReadCount/:id",
      handler: "article.addReadCount",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/articles/addDownloadCount/:id",
      handler: "article.addDownloadCount",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/articles/addShareCount/:id",
      handler: "article.addShareCount",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/articles/addRating/:id",
      handler: "article.addRating",
      config: {
        auth: false,
      },
    },

    {
      method: "GET",
      path: "/articles/getArticleLocales/:id",
      handler: "article.getArticleLocales",
      config: {
        auth: false,
      },
    },
  ],
};
