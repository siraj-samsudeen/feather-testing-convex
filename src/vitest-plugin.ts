import { createRequire } from "node:module";

/**
 * Vite plugin that resolves the internal @convex-dev/auth import used by
 * ConvexTestAuthProvider. Add this to your vitest.config.ts plugins array
 * so you don't need a manual resolve.alias entry.
 *
 * @example
 * ```ts
 * import { convexTestProviderPlugin } from "convex-test-provider/vitest-plugin";
 *
 * export default defineConfig({
 *   plugins: [convexTestProviderPlugin()],
 * });
 * ```
 */
export function convexTestProviderPlugin() {
  const require = createRequire(import.meta.url);
  const resolved = require.resolve(
    "@convex-dev/auth/dist/react/client.js",
  );

  return {
    name: "convex-test-provider",
    config() {
      return {
        resolve: {
          alias: {
            "@convex-dev/auth/dist/react/client.js": resolved,
          },
        },
      };
    },
  };
}
