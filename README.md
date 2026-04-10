# ⚡ PLC Web Dashboard

เว็บแอปพลิเคชันสำหรับ Monitoring, Simulation และ Alarm Management ของระบบ PLC
ออกแบบมาเพื่อใช้งานจริงในโรงงาน / ระบบอุตสาหกรรม และสามารถ Demo ได้โดยไม่ต้องเชื่อมต่อ PLC จริง

---

## 🚀 Features Overview

* 📊 Real-time Device Dashboard
* ⚙️ Flexible Device & PLC Configuration
* 🧪 Simulation (Demo Mode)
* 🚨 Alarm Management & History
* ⏱ Global Working Time Control
* 📈 Performance & Data Visualization

---

## 📊 Dashboard

* แสดงอุปกรณ์แบบ **Card Layout**
* รองรับหลาย Data Type

  * 🔴 **ON / OFF**
  * 🔢 **Number**
  * 🎛 **Number Gauge**
  * 📶 **Level**
* แสดงสถานะการเชื่อมต่อ (Online / Offline)
* แสดงค่า Current Value แบบ Real-time
* ปุ่ม **More Info** สำหรับดูรายละเอียด
* ปุ่ม **Chart** สำหรับดูกราฟย้อนหลัง
* Responsive Design รองรับทุกขนาดหน้าจอ

---

## ⚙️ Device Setting

* เพิ่ม / แก้ไข / ลบ Device
* ตั้งค่าอุปกรณ์

  * Device Name
  * Device Type
  * Data Display Type
* ตั้งค่า PLC Address

  * Address (เช่น D0, M0)
  * Refresh Rate (ms)
* PLC Address Debug

  * ▶️ Test (อ่านค่าครั้งเดียว)
  * 🔄 Poll (อ่านค่าแบบ Real-time)

---

## 📈 Level Configuration

* ตั้งค่า Level ได้หลายช่วง (Multi-Level)
* รองรับเงื่อนไข

  * Exact Value
  * Between
  * More Than / Less Than
* กำหนด Min / Max / Value ต่อ Level
* เพิ่ม / ลบ Level แบบ Dynamic
* ใช้ Level ร่วมกับ Logic การแสดงผลและ Alarm

---

## ⏱ Working Time Setting (Global)

* ตั้งค่าวันทำงาน (Mon – Sun)
* ตั้งเวลาเริ่ม / เลิกงาน
* ตั้งเวลา Break (Optional)
* ใช้เป็น Global Rule สำหรับ Alarm และ Event
* บันทึกค่าแบบรวมศูนย์ (Global Setting)

---

## 🧪 Demo Mode (Simulation)

* เปิด / ปิด Simulation Mode
* จำลองการทำงานโดยไม่ต้องต่อ PLC จริง
* รองรับทุก Data Type

  * ON / OFF → ปุ่มควบคุม
  * Number / Level → Slider + Input
  * Number Gauge → Slider
* เหมาะสำหรับ

  * Demo ลูกค้า
  * ทดสอบ Alarm Logic
  * พัฒนา Frontend

---

## 🚨 Alarm Settings

* ตั้งค่า Alarm ต่อ Device
* กำหนด

  * Alarm Name
  * Condition (>, >=, <, <=, =)
  * Threshold Value
* รองรับ Email Notification
* แยก Alarm Rule ออกจาก Device ชัดเจน

---

## 📜 Alarm History

* แสดงประวัติ Alarm จาก PLC
* แสดงข้อมูล

  * Device Name
  * Alarm Name
  * Condition
  * Threshold
  * Actual Value
  * Event Type (Trigger / Recovery)
  * Timestamp
* ค้นหาด้วยช่วงวันที่ (Start / End Date)
* แสดง Empty State เมื่อไม่มีข้อมูล

---

## 📉 Performance (Analytics)

* โครงสร้างแยกตาม Data Type
* รองรับกราฟ

  * ON / OFF Analysis
  * Number Trend
  * Average / Min / Max
* เลือกช่วงเวลาได้
* Auto Refresh
* ใช้ Chart.js

---

## 🧩 System Architecture

* **Frontend:** Vue.js
* Component-based Architecture
* แยกหน้าการทำงานชัดเจน

  * Dashboard
  * Setting
  * Performance
  * Demo
  * Alarm History
* รองรับทั้ง PLC จริง และ Mock Data
* ออกแบบให้ Scale เพิ่ม Device / Feature ได้ง่าย

---
