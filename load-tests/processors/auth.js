const { faker } = require("@faker-js/faker");

module.exports = {
  // Generate random search terms
  generateSearchTerm: (context, events, done) => {
    const searchTerms = [
      "dress",
      "shirt",
      "jeans",
      "shoes",
      "jacket",
      "bag",
      "hat",
      "sweater",
      "skirt",
      "pants",
      "shorts",
      "boots",
      "sneakers",
      "coat",
      "blouse",
      "top",
      "cardigan",
      "hoodie",
      "scarf",
    ];
    context.vars.searchTerm = faker.helpers.arrayElement(searchTerms);
    return done();
  },

  // Generate random product data for cart
  generateCartData: (context, events, done) => {
    context.vars.productId = faker.number.int({ min: 1, max: 50 });
    context.vars.sizeId = faker.number.int({ min: 1, max: 10 });
    context.vars.quantity = faker.number.int({ min: 1, max: 3 });
    return done();
  },

  // Generate checkout data
  generateCheckoutData: (context, events, done) => {
    context.vars.shippingAddress = {
      name: faker.person.fullName(),
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      postalCode: faker.location.zipCode(),
      country: "UK",
    };
    return done();
  },

  // Log performance metrics
  logMetrics: (requestParams, response, context, ee, next) => {
    const responseTime = response.timings ? response.timings.phases.total : 0;

    if (responseTime > 1000) {
      console.log(`Slow response: ${requestParams.url} took ${responseTime}ms`);
    }

    if (response.statusCode >= 400) {
      console.log(
        `Error response: ${requestParams.url} returned ${response.statusCode}`
      );
    }

    return next();
  },

  // Check response times
  checkResponseTime: (requestParams, response, context, ee, next) => {
    const responseTime = response.timings ? response.timings.phases.total : 0;

    // Set SLA thresholds
    const thresholds = {
      "/api/health": 200,
      "/api/products": 500,
      "/api/search": 800,
      "/api/cart": 300,
      "/api/checkout": 1000,
    };

    const endpoint = requestParams.url.replace("http://localhost:3000", "");
    const threshold = thresholds[endpoint] || 1000;

    if (responseTime > threshold) {
      ee.emit("customStat", "sla_violation", 1);
      console.log(
        `SLA violation: ${endpoint} took ${responseTime}ms (threshold: ${threshold}ms)`
      );
    }

    return next();
  },
};
