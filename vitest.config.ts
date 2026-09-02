import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Unit-test runner. Deliberately separate from the app's Vite config so tests
 * never boot the TanStack Router plugin or the Nitro server preset.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: { reporter: ["text"], include: ["src/lib/**", "src/config/**"] },
  },
});
