const { defineConfig } = require("@playwright/test");

const serverCommand = process.platform === "win32"
  ? "set NO_OPEN=1&& node server.js"
  : "NO_OPEN=1 node server.js";

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5500",
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: serverCommand,
    url: "http://127.0.0.1:5500",
    reuseExistingServer: !process.env.CI,
  },
});
