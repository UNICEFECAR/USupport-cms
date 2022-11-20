module.exports = {
  routes: [
    {
      method: "GET",
      path: "/privacy-policies/find",
      handler: "privacy-policy.customFind",
      config: {
        auth: false,
      },
    },
  ],
};
