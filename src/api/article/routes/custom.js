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
      method: "GET",
      path: "/articles/getArticleLocales/:id",
      handler: "article.getArticleLocales",
      config: {
        auth: false,
      },
    },
  ],
};
