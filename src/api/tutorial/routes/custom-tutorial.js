module.exports = {
  routes: [
    {
      method: "GET",
      path: "/tutorials/find",
      handler: "tutorial.customFind",
      config: {
        auth: false,
      },
    },
  ],
};
