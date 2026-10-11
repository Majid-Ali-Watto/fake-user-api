import { defineConfig } from "vitest/config";

// Vercel runs builds with NODE_ENV=production, which makes Vite treat the jsdom suites as browser
// code and break their Node imports. Tests must always run in test mode.
process.env.NODE_ENV = "test";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    // Each test file gets its own module registry, so every file starts with fresh in-memory data.
    env: { NODE_ENV: "test", JWT_SECRET: "test-secret", DISABLE_RATE_LIMIT: "1" },
  },
});
