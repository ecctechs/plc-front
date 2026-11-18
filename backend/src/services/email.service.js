'use strict';
const nodemailer = require('nodemailer');

// ค่าทั้งหมดมาจาก .env เท่านั้น (เดิมมีอีเมลและรหัสผ่านจริงเขียนไว้ในโค้ดเป็นค่าสำรอง)
const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;
const isConfigured = Boolean(EMAIL_HOST && EMAIL_USER && EMAIL_PASS);

if (!isConfigured) {
  console.warn('[EMAIL] ยังไม่ได้ตั้ง EMAIL_HOST / EMAIL_USER / EMAIL_PASS ใน .env — ระบบจะไม่ส่งอีเมลแจ้งเตือน Alarm');
}

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT) || 587,
      secure: false, // port 587 uses STARTTLS
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      tls: { rejectUnauthorized: false }
    })
  : null;

// EMAIL_FROM ใส่ได้ทั้งแบบ "ชื่อ <อีเมล>" หรืออีเมลอย่างเดียว
function getFromAddress() {
  if (EMAIL_FROM && EMAIL_FROM.includes('<')) return EMAIL_FROM;
  return `"PLC Alarm System" <${EMAIL_FROM || EMAIL_USER}>`;
}

// Send alarm email to recipients
async function sendAlarmEmail(recipients, subject, htmlContent) {
  try {
    if (!transporter) {
      console.error('[EMAIL ERROR] ยังไม่ได้ตั้งค่าอีเมลใน .env — ข้ามการส่ง:', subject);
      return false;
    }

    if (!recipients || (Array.isArray(recipients) && recipients.length === 0)) {
      console.error('[EMAIL ERROR] No recipients specified');
      return false;
    }

    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: Array.isArray(recipients) ? recipients.join(', ') : recipients,
      subject,
      html: htmlContent,
    });

    console.log('[EMAIL SENT] Message ID: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('[EMAIL ERROR]', error);
    return false;
  }
}

module.exports = { sendAlarmEmail };
