import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxy = {
  target: process.env.VITE_API_BASE_URL || "http://localhost:8000",
  bypass(request) {
    if (request.headers.accept?.includes("text/html")) return "/index.html";
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/authors": apiProxy,
      "/books": apiProxy,
      "/login": apiProxy,
      "/register": apiProxy,
      "/author-accounts": apiProxy,
      "/media": apiProxy,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
