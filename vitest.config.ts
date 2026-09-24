import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    // Unit tests must never open reps.db: point any accidental import
    // at a path that does not exist, so it fails loudly instead.
    env: { REPS_DB_PATH: path.resolve(__dirname, ".vitest-no-db/reps.db") },
  },
});
