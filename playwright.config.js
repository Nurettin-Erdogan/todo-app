const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  globalSetup: require.resolve("./tests/global-setup"),
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5500",
    browserName: "chromium",
    headless: true,
    serviceWorkers: "block",
  },
});
