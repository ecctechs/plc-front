# Architecture

> อ้างอิงโค้ด ณ 16/11/2026 (branch `monorepo-backend`). เลขบรรทัดอาจเลื่อนเมื่อโค้ดเปลี่ยน

## ภาพรวม
```
Browser (Vue SPA, tab-based)
  │  fetch + Bearer JWT (src/utils/api.js)
  │  App.vue poll GET /api/dashboard/cards ทุก 2s
  ▼
Express (backend/src/app.js)
  /api/auth (public) → authenticate → injectCompanyId → checkTab/checkScope → routes
  routes → controllers → services → repositories → Sequelize → PostgreSQL
  ▲ shared module state
plcPoller.js (start ใน server.js)
  ├─ Modbus TCP socket → PLC (PLC_HOST:PLC_PORT, reconnect ทุก 5s)
  ├─ setInterval ต่อกลุ่ม refresh_rate_ms → pollGroup → dataBuffer + processAlarms()
  ├─ ทุก 2s flushBufferToDb → device_logs (bulk) + device_addresses.last_value/is_connected
  └─ ทุก 1s runOperationTime → product_logs, downtime_products, products.total_output/reject_output
Cron (node-cron): OEE hourly (:00), OEE daily (23:55), data retention (03:00 ถ้าตั้ง LOG_RETENTION_DAYS)
```

## Middleware chain (`backend/src/app.js`)
1. `authenticate` — ตรวจ JWT (`backend/middleware/auth.middleware.js`)
2. `injectCompanyId` — ตั้ง `req.companyId` และเขียนทับ `req.body.company_id` (`tenant.middleware.js`)
3. `requireTabForWrite('setting')` — GET อ่านได้ทุกคน, เขียนต้องมี tab `setting`
4. `checkTab(tab)` / `checkScope(scope)` — อ่าน `roles.tab_permissions` / `scope_permissions` (cache 5 นาที). `super_admin` ผ่านทุกอย่าง

## Workflows
| Feature | เส้นทาง |
|---|---|
| Login | `Login.vue` → `POST /api/auth/login` → JWT 8h (`id, email, role, role_id, company_id`) → localStorage `token/user/permissions` → reload |
| Polling | `startDynamicPolling` จัดกลุ่ม address ตาม `refresh_rate_ms` → `readCoils` (bit) / `readHoldingRegisters` (word) → `applyNumberConfig` (scale, offset, decimal) |
| Dashboard | `dashboard.repository.findAll(companyId)` join address/device/type/room/number/level/alarm → ส่งเป็น prop `dashboard` ให้ทุก view |
| Chart | `GET /api/devices/chart?address_id&start&end`, `/chart-by-alarm` — chart component poll เองตาม refresh rate |
| Alarm | `src/services/alarm.service.js` `processAlarms` ทุกค่าที่อ่านได้ → `device_alarm_states`; severity error/critical → `device_alarm_events` (TRIGGER/RECOVER) + `downtime_logs`; email throttle ด้วย `repeat_interval_sec` |
| PLC write | `Interaction.vue` → `POST /api/plc/write` (tab `demo` + scope `control`) → `writeSingleCoil` / `writeSingleRegister` |
| Production count | ใช้ address ของ `products[0]` ของ `POLLER_COMPANY_ID`; ค่าใน `plc_address_active` = product id; rising edge ของ complete/reject → `Product.increment` |
| OEE | `oee.service.js`: A = (planned − downtime)/planned, P = cycle_time × output / operating, Q = good/total → `oee_daily_snapshots`, `oee_hourly_snapshots` |
| Working time | `working_time.schedule` JSON ต่อวัน (working_hours, break_times) → planned/elapsed minutes |
| Demo | จำลองใน browser เท่านั้น (App.vue หยุด poll + สุ่มค่า) — ไม่ถึง backend/alarm/log |

## PLC address → Modbus (`parsePlcAddress`, `backend/plcPoller.js`)
| Prefix | Modbus | หมายเหตุ |
|---|---|---|
| M | coil 8192 + n | ตรง default FX5U |
| SM | coil 20480 + n | ตรง default FX5U |
| X, Y | coil n | ดู KNOWN_ISSUES C2 (X ควรเป็น discrete input, ฐาน 8) |
| D | holding register n | unsigned 16-bit |
| อื่นๆ | holding register n | ไม่มีการปฏิเสธ — ดู C2 |

## Database
ตารางหลัก: `companies, roles, users, user_rooms, employees, rooms, device_types, devices → device_addresses → (device_number_configs, device_level_configs, device_alarm_rules → device_alarm_states / device_alarm_events), device_logs, device_connection_logs, dashboard_cards, interaction_layouts/elements, products, product_logs, downtime_logs, downtime_products, oee_daily_snapshots, oee_hourly_snapshots, working_time`

- Schema = `backend/migrations` (Sequelize CLI), seed = `backend/seeders`
- `device_logs` index `(address_id, created_at)`; โต ≈ address × (1000/refresh_ms) แถว/วินาที และเขียนต่อแม้ PLC offline (status = 0)
- Retention ปิดเป็นค่า default — เปิดด้วย `LOG_RETENTION_DAYS`

## Environment
| ตัวแปร | ใช้ที่ |
|---|---|
| `DB_*` | `backend/config/config.js` (โหลด `backend/.env.<NODE_ENV>`) |
| `PLC_HOST`, `PLC_PORT`, `POLLER_COMPANY_ID` | `plcPoller.js` |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | auth middleware/controller (**ต้องตั้งเสมอ**) |
| `EMAIL_*` | `src/services/email.service.js` |
| `CLOUDINARY_*` | `services/cloudinary.service.js` |
| `LOG_RETENTION_DAYS` | `jobs/dataRetentionJob.js` |
| `VITE_API_BASE_URL` | frontend (`.env.production`); ว่าง = Vite proxy `/api` → 3001 |
