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

<img width="1885" height="938" alt="Screenshot 2026-05-06 115609" src="https://github.com/user-attachments/assets/0f0a5607-0bd4-4bf4-aecf-34d897f48794" />

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

<img width="1877" height="921" alt="Screenshot 2026-05-06 115756" src="https://github.com/user-attachments/assets/3b3a37d6-e3b3-4a14-bf56-b586acfde82d" />

เน้นการแสดงผลแบบ Interactive บนภาพจำลองเครื่องจักร
* **Background Layout**: เลือกภาพพื้นหลังเครื่องจักร (Machine Image) ได้เอง
* **Interactive Elements**: วางปุ่มกด (Control Button), ไฟสถานะ (Status Lamp), หรือเกจวัด ลงบนตำแหน่งบนภาพ
* **Manual Control**: คลิกสั่งงาน PLC (Start/Stop) หรือจำลองสถานะได้จากหน้าจอ

<img width="1878" height="868" alt="Screenshot 2026-05-06 115707" src="https://github.com/user-attachments/assets/757446d7-3201-433b-b7b1-610d63c377dc" />

### 3. 📊 หน้า OEE Dashboard (Productivity)

<img width="1878" height="868" alt="Screenshot 2026-05-06 115707" src="https://github.com/user-attachments/assets/b07249db-93bc-4bee-959b-c14e158cdf32" />

วิเคราะห์ประสิทธิภาพการผลิต (Overall Equipment Effectiveness)
* **Analysis**: แสดงค่า Availability, Performance และ Quality
* **Time Breakdown**: วิเคราะห์เวลาผลิต (Planned Time) และเวลาหยุดเครื่อง (Downtime)
* **Output**: สรุปยอดผลผลิตทั้งหมด, ของดี (Good) และของเสีย (Reject)

### 4. ⚙️ หน้า Setting (Configuration)

<img width="1876" height="908" alt="Screenshot 2026-05-06 115630" src="https://github.com/user-attachments/assets/3adfb92d-4a63-4f61-bdc5-23ad77140b60" />
<img width="1877" height="928" alt="Screenshot 2026-05-06 115647" src="https://github.com/user-attachments/assets/6eb9186e-96b3-44ba-860a-1bb31476eee5" />

ศูนย์กลางการกำหนดค่าระบบ
* **Device Setting**: จัดการ PLC Address (เช่น M0, D100) และ Refresh Rate
* **Alarm Config**: ตั้งเงื่อนไขแจ้งเตือน (Thresholds) และการส่ง Email
* **Working Time**: กำหนดเวลาทำงานและเวลาพักเพื่อใช้คำนวณ OEE
* **PLC Debug**: เครื่องมือสำหรับทดสอบอ่านค่าจาก PLC โดยตรง

### 5. 📜 หน้า Alarm History (Logs)

<img width="1868" height="905" alt="Screenshot 2026-05-06 115733" src="https://github.com/user-attachments/assets/e077c578-0dda-467c-9e5c-98aa65e37737" />

ตรวจสอบเหตุการณ์ผิดปกติย้อนหลัง
* **Event Logs**: บันทึกการเกิด Alarm และการคืนสู่สภาวะปกติ (Recovery)
* **Filter**: ค้นหาตามชื่ออุปกรณ์, โซน (Room) หรือช่วงเวลา
* **Contextual Chart**: ย้อนดูกราฟในช่วงเวลาที่เกิดเหตุการณ์ได้ทันที

### 6. 🧪 หน้า Demo / Simulation (Testing)
<img width="1863" height="912" alt="Screenshot 2026-05-06 115721" src="https://github.com/user-attachments/assets/daecf9ef-d430-4dad-b9c0-6177626ddd9e" />
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
