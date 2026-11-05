// ตรวจรูปแบบอีเมล: ไม่มีช่องว่าง, มี @ เดียว, โดเมนมีจุดและไม่มีจุดติดกัน
export const isValidEmail = (email) => {
  const value = typeof email === "string" ? email : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.split("@")[1].includes("..");
};

// คืนข้อความ error ของอีเมลผู้รับ Alarm หรือ "" ถ้าถูกต้อง / ไม่ได้ติ๊กส่งอีเมล
export const getAlarmEmailError = (alarm) => {
  if (!alarm.notify_email) return "";
  const recipients = alarm.email_recipients || [];
  if (recipients.length === 0) return "กรุณาระบุอีเมลผู้รับอย่างน้อย 1 อีเมล";
  const invalid = recipients.find((email) => !isValidEmail(email));
  return invalid ? `รูปแบบอีเมลไม่ถูกต้อง: ${invalid}` : "";
};
