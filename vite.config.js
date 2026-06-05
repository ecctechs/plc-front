import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  define: { __VUE_PROD_DEVTOOLS__: true },
  test: {
    environment: "node",   // จำลอง DOM ให้ component เทสต์ได้
    globals: true,          // ใช้ describe/it/expect ได้โดยไม่ต้อง import
  },
});