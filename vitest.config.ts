import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { convexTestProviderPlugin } from "./src/vitest-plugin";

export default defineConfig({
  plugins: [react(), convexTestProviderPlugin()],
  test: {
    environment: "jsdom",
    server: { deps: { inline: ["convex-test"] } },
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
