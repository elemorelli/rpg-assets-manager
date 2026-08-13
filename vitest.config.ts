import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "scripts/**/__tests__/**/*.test.ts"],
    // Integration tests share one real Postgres instance; parallel files can race on it.
    fileParallelism: false,
  },
});
