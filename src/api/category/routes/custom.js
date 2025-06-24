module.exports = {
  routes: [
    {
      method: "GET",
      path: "/category-statistics/all",
      handler: "category.getAllCategoriesStatistics",
      config: {
        auth: false,
      },
    },
  ],
};
