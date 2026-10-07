module.exports = {
  routes: [
    {
      method: "GET",
      path: "/hosn-bundles/available-locales/:id",
      handler: "hosn-bundle.getLocales",
      config: {
        auth: false,
      },
    },
  ],
};
