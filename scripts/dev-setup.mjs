// npm run dev:setup — เตรียมเครื่องสำหรับ dev ครั้งแรก
// 1) มี backend/.env.development  2) ต่อ PostgreSQL ได้  3) migrate DB
import { existsSync, copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import path from "node:path";

const backendDir = path.resolve("backend");
const envFile = path.join(backendDir, ".env.development");
const exampleFile = path.join(backendDir, ".env.example");

if (!existsSync(envFile)) {
  copyFileSync(exampleFile, envFile);
  console.error(`สร้าง ${path.relative(".", envFile)} จาก .env.example แล้ว — ใส่ค่า DB_NAME / DB_USER / DB_PASS แล้วรันใหม่`);
  process.exit(1);
}

// ใช้ dependency ของ backend (dotenv, pg)
const requireBackend = createRequire(path.join(backendDir, "package.json"));
requireBackend("dotenv").config({ path: envFile, quiet: true });
const { Client } = requireBackend("pg");

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  connectionTimeoutMillis: 5000,
});

try {
  await client.connect();
  await client.end();
  console.log(`✓ ต่อ PostgreSQL ได้ (${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME})`);
} catch (err) {
  console.error(`✗ ต่อ PostgreSQL ไม่ได้: ${err.message}`);
  console.error("  ตรวจว่า PostgreSQL เปิดอยู่ และค่าใน backend/.env.development ถูกต้อง");
  process.exit(1);
}

execSync("npm --prefix backend run migrate:dev", { stdio: "inherit" });
console.log("✓ migrate เสร็จ — ถ้าเป็น DB ใหม่ให้รัน npm run seed:dev ต่อ แล้ว npm run dev");
