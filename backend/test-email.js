'use strict';
// โหลด .env.<NODE_ENV> แบบเดียวกับ server (ค่าอีเมลต้องมาจาก .env เท่านั้น)
require('dotenv').config({ path: require('path').resolve(__dirname, `.env.${process.env.NODE_ENV || 'development'}`) });
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log("--- Starting Email Test ---");

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('ยังไม่ได้ตั้ง EMAIL_HOST / EMAIL_USER / EMAIL_PASS ใน .env');
    process.exit(1);
  }

  // คอนฟิกตามที่คุณให้มา
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // ใช้ false สำหรับ port 587 (STARTTLS)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // ช่วยแก้ปัญหาใบรับรอง SSL ในบางเคส
  }
});

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: 'eccerp2568@gmail.com', // 👈 ใส่เมลของคุณตรงนี้เพื่อรับเมลทดสอบ
      subject: 'Test Alarm System ✔',
      text: 'Hello, this is a test email from your PLC Alarm system.',
      html: `
        <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 20px;">
          <h2 style="color: #007bff;">PLC System Connection Test</h2>
          <p>หากคุณได้รับเมลนี้ แสดงว่า <strong>Nodemailer</strong> และ <strong>SMTP Server</strong> ทำงานได้ถูกต้อง</p>
          <hr>
          <p><strong>Server:</strong> mail.eccsolutions.co.th</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    console.log("✅ Email sent successfully!");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Failed to send email:");
    console.error(error);
  }
}

testEmail();