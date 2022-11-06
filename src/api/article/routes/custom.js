module.exports = {
  routes: [
    {
      method: "PUT",
      path: "/articles/addReadCount/:id",
      handler: "article.addReadCount",
      config: {
        auth: false,
      },
    },
  ],
};
