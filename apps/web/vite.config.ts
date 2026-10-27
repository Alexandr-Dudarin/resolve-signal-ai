import { fileURLToPath, URL } from "node:url";
import { loadEnv } from "vite";
import { parseWebEnv } from "./src/shared/config/parse-web-env";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode, command }) => {
  parseWebEnv({ ...loadEnv(mode, "../../", "VITE_"), PROD: command === "build" });
  return {
  plugins: [react()],
  envDir: "../../",
  server: { proxy: { "/api": { target: "http://localhost:4000", changeOrigin: true } } },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    css: true,
  },
  };
});
