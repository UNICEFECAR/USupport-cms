module.exports = {
  routes: [
    {
      method: "GET",
      path: "/hosn-assets/available-locales/:id",
      handler: "hosn-asset.getLocales",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/hosn-assets/addViewCount/:id",
      handler: "hosn-asset.addViewCount",
      config: {
        auth: false,
      },
    },
    {
      method: "PUT",
      path: "/hosn-assets/addDownloadCount/:id",
      handler: "hosn-asset.addDownloadCount",
      config: {
        auth: false,
      },
    },
  ],
};
