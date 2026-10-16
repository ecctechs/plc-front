# เคส BUG ที่ถูกลบออกจากเทสต์ (commit 107b8ef)

เทสต์ชุดนี้ถูกลบออกใน commit `107b8ef` แต่เมื่อนำเทสต์เวอร์ชันเดิม (`7ff76db`) มารันกับโค้ดปัจจุบัน
ยัง **ไม่ผ่าน 105 ข้อ** — แปลว่าบั๊กเหล่านี้ยังไม่ได้แก้ (หรือเทสต์คาดหวังผิด ต้องตรวจทีละข้อ)

ดูเทสต์เดิมได้ด้วย `git show 7ff76db:<path ของไฟล์เทสต์>`

## swalHelper (11)

- เรียก Swal.fire ด้วย icon และ title ที่ระบุ
- ใช้สี icon ถูกต้องตามประเภท (error → #dc3545)
- ใช้สี warning → #ffc107
- ใช้สี info → #17a2b8
- ใช้สี success → #28a745
- แสดง dialog ยืนยันพร้อมข้อความที่ระบุ
- title มี inline style สีส้ม #ff9800
- [BUG-3] XSS injection ผ่าน title → title ไม่ถูก escape (FAIL)
- [BUG-4] XSS injection ผ่าน text parameter → html ไม่ถูก escape (FAIL)
- [BUG-5] unknown icon → colors[icon] = undefined → confirmButtonColor undefined (FAIL)
- [BUG-6] null text → html แสดง 'null' ตรงๆ (FAIL)

## AlarmHistory (7)

- computes downtimeSummary with matched RECOVER pairs
- uses alarm_rule_id ?? address_id as key (getKey fallback)
- sort picks earliest RECOVER when multiple exist for same trigger (covers line 487)
- updates history items with duration_sec and duration_min
- [BUG-3] openChart() ใช้ native alert() แทน showAlert → blocking UX (FAIL)
- [BUG-4] currentPage ไม่ reset เมื่อ filter เปลี่ยน → paginatedHistory = [] แม้จะมีข้อมูล (FAIL)
- [BUG-5] loadRooms() ไม่เช็ค res.ok → HTTP error ถูก swallow โดยไม่มี console.error (FAIL)

## Chart (5)

- [BUG-1] unknown display_type renders blank chart area with no error message - should fallback
- [BUG-2] invalid initialStart causes NaN in time fields - should validate input
- [BUG-3] applyFilter emits inverted date range without validation
- [BUG-4] filterApplied increments on every click even when filter unchanged
- [BUG-5] formatThaiDateOnly with Invalid Date returns "NaN/NaN/NaN" instead of ""

## Demo (5)

- [BUG-1] isAuto() crashes when autoTimers is plain Object (not a Map)
- [BUG-2] formatTime(0) returns "-" because 0 is falsy — misses Unix epoch timestamp
- [BUG-3] onInputChange with string "false" sets onoff to ON (1) instead of OFF (0)
- [BUG-4] inverted range (min > max) causes all values to clamp to 0 silently
- [BUG-5] clearing number input (value="") immediately emits min value without user confirmation

## Setting (5)

- [BUG-1] openDeviceForm(): default null is not undefined — may trigger edit mode in DeviceForm
- [BUG-2] @add on DeviceSetting passes raw event payload to openDeviceForm → DeviceForm.open receives event object
- [BUG-3] onDeviceSaved(): emits add-device without device payload (inconsistent with addDevice)
- [BUG-4] reloadDevices prop crashes after Setting is unmounted (dangling ref)
- [BUG-5] openDeviceForm: no error handling when $refs.deviceFormModal.open() throws

## NumberDisplay (5)

- [BUG-1] blur หลัง Escape → ไม่ควร emit (finishEditing ต้องตรวจ editing state)
- [BUG-2] onInput ตัวอักษร → ควรคง inputValue เดิม ไม่ reset เป็น 0
- [BUG-3] value=NaN → displayValue ควรแสดง '0' ไม่ใช่ 'NaN'
- [BUG-4] startEditing ซ้ำขณะ editing → inputValue ไม่ควร reset
- [BUG-5] finishEditing ไม่ clamp ค่า → ส่งค่าเกิน maxValue ไปยัง PLC

## StatusLamp (5)

- [BUG-1] คลิกเร็ว ๆ ระหว่าง isClicking=true → ควร block emit ซ้ำ
- [BUG-2] inactiveColor='' → ควรใช้สี default '#6b7280' ไม่ใช่ '#FF0000'
- [BUG-3] addressId define สองครั้งใน props → ควรมี warn แต่ไม่มี
- [BUG-4] bgColor='' ขณะ isOn=true → ควรใช้ prop default '#22c55e' (บังเอิญถูก)
- [BUG-5] emit 'toggle' ควรรวม addressId เพื่อให้ parent รู้ว่า lamp ไหนถูก toggle

## date-utils (4)

- [BUG-3] formatThaiYear('not-a-date') ควรคืน '' ไม่ใช่ NaN string (FAIL)
- [BUG-4] formatISO('not-a-date') ควรคืน null ไม่ใช่ NaN string (FAIL)
- [BUG-5] formatISO(new Date('invalid')) ควรคืน null (object truthy bypass guard) (FAIL)
- [BUG-6] toUTC7(null) ควรคืน null หรือ Invalid Date ไม่ใช่ epoch+7h (FAIL)

## DashboardCards (4)

- [BUG-2] last_value="ERR" string causes getDisplayValue to return "NaN"
- [BUG-3] Thai locale without .current property always shows English text
- [BUG-4] severity "Critical" (capital C) falls through to green instead of red
- [BUG-5] generateTicks(0, 0) produces all-identical ticks (no min=max validation)

## DashboardLayout (4)

- [BUG-1] dashboardAddresses computed crashes because this.dashboardCards is undefined
- [BUG-3] deleteCard emits "delete-card" even when API returns failure (no res.ok check)
- [BUG-4] loadFilters does not check res.ok — silently processes error responses
- [BUG-5] type mismatch: string allowedRoomIds fails to match numeric room_id

## Login (4)

- [BUG-5] email 'a@b..com' (double dot) ควรแสดง error แต่ regex ผ่าน (FAIL)
- [BUG-6] server ส่ง token แต่ไม่มี user → ควรแสดง 'Invalid response' ไม่ใช่ 'Connection error' (FAIL)
- [BUG-7] password '  123456  ' ส่ง API แบบไม่ trim (FAIL)
- [BUG-8] email 'Admin@Mail.COM' ส่ง API โดยไม่ lowercase (FAIL)

## DeviceSetting (4)

- number_config.scale = 0 → ใช้ 1 fallback
- [BUG-2] currentPage-- ไม่มี guard → currentPage เป็น 0 (FAIL)
- [BUG-3] currentPage++ ไม่มี guard → currentPage เกิน totalPages (FAIL)
- [BUG-5] loadDevices error ไม่มี showAlert → user ไม่รู้ว่า load ล้มเหลว (FAIL)

## PlcDebugForm (4)

- [BUG-2] readOnce res.ok=false + non-JSON body → error ควรเป็น 'Read failed' ไม่ใช่ SyntaxError (FAIL)
- [BUG-3] startPolling() เรียก 2 ครั้ง → interval เดิม leak ยังทำงานอยู่ (FAIL)
- [BUG-4] interval=1 → setInterval ด้วย 1ms → API flooding (FAIL)
- [BUG-5] readOnce ไม่มี guard → loading=true ยัง fetch ได้ (race condition) (FAIL)

## AddDashboardCardModal (3)

- [BUG-1] double-click submit → ยิง 2 POST calls ไม่มี isLoading guard (FAIL)
- [BUG-2] editingCard.position=0 → || 1 falsy trap → selectedPosition เปลี่ยนเป็น 1 (FAIL)
- [BUG-4] non-JSON error response → SyntaxError message โชว์ถึง user แทน friendly msg (FAIL)

## AddElementModal (3)

- [BUG-1] double-click submit → ยิง 2 POST calls ไม่มี submitting guard (FAIL)
- [BUG-4] submit error ใช้ native alert() แทน showAlert → inconsistent UX (FAIL)
- [BUG-5] canSubmit=false แต่ Submit button ไม่ถูก disabled (canSubmit ไม่ได้ใช้ใน template) (FAIL)

## Interaction (3)

- [BUG-2] writePlcValue with address_id=0 returns early without writing to PLC
- [BUG-4] calculateSize returns 5 for size_width=0 due to || fallback (should be 0)
- [BUG-5] fetchLayouts failure is silently swallowed — no error shown to user

## Register (3)

- [BUG-1] mounted: rooms is non-array when API returns { data: null }
- [BUG-3] validate: confirmPassword empty message bypasses locale.t()
- [BUG-4] validate: email with leading/trailing spaces fails valid-format check

## GaugeDisplay (3)

- [BUG-3] onInput: พิมพ์ตัวอักษร → ควรคง inputValue เดิม ไม่ reset เป็น 0
- [BUG-4] updateGauge: gauge=null → หลัง initGauge ค่า newVal ควรถูก apply
- [BUG-5] startEditing ขณะ editing อยู่ → ควร guard ไม่ reset inputValue

## EmployeeSetting (3)

- [BUG-3] confirmDelete emp.first_name=null → dialog แสดง 'null null' ไม่ใช่ employee_id (FAIL)
- [BUG-4] save() ส่ง employee_id ที่ไม่ถูก trim ไปยัง API (FAIL)
- [BUG-5] save() catch ไม่มี locale switch → Thai mode แสดง English error (FAIL)

## ProductForm (3)

- [BUG-3] open(product) cycle_time=0 → form.cycle_time ควรเป็น 0 ไม่ใช่ '' (FAIL)
- [BUG-4] handleImageUpload รับ .js file โดยไม่มี type validation (FAIL)
- [BUG-5] save() ส่ง form.name ที่มี spaces ไปยัง API โดยไม่ trim (FAIL)

## RoomSetting (3)

- [BUG-3] save() catch TH → title ควรเป็น 'ข้อผิดพลาด' ไม่ใช่ 'Error' (FAIL)
- [BUG-4] confirmDelete() catch TH → title ควรเป็น 'ข้อผิดพลาด' ไม่ใช่ 'Error' (FAIL)
- [BUG-5] save() ส่ง form.name ที่มี spaces โดยไม่ trim ก่อน POST (FAIL)

## TypeSetting (3)

- [BUG-3] save() catch TH → title ควรเป็น 'ข้อผิดพลาด' ไม่ใช่ 'Error' (FAIL)
- [BUG-4] confirmDelete() catch TH → title ควรเป็น 'ข้อผิดพลาด' ไม่ใช่ 'Error' (FAIL)
- [BUG-5] save() ส่ง form.name ที่มี spaces โดยไม่ trim ก่อน POST (FAIL)

## WorkingTimeForm (3)

- [BUG-3] saveAll success Swal title ควรเป็น 'Success' ใน EN mode (FAIL)
- [BUG-5] validateDay: start = end = '22:00' ควรให้ error (zero-duration) (FAIL)
- [BUG-6] saveDay('monday') ส่ง payload ทุกวัน ไม่ใช่แค่ monday (FAIL)

## RoleSettingModal (2)

- 🔴 [BUG-3] double-click Delete → fetch DELETE ถูกเรียก 2 ครั้ง
- 🔴 [BUG-4] ปิด outer modal ขณะมีข้อมูลใน form → ควรมี confirm ก่อน

## AlertForm (2)

- [BUG-3] notify_email=true แต่ email_recipients=[] → ควร validate error
- [BUG-5] email รูปแบบผิด → validateAlarms ควร error

## DeviceForm (2)

- [BUG-4] form.addresses ว่าง → validateBeforeSave ต้อง throw (FAIL - ไม่มี check)
- [BUG-5] deletedAlarmIds cleared ใน saveChildConfigs → กับ 2 addresses ลบ alarm ซ้ำ (FAIL)

## ProductSetting (2)

- [BUG-3] savePlcAddresses catch TH → title ควรเป็น 'ข้อผิดพลาด' ไม่ใช่ 'Error' (FAIL)
- [BUG-4] confirmDelete DELETE fail → showAlert ควรแสดง API message ไม่ใช่ generic (FAIL)
