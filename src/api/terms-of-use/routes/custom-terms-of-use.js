module.exports = {
  routes: [
    {
      method: "GET",
      path: "/terms-of-uses/find",
      handler: "terms-of-use.customFind",
      config: {
        auth: false,
      },
    },
  ],
};
