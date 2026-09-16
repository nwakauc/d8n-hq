import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(env.npm_package_version ?? "0.0.1"),
    },
    server: {
      host: "localhost",
      port: 5183,
      strictPort: true,
      // Unlike the per-brand consumer apps, this app is NOT same-origin with
      // its API: it talks to each brand's own API host directly (see
      // src/lib/brands.ts) over CORS, using a Bearer token per brand — no
      // dev proxy needed or wanted here. See HQ-EXTRACTION-PLAN.md.
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      restoreMocks: true,
    },
  };
});
