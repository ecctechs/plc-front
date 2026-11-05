# เคส BUG ที่ยังเหลือจากเทสต์ที่ถูกลบ (commit 107b8ef)

อัปเดต 5/11/69: นำเทสต์เวอร์ชันเดิม (`7ff76db`) มารันกับโค้ดปัจจุบัน เหลือ **56 ข้อ** ที่ยังต้องตรวจ
แต่ละข้อต้องดูโค้ดยืนยันก่อนแก้ เพราะบางข้อเทสต์คาดหวังผิด

ดูเทสต์เดิมได้ด้วย `git show 7ff76db:<path ของไฟล์เทสต์>`

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

## StatusLamp (4)

- [BUG-2] inactiveColor='' → ควรใช้สี default '#6b7280' ไม่ใช่ '#FF0000'
- [BUG-3] addressId define สองครั้งใน props → ควรมี warn แต่ไม่มี
- [BUG-4] bgColor='' ขณะ isOn=true → ควรใช้ prop default '#22c55e' (บังเอิญถูก)
- [BUG-5] emit 'toggle' ควรรวม addressId เพื่อให้ parent รู้ว่า lamp ไหนถูก toggle

## AddDashboardCardModal (3)

- [BUG-1] double-click submit → ยิง 2 POST calls ไม่มี isLoading guard (FAIL)
- [BUG-2] editingCard.position=0 → || 1 falsy trap → selectedPosition เปลี่ยนเป็น 1 (FAIL)
- [BUG-4] non-JSON error response → SyntaxError message โชว์ถึง user แทน friendly msg (FAIL)

## AddElementModal (3)

- [BUG-1] double-click submit → ยิง 2 POST calls ไม่มี submitting guard (FAIL)
- [BUG-4] submit error ใช้ native alert() แทน showAlert → inconsistent UX (FAIL)
- [BUG-5] canSubmit=false แต่ Submit button ไม่ถูก disabled (canSubmit ไม่ได้ใช้ใน template) (FAIL)

## AlarmHistory (3)

- [BUG-3] openChart() ใช้ native alert() แทน showAlert → blocking UX (FAIL)
- [BUG-4] currentPage ไม่ reset เมื่อ filter เปลี่ยน → paginatedHistory = [] แม้จะมีข้อมูล (FAIL)
- [BUG-5] loadRooms() ไม่เช็ค res.ok → HTTP error ถูก swallow โดยไม่มี console.error (FAIL)

## Register (3)

- [BUG-1] mounted: rooms is non-array when API returns { data: null }
- [BUG-3] validate: confirmPassword empty message bypasses locale.t()
- [BUG-4] validate: email with leading/trailing spaces fails valid-format check

## DeviceSetting (3)

- [BUG-2] currentPage-- ไม่มี guard → currentPage เป็น 0 (FAIL)
- [BUG-3] currentPage++ ไม่มี guard → currentPage เกิน totalPages (FAIL)
- [BUG-5] loadDevices error ไม่มี showAlert → user ไม่รู้ว่า load ล้มเหลว (FAIL)

## RoleSettingModal (2)

- 🔴 [BUG-3] double-click Delete → fetch DELETE ถูกเรียก 2 ครั้ง
- 🔴 [BUG-4] ปิด outer modal ขณะมีข้อมูลใน form → ควรมี confirm ก่อน

## Interaction (2)

- [BUG-4] calculateSize returns 5 for size_width=0 due to || fallback (should be 0)
- [BUG-5] fetchLayouts failure is silently swallowed — no error shown to user

## Login (1)

- [BUG-6] server ส่ง token แต่ไม่มี user → ควรแสดง 'Invalid response' ไม่ใช่ 'Connection error' (FAIL)

## GaugeDisplay (1)

- [BUG-4] updateGauge: gauge=null → หลัง initGauge ค่า newVal ควรถูก apply

## DeviceForm (1)

- [BUG-4] form.addresses ว่าง → validateBeforeSave ต้อง throw (FAIL - ไม่มี check)

## EmployeeSetting (1)

- [BUG-3] confirmDelete emp.first_name=null → dialog แสดง 'null null' ไม่ใช่ employee_id (FAIL)

