/**
 * แปลงวันที่ให้แสดงผลเป็น พ.ศ. พร้อมรูปแบบ DD/MM/YYYY hh:mm A
 */
export const formatThaiYear = (date) => {
  if (!date) return "";
  const d = new Date(date);
  
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
  if (!date) return null;
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * บวก 7 ชั่วโมงเข้า timestamp เพื่อแสดงผลเป็น UTC+7 บน Chart
 * ใช้เฉพาะตอน render — ไม่กระทบ logic การ deduplication (lastFetchTime)
 */
export const toUTC7 = (date) => {
  return new Date(new Date(date).getTime() + 7 * 60 * 60 * 1000);
};