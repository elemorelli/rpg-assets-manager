import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["src/web/vitest.setup.ts"],
    include: [
      "src/**/__tests__/**/*.test.ts",
      "scripts/**/__tests__/**/*.test.ts",
      "src/web/**/*.test.tsx",
      "src/web/**/*.test.ts",
    ],
    // Integration tests share one real Postgres instance; parallel files can race on it.
    fileParallelism: false,
  },
});
