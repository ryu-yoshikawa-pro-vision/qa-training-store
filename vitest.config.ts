import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@app": path.resolve(__dirname, "app"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    restoreMocks: true,
    clearMocks: true,
    unstubGlobals: true,
    exclude: [...configDefaults.exclude, "**/.artifacts/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
    },
  },
});
