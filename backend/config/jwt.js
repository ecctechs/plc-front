'use strict';

// รหัสลับสำหรับเซ็น / ตรวจ token ต้องมาจาก .env เท่านั้น
// เดิมมีค่าสำรองเขียนไว้ในโค้ด ถ้าลืมตั้ง ใครรู้ค่านั้นก็ปลอม token (รวมถึง super_admin) ได้
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('ยังไม่ได้ตั้ง JWT_SECRET ใน .env ของ backend — ตั้งค่าก่อนเริ่ม server (ดูตัวอย่างใน backend/.env.example)');
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h'
};
