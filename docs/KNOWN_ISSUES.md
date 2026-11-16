# Known Issues

> จาก Deep Discovery 16/11/2026 — วิเคราะห์จากโค้ด ยังไม่ได้รันยืนยันทุกข้อ
> สถานะ: `open` / `confirmed` / `fixed` / `wontfix` — อัปเดตเมื่อแก้

## Security
| ID | ปัญหา | ที่อยู่ | สถานะ |
|---|---|---|---|
| S1 | SMTP credentials จริงเป็น hardcoded fallback และอยู่ใน git history — ต้อง rotate password แล้วลบ fallback | `backend/src/services/email.service.js` | open |
| S2 | JWT secret มี fallback ค่าคงที่ และไม่อยู่ใน `.env.example` → ถ้าไม่ตั้ง ปลอม token `super_admin` ได้ | `backend/middleware/auth.middleware.js`, `backend/controllers/auth.controller.js` | open |
| S3 | ไม่ตรวจ `company_id` (cross-tenant): update/delete dashboard card, create interaction element, level/number config | `dashboard.service.js`, `interactionLayout.service.js`, `deviceLevelConfig/deviceNumberConfig.controller.js` | open |
| S4 | `/api/plc/write` เขียน address ใดก็ได้ ไม่ผูกกับ address/ห้องที่ user มีสิทธิ์ ไม่มี audit log | `backend/controllers/plc.controller.js` | open |
| S5 | Seeder มีรหัสผ่าน default — ต้องเปลี่ยนหลัง seed ทุกครั้ง | `backend/seeders/*` | open |

## Correctness
| ID | ปัญหา | ที่อยู่ | สถานะ |
|---|---|---|---|
| C1 | `logDowntimeEvent(deviceId, 'START', rule.name, addressId)` ส่ง argument ผิดตำแหน่ง (signature: `deviceId, eventType, companyId, reason, addressId`) → query error → transaction rollback → alarm severity error/critical ไม่ถูกบันทึก/ไม่ส่ง email; error ถูกกลืนด้วย `.catch(() => {})` | `backend/src/services/alarm.service.js` (2 จุด), `backend/plcPoller.js` pollGroup | open — ตรวจได้จาก `device_alarm_events` |
| C2 | Modbus mapping: X/Y ใช้ coil เดียวกัน, X ควรใช้ discrete input (FC02), X/Y ของ FX5U เป็นฐาน 8, prefix ไม่รู้จักอ่าน D เงียบๆ, D อ่าน unsigned 16-bit, ไม่รองรับ 32-bit | `backend/plcPoller.js` `parsePlcAddress`, `readModbusValue` | open — ต้องยืนยันกับ GX Works3 |
| C3 | OEE baseline ใช้ยอด *รายวัน* ของเมื่อวานลบจาก counter *สะสม* → ยอดเกินจริงตั้งแต่วันที่ 3; ไม่มี snapshot = baseline 0 | `backend/services/oee.service.js` `getTodayOutput` | open — ต้องตัดสินใจวิธีแก้ |
| C4 | Cron ไม่กำหนด timezone; production ลบ 7 ชม. แบบ hardcode | `backend/jobs/*.js`, `backend/services/device.service.js` `getLogsByAddressAndDate` | open |
| C5 | นับยอดแบบ sampling 1s (pulse < 1s หาย); ใช้ address ของ `products[0]` และบริษัทเดียว แต่ poll address ทุกบริษัทไปที่ PLC ตัวเดียว | `backend/plcPoller.js` | open |
| C6 | `duration_sec` ของ alarm ไม่ถูกใช้ (ไม่มี debounce) | `alarm.service.js` | open |
| C7 | Dashboard cards อ่านทั้งบริษัท แต่ position/duplicate check เป็นราย user | `dashboard.repository.js`, `dashboard.controller.js` | open |

## Performance / Stability
| ID | ปัญหา | สถานะ |
|---|---|---|
| P1 | `processAlarms` query DB ทุก address ทุกรอบ, fire-and-forget ไม่จำกัด concurrency → อาจ TRIGGER ซ้ำเมื่อ DB ช้า | open |
| P2 | ทุก browser query join หนักทุก 2s + chart poll แยก + Oee 3 timers | open |
| P3 | เขียน log ทุกรอบแม้ PLC offline; retention ปิดเป็น default | open |
| P4 | API + poller + cron ใน process เดียว — scale หลาย instance ไม่ได้ (Modbus ซ้อน) | open (ยอมรับได้ตอนนี้) |
| P5 | ข้อความ buffer overflow คำนวณจำนวนผิด | open (minor) |

## Maintainability
- Dead code / deps: `src/views/Register.vue` (ไม่ถูกใช้), `src/im` (ไฟล์ว่าง), `backend/poll.js`, deps `axios`, `nodes7`, `modbus-serial`
- Frontend ให้ role `admin` full access แต่ backend bypass เฉพาะ `super_admin`
- Error format ไม่สม่ำเสมอ (`throw {status, message}` vs `new Error`)
- ไม่มี CI / deployment script ใน repo

## Open Questions
- Production backend รันที่ไหน (`.env.production` ชี้ Render แต่ PLC อยู่ LAN)?
- ตาราง Modbus device assignment จริงใน GX Works3, ใช้ T/C/32-bit หรือไม่?
- จำนวนบริษัท / PLC / address / refresh rate ที่ใช้งานจริง

## Decision Log
| วันที่ | การตัดสินใจ | เหตุผล |
|---|---|---|
| | | |
