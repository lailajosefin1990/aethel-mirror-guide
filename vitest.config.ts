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
        // Global: enforce a floor that rises as tests are added
        lines: 5,
        functions: 10,
        branches: 20,
        statements: 5,
        // Critical files: enforce 70%+ coverage on tested modules
        "src/context/appReducer.ts": {
          lines: 70,
          functions: 70,
          branches: 50,
          statements: 70,
        },
        "src/lib/analytics.ts": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
        "src/lib/reading.ts": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
