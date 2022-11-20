module.exports = {
  routes: [
    {
      method: "GET",
      path: "/faqs/available-locales/:id",
      handler: "faq.getFAQAvailableLocales",
      config: {
        auth: false,
      },
    },
  ],
};
