module.exports = {
  routes: [
    {
      method: "GET",
      path: "/about-us-pages/find",
      handler: "about-us-page.customFind",
      config: {
        auth: false,
      },
    },
  ],
};
