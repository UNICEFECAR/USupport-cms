module.exports = {
  routes: [
    {
      method: "GET",
      path: "/sos-centers/available-locales/:id",
      handler: "sos-center.getSOSCenterAvailableLocales",
      config: {
        auth: false,
      },
    },
  ],
};
