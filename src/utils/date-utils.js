/**
 * แปลงวันที่ให้แสดงผลเป็น พ.ศ. พร้อมรูปแบบ DD/MM/YYYY hh:mm A
 */
const toValidDate = (date) => {
  if (!date) return null; // เดิมถือว่า 0 / "" / null = ไม่มีวันที่
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatThaiYear = (date) => {
  const d = toValidDate(date);
  if (!d) return "";
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const yearBE = d.getFullYear() + 543;

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');

  return `${day}/${month}/${yearBE} ${strHours}:${minutes} ${ampm}`;
};

/**
 * แปลงวันที่เป็นรูปแบบ ISO (YYYY-MM-DDTHH:mm) สำหรับส่งเข้า API หรือ Chart
 */
export const formatISO = (date) => {
  const d = toValidDate(date);
  if (!d) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * บวก 7 ชั่วโมงเข้า timestamp เพื่อแสดงผลเป็น UTC+7 บน Chart
 * ใช้เฉพาะตอน render — ไม่กระทบ logic การ deduplication (lastFetchTime)
 */
export const toUTC7 = (date) => {
  const d = toValidDate(date);
  // วันที่ไม่ถูกต้อง → Invalid Date (เดิมได้ปี 1970 เพราะ null = 0)
  if (!d) return new Date(NaN);
  return new Date(d.getTime() + 7 * 60 * 60 * 1000);
};