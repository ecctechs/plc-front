# ⚡ PLC Web Dashboard

**PLC Web Dashboard** เป็นเว็บแอปพลิเคชันระดับ Industrial-grade สำหรับการ Monitoring, Simulation และ Alarm Management ของระบบ **PLC (Programmable Logic Controller)** ออกแบบมาเพื่อเพิ่มประสิทธิภาพในการเฝ้าติดตามกระบวนการผลิต พร้อมความสามารถในการจำลองสถานการณ์ (Demo Mode) โดยไม่ต้องเชื่อมต่ออุปกรณ์จริง

---

## 🚀 ฟีเจอร์หลัก (Key Features)

* 📊 **Real-time Dashboard**: แสดงผลสถานะอุปกรณ์แบบ Card Layout รองรับข้อมูลหลายประเภท (ON/OFF, Number, Gauge, Level)
* ⚙️ **Flexible Configuration**: ตั้งค่า Device และ PLC Address (เช่น M0, D0) ได้อย่างอิสระผ่าน UI
* 🧪 **Demo Mode (Simulation)**: จำลองค่า Input/Output เพื่อทดสอบระบบหรือนำเสนอผลงาน
* 🚨 **Alarm Management**: ระบบแจ้งเตือนตามเงื่อนไขที่กำหนด พร้อมหน้าประวัติ (Alarm History)
* ⏱️ **Working Time Control**: กำหนดเวลาทำงานของระบบ (Global Rule) สำหรับการวิเคราะห์ข้อมูลอย่างแม่นยำ
* 📈 **Data Visualization**: แสดงกราฟข้อมูลย้อนหลัง (Time-series) ด้วย Chart.js และ ApexCharts

---

## 🖥️ รายละเอียดเมนูและหน้าจอการใช้งาน (Module Details)

แอปพลิเคชันทำงานแบบ **Single Page Application (SPA)** ใช้ระบบ Tab-based Navigation:

### 1. 🏠 หน้า Dashboard (Main Monitor)
ใช้สำหรับเฝ้าติดตามสถานะอุปกรณ์แบบ Real-time
* **Card Layout**: ปรับแต่งลำดับ (Position) และเลือกประเภทการแสดงผลได้อิสระ
* **Display Types**: 
    * `ON/OFF`: แสดงสถานะด้วยไฟสัญญาณ (Indicator)
    * `Number`: แสดงค่าตัวเลขพร้อมหน่วยวัด
    * `Gauge`: แสดงค่าในรูปแบบเข็มไมล์ (Radial Gauge)
    * `Level`: แสดงระดับสถานะตามช่วงค่าที่ตั้งไว้ (Status Bar)
* **Quick Actions**: ปุ่มดูกราฟย้อนหลัง (Chart) และรายละเอียดเชิงลึก (More Info)
* **Edit Mode**: สามารถเพิ่ม ลบ หรือย้ายตำแหน่งการ์ดได้ทันที

### 2. 🎮 หน้า Interaction (Visual Control)
เน้นการแสดงผลแบบ Interactive บนภาพจำลองเครื่องจักร
* **Background Layout**: เลือกภาพพื้นหลังเครื่องจักร (Machine Image) ได้เอง
* **Interactive Elements**: วางปุ่มกด (Control Button), ไฟสถานะ (Status Lamp), หรือเกจวัด ลงบนตำแหน่งบนภาพ
* **Manual Control**: คลิกสั่งงาน PLC (Start/Stop) หรือจำลองสถานะได้จากหน้าจอ

### 3. 📊 หน้า OEE Dashboard (Productivity)
วิเคราะห์ประสิทธิภาพการผลิต (Overall Equipment Effectiveness)
* **Analysis**: แสดงค่า Availability, Performance และ Quality
* **Time Breakdown**: วิเคราะห์เวลาผลิต (Planned Time) และเวลาหยุดเครื่อง (Downtime)
* **Output**: สรุปยอดผลผลิตทั้งหมด, ของดี (Good) และของเสีย (Reject)

### 4. ⚙️ หน้า Setting (Configuration)
ศูนย์กลางการกำหนดค่าระบบ
* **Device Setting**: จัดการ PLC Address (เช่น M0, D100) และ Refresh Rate
* **Alarm Config**: ตั้งเงื่อนไขแจ้งเตือน (Thresholds) และการส่ง Email
* **Working Time**: กำหนดเวลาทำงานและเวลาพักเพื่อใช้คำนวณ OEE
* **PLC Debug**: เครื่องมือสำหรับทดสอบอ่านค่าจาก PLC โดยตรง

### 5. 📜 หน้า Alarm History (Logs)
ตรวจสอบเหตุการณ์ผิดปกติย้อนหลัง
* **Event Logs**: บันทึกการเกิด Alarm และการคืนสู่สภาวะปกติ (Recovery)
* **Filter**: ค้นหาตามชื่ออุปกรณ์, โซน (Room) หรือช่วงเวลา
* **Contextual Chart**: ย้อนดูกราฟในช่วงเวลาที่เกิดเหตุการณ์ได้ทันที

### 6. 🧪 หน้า Demo / Simulation (Testing)
ทดสอบระบบโดยไม่ต้องต่อ PLC จริง
* **Manual Override**: ปรับค่า Slider หรือเปิด-ปิดสถานะเพื่อทดสอบ Logic
* **Random Mode**: สุ่มค่าอุปกรณ์ทุกตัวเพื่อทดสอบ Stress Test ของระบบ Dashboard

---

## 🛠 Tech Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | Vue 3 (Composition API), Vite |
| **Styling** | Bootstrap 5 (Modern Industrial Theme) |
| **UI Framework** | Font Awesome 6, SweetAlert2 |
| **Charts** | Chart.js, ApexCharts, Canvas-gauges |
| **Utilities** | Axios, Date-fns |

---

## 🎨 UI/UX Design
* **Theme**: Modern Industrial (โทนสี ฟ้า-กรม-ขาว)
* **Localization**: รองรับ 2 ภาษา (ไทย / English)
* **Responsiveness**: รองรับการแสดงผลทุกขนาดหน้าจอ (Desktop & Tablet)

---
*Developed for Industrial Automation and Smart Factory Solutions.*