## ProductForm (1)

- [BUG-3] open(product) cycle_time=0 → form.cycle_time ควรเป็น 0 ไม่ใช่ '' (FAIL)

## ProductSetting (1)

- [BUG-4] confirmDelete DELETE fail → showAlert ควรแสดง API message ไม่ใช่ generic (FAIL)

## ตัดออกแล้ว: ไม่ต้องแก้

| ไฟล์ | เทสต์ | เหตุผล |
| :--- | :--- | :--- |
| swalHelper | ทั้ง 11 ข้อ | เปลี่ยนเป็นข้อความธรรมดาเพื่อกัน XSS แล้ว เทสต์ยังคาดหวังหัวข้อแบบ HTML เดิม |
| AlarmHistory | computes downtimeSummary with matched RECOVER pairs | backend ส่ง event_type เป็น RECOVERY เทสต์เก่ายังใช้ RECOVER |
| AlarmHistory | uses alarm_rule_id ?? address_id as key (getKey fallback) | เหตุผลเดียวกับข้อบน |
| AlarmHistory | sort picks earliest RECOVER when multiple exist for same trigger (covers line 487) | เหตุผลเดียวกับข้อบน |
| AlarmHistory | updates history items with duration_sec and duration_min | เหตุผลเดียวกับข้อบน |
| Login | [BUG-7] password '  123456  ' ส่ง API แบบไม่ trim (FAIL) | ไม่ตัดช่องว่างรหัสผ่าน: backend เทียบตรงตัว บัญชีที่รหัสมีช่องว่างจะ login ไม่ได้ |
| Login | [BUG-8] email 'Admin@Mail.COM' ส่ง API โดยไม่ lowercase (FAIL) | ไม่แปลงเป็นตัวเล็ก: backend เทียบตรงตัว บัญชีที่สมัครด้วยตัวใหญ่จะ login ไม่ได้ |
| GaugeDisplay | onInput: input ที่ไม่ใช่ตัวเลข → inputValue = 0 | เปลี่ยนเป็นคงค่าเดิมแล้ว |
| NumberDisplay | [BUG-1] blur หลัง Escape → ไม่ควร emit (finishEditing ต้องตรวจ editing state) | แก้แล้ว เทสต์เก่าเขียนผิดเอง (input ถูกเอาออกแล้วจึง trigger ไม่ได้) |
| DeviceSetting | number_config.scale = 0 → ใช้ 1 fallback | เปลี่ยนเป็น ?? แล้ว scale 0 จึงคงเป็น 0 |
| EmployeeSetting | employee_id ว่าง → warning TH | เปลี่ยนหัวข้อเป็นภาษาไทยแล้ว |
| EmployeeSetting | first_name ว่าง → warning TH | เปลี่ยนหัวข้อเป็นภาษาไทยแล้ว |
| EmployeeSetting | save สำเร็จ (Add) → showAlert success TH | เปลี่ยนหัวข้อเป็นภาษาไทยแล้ว |
| EmployeeSetting | delete สำเร็จ → showAlert success TH | เปลี่ยนหัวข้อเป็นภาษาไทยแล้ว |
| EmployeeSetting | [BUG-5] save() catch ไม่มี locale switch → Thai mode แสดง English error (FAIL) | แก้แล้ว หัวข้อใช้คำว่า ข้อผิดพลาด ต่างจากคำที่เทสต์เก่าคาด |
| PlcDebugForm | startPolling → interval timer ทำงานหลังผ่านเวลา | เทสต์ใหม่รอ request แรกเสร็จก่อน |
| WorkingTimeForm | saveDay API fail → Swal error | แก้ให้ขึ้นตามภาษาแล้ว |
| WorkingTimeForm | saveAll API fail → Swal error + loading = false (line 224) | แก้ให้ขึ้นตามภาษาแล้ว |
| WorkingTimeForm | [BUG-6] saveDay('monday') ส่ง payload ทุกวัน ไม่ใช่แค่ monday (FAIL) | backend เขียนทับทั้งก้อน ถ้าส่งวันเดียววันอื่นจะหาย จึงต้องส่งครบ 7 วัน |
