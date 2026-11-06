import { readFileSync } from "node:fs";
import { test as base, expect } from "@playwright/test";

// หน้าเว็บโหลด Bootstrap / Font Awesome / Google Fonts จาก CDN (index.html)
// ถ้าทุกเทสต์โหลดจากเน็ตจริง page.goto จะ timeout เป็นบางครั้ง → ใช้ไฟล์จาก node_modules แทน
const LOCAL_FILES = [
  [/bootstrap\.min\.css/, "node_modules/bootstrap/dist/css/bootstrap.min.css", "text/css"],
  [/bootstrap\.bundle\.min\.js/, "node_modules/bootstrap/dist/js/bootstrap.bundle.min.js", "text/javascript"],
  [/font-awesome.*all\.min\.css/, "node_modules/@fortawesome/fontawesome-free/css/all.min.css", "text/css"],
];
const EXTERNAL = /^https:\/\/(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

export const test = base.extend({
  offlineCdn: [
    async ({ context }, use) => {
      await context.route(EXTERNAL, (route) => {
        const url = route.request().url();
        const local = LOCAL_FILES.find(([pattern]) => pattern.test(url));
        if (!local) return route.abort();
        return route.fulfill({ body: readFileSync(local[1]), contentType: local[2] });
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect };
