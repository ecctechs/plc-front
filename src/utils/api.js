// ค่ากลางสำหรับเรียก backend ทุกหน้า
// dev: VITE_API_BASE_URL ว่าง → ใช้ path /api ผ่าน Vite proxy (vite.config.js)
// prod: VITE_API_BASE_URL = URL เต็มของ backend
export const BASE_API = import.meta.env.VITE_API_BASE_URL || "";

// header Authorization — ไม่ส่งเลยถ้ายังไม่มี token (กัน "Bearer null")
export const authH = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
