import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/components/ui/**",
        "src/vite-env.d.ts",
        "src/main.tsx",
        "src/App.css",
      ],
      thresholds: {
        // Global floor — raise as component tests are added
        // Current: ~7% lines. Target path: 7 → 20 → 35 → 50
        lines: 6,
        functions: 14,
        branches: 40,
        statements: 6,
        // Covered files: locked at 100% — any regression fails CI
        "src/context/appReducer.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "src/lib/analytics.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "src/lib/reading.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "src/lib/utils.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
        "src/lib/stripe.ts": {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
