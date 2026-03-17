# Manual Test Scenarios - Level & Alarm Integration

## Test Setup
- เปิด Browser Developer Tools (F12) และไปที่ Tab Console
- ตั้งค่า Backend API ให้พร้อม

---

## Test Case 1: เพิ่ม Level ใหม่และเชื่อมกับ Alarm ใหม่

### Steps:
1. ไปที่หน้า **Setting** > เลือก Device
2. เลือก Address ที่มี Data Type เป็น **level**
3. คลิก **+ Add Item** เพื่อเพิ่ม Level ใหม่
   - Label: `Test Level 1`
   - Mode: `Criteria`
   - Condition: `Between`
   - Min: `0`, Max: `50`
4. ตั้งค่า Alarm โดยคลิก **+ Add Alarm**
   - Name: `Test Alarm`
   - Level Label: เลือก `Test Level 1` (ที่เพิ่มในขั้นตอนที่ 3)
5. คลิก **Save**

### Expected Results (Console):
```
Saved levels for alarm mapping: [{level_index: 1, label: "Test Level 1", ...}]
Mapping alarm "Test Alarm" to level_index: 1
```

### Verification:
- เปิดดูข้อมูลในฐานข้อมูล ตรวจสอบว่า Alarm มี `level_index = 1`

---

## Test Case 2: เพิ่ม Level ใหม่หลายระดับและเชื่อม Alarm

### Steps:
1. ลบ Address เดิมหรือสร้าง Address ใหม่ (Data Type: level)
2. เพิ่ม Levels ดังนี้:
   - Level 1: `Low`, Min: 0-30
   - Level 2: `Medium`, Min: 31-70
   - Level 3: `High`, Min: 71-100
3. เพิ่ม Alarm 2 ตัว:
   - Alarm 1: เชื่อมกับ `Low`
   - Alarm 2: เชื่อมกับ `High`
4. คลิก **Save**

### Expected Results:
- Console แสดง level_index ของแต่ละ Level
- Console แสดงการ map alarm ไปยัง level_index ที่ถูกต้อง

### Verification:
- ตรวจสอบในฐานข้อมูลว่า Alarm ของ `Low` มี `level_index = 1`
- ตรวจสอบในฐานข้อมูลว่า Alarm ของ `High` มี `level_index = 3`

---

## Test Case 3: แก้ไข Level เดิมและ Alarm

### Steps:
1. เลือก Address ที่มี Level และ Alarm อยู่แล้ว
2. แก้ไข Label ของ Level เช่น `Low` → `Low Level`
3. เปลี่ยน Alarm ให้ชี้ไปที่ Level ใหม่
4. คลิก **Save**

### Expected Results:
- Console แสดงการ map alarm ไปยัง level_index ใหม่

### Verification:
- ตรวจสอบว่า Alarm มี level_index ตรงกับ Level ที่เลือก

---

## Test Case 4: ลบ Level ที่มี Alarm เชื่อมอยู่

### Steps:
1. เลือก Address ที่มี Level และ Alarm เชื่อมกัน
2. ลบ Level ที่มี Alarm อยู่
3. คลิก **Save**

### Expected Results:
- ระบบควรจัดการกรณีที่ level_label ไม่ตรงกับ Level ที่เหลือ

---

## Test Case 5: เพิ่ม Level กับ Device ใหม่ (สร้างใหม่ทั้งหมด)

### Steps:
1. สร้าง Device ใหม่พร้อม Address ใหม่
2. เพิ่ม Level และ Alarm
3. คลิก **Save**

### Expected Results:
- ระบบสร้าง Address ใหม่ → บันทึก Levels → ดึง Levels กลับมา → บันทึก Alarms

---

## Debug Tips

### ดู Console Logs:
โค้ดที่เพิ่มจะแสดง log ดังนี้:
```javascript
console.log('Saved levels for alarm mapping:', savedLevels);
console.log(`Mapped alarm "${alarm.name}" to level_index: ${matchedLevel.level_index}`);
```

### Network Tab:
ตรวจสอบ Network tab ว่ามีการเรียก API:
1. `POST /api/addresses/{id}/levels` - บันทึก levels
2. `GET /api/addresses/{id}/levels` - ดึง levels กลับมา
3. `POST /api/addresses/{id}/alarms` - บันทึก alarms

---

## Rollback
หากพบปัญหา สามารถย้อนกลับได้โดย:
1. Revert การเปลี่ยนแปลงใน `src/components/setting/DeviceForm.vue`
2. Revert การเปลี่ยนแปลงใน `src/components/setting/AlertForm.vue`
