import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const proxy = {
  "/api": {
    target: "https://studio.genlayer.com",
    changeOrigin: true,
    secure: true,
  },
};

export default defineConfig({
  plugins: [vue()],
  server: { proxy },
  preview: { proxy },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.js"],
  },
});
