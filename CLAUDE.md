# CLAUDE.md

PLC Web Dashboard — monitoring / alarm / OEE สำหรับ PLC Mitsubishi FX5U ผ่าน Modbus TCP

- Frontend (root): Vue 3 **Options API** + Vite, ไม่มี router (สลับ tab ใน `src/App.vue`)
- Backend (`backend/`): Express 5 + Sequelize + PostgreSQL (CommonJS), port 3001
- Poller PLC + cron jobs รันใน process เดียวกับ API (`backend/src/server.js`)

## เอกสาร
- Conventions, คำสั่งรัน, tab, API helper: [.github/copilot-instructions.md](.github/copilot-instructions.md) — **อ่านก่อนแก้โค้ด**
- Architecture / data flow: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- ปัญหาที่รู้แล้ว + decision log: [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)
- BUG ฝั่ง UI ที่ค้าง: [docs/deleted-bug-tests.md](docs/deleted-bug-tests.md)

## คำสั่งหลัก
```bash
npm install && npm run dev:setup && npm run seed:dev   # ครั้งแรก
npm run dev        # backend 3001 + Vite 5173
npm test           # Vitest
npm run test:e2e   # Playwright (API mock)
```

## จุดที่ต้องระวังเป็นพิเศษ
- `backend/plcPoller.js` — หัวใจระบบ: Modbus socket เดียว, polling, buffer → DB, นับยอดผลิต. แก้แล้วต้องคิดถึงตอน PLC offline/reconnect
- `POST /api/plc/write` สั่งเครื่องจักรจริง — ห้ามเปลี่ยนพฤติกรรมโดยไม่ยืนยันกับผู้ใช้
- การ map PLC address → Modbus อยู่ที่ `parsePlcAddress` (M=8192, SM=20480, D=holding 0) — ดู KNOWN_ISSUES C2
- ทุก query ข้อมูลต้องกรองด้วย `req.companyId` (multi-tenant) — ใช้ pattern `verify*Ownership` ใน `backend/services/deviceAlarm.service.js`
- Secret ต้องมาจาก env เท่านั้น ห้าม hardcode fallback

## Conventions สรุป
- เรียก API ผ่าน `BASE_API` / `authH()` จาก `src/utils/api.js` เท่านั้น
- ข้อความผ่าน `locale.t()` และเพิ่ม key ทั้ง `th.json` และ `en.json`
- แจ้งผู้ใช้ด้วย `showAlert` / `showConfirm` (`src/utils/swalHelper.js`)
- Comment ภาษาไทย, relative import, npm เท่านั้น
- Backend: route → controller → service → repository
