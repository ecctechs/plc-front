import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  define: { __VUE_PROD_DEVTOOLS__: true },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["e2e/**", "node_modules/**", ".kilo/**"],
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