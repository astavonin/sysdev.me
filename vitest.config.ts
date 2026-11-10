import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Playwright owns tests/*.spec.ts; vitest owns tests/unit.
    include: ["tests/unit/**/*.test.ts"],
    // Pinned west of UTC: the permalink helpers must stay UTC-based, and a
    // local-time rewrite is invisible on a UTC (CI) or UTC+6 (author) host.
    env: { TZ: "America/New_York" },
  },
});
