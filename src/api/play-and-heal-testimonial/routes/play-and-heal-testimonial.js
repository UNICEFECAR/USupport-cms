"use strict";

/**
 * play-and-heal-testimonial router
 *
 * Read-only and public: the website lists published testimonials.
 * Creating and editing happens in the admin panel.
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter(
  "api::play-and-heal-testimonial.play-and-heal-testimonial",
  {
    only: ["find"],
    config: {
      find: {
        auth: false,
      },
    },
  }
);
