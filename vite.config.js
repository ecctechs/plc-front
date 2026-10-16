import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  define: { __VUE_PROD_DEVTOOLS__: true },
  server: {
    watch: { ignored: ["**/backend/**"] },
    // dev: เรียก /api ที่ Vite แล้วส่งต่อไป backend (ไม่ต้องใส่ URL เต็ม / ไม่ติด CORS)
    proxy: {
      "/api": process.env.API_PROXY_TARGET || "http://localhost:3001",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["e2e/**", "node_modules/**", ".kilo/**", "backend/**"],
    server: {
      deps: {
        inline: [/@csstools/, /@asamuzakjp/],
      },
    },
    coverage: {
      reporter: ["text"],
      reportOnFailure: true,
    },
  },
});