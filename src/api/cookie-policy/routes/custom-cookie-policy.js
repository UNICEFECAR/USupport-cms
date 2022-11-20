module.exports = {
  routes: [
    {
      method: "GET",
      path: "/policy-cookies/find",
      handler: "cookie-policy.customFind",
      config: {
        auth: false,
      },
    },
  ],
};
