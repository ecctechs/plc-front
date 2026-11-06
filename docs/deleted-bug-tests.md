# เคส BUG ที่ยังเหลือจากเทสต์ที่ถูกลบ (commit 107b8ef)

อัปเดต 6/11/69: นำเทสต์เวอร์ชันเดิม (`7ff76db`) มารันกับโค้ดปัจจุบัน เหลือ **32 ข้อ** ที่ยังไม่ได้แก้
ส่วนใหญ่เป็นเรื่องเล็กหรือเกิดเฉพาะค่าผิดปกติ แต่ละข้อต้องดูโค้ดยืนยันก่อนแก้ เพราะบางข้อเทสต์คาดหวังผิด

ดูเทสต์เดิมได้ด้วย `git show 7ff76db:<path ของไฟล์เทสต์>`

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

## Demo (3)

- [BUG-1] isAuto() crashes when autoTimers is plain Object (not a Map)
- [BUG-2] formatTime(0) returns "-" because 0 is falsy — misses Unix epoch timestamp
- [BUG-5] clearing number input (value="") immediately emits min value without user confirmation

## DashboardLayout (3)

- [BUG-1] dashboardAddresses computed crashes because this.dashboardCards is undefined
- [BUG-4] loadFilters does not check res.ok — silently processes error responses
- [BUG-5] type mismatch: string allowedRoomIds fails to match numeric room_id

## StatusLamp (3)

- [BUG-2] inactiveColor='' → ควรใช้สี default '#6b7280' ไม่ใช่ '#FF0000'
- [BUG-4] bgColor='' ขณะ isOn=true → ควรใช้ prop default '#22c55e' (บังเอิญถูก)
- [BUG-5] emit 'toggle' ควรรวม addressId เพื่อให้ parent รู้ว่า lamp ไหนถูก toggle

## Register (3)

- [BUG-1] mounted: rooms is non-array when API returns { data: null }
- [BUG-3] validate: confirmPassword empty message bypasses locale.t()
- [BUG-4] validate: email with leading/trailing spaces fails valid-format check

## Chart (2)

- [BUG-1] unknown display_type renders blank chart area with no error message - should fallback
- [BUG-4] filterApplied increments on every click even when filter unchanged

## DashboardCards (2)

- [BUG-3] Thai locale without .current property always shows English text
- [BUG-5] generateTicks(0, 0) produces all-identical ticks (no min=max validation)

## AddDashboardCardModal (1)

- [BUG-2] editingCard.position=0 → || 1 falsy trap → selectedPosition เปลี่ยนเป็น 1 (FAIL)

## AddElementModal (1)

- [BUG-5] canSubmit=false แต่ Submit button ไม่ถูก disabled (canSubmit ไม่ได้ใช้ใน template) (FAIL)

## RoleSettingModal (1)

- 🔴 [BUG-4] ปิด outer modal ขณะมีข้อมูลใน form → ควรมี confirm ก่อน

## Interaction (1)

- [BUG-4] calculateSize returns 5 for size_width=0 due to || fallback (should be 0)

## Login (1)

- [BUG-6] server ส่ง token แต่ไม่มี user → ควรแสดง 'Invalid response' ไม่ใช่ 'Connection error' (FAIL)

## GaugeDisplay (1)

- [BUG-4] updateGauge: gauge=null → หลัง initGauge ค่า newVal ควรถูก apply

## DeviceForm (1)

- [BUG-4] form.addresses ว่าง → validateBeforeSave ต้อง throw (FAIL - ไม่มี check)

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
| Chart | [BUG-3] applyFilter emits inverted date range without validation | แก้แล้ว: แจ้งเตือนและไม่ apply เทสต์เก่าคาดว่าจะ emit ค่าที่สลับให้ |
| StatusLamp | [BUG-3] addressId define สองครั้งใน props → ควรมี warn แต่ไม่มี | แก้แล้ว: ลบ prop ที่ประกาศซ้ำออก |
| AddDashboardCardModal | [BUG-4] non-JSON error response → SyntaxError message โชว์ถึง user แทน friendly msg (FAIL) | แก้แล้ว: ใช้ข้อความ fallback เทสต์เก่าคาดข้อความอื่น |
| AddElementModal | [BUG-4] submit error ใช้ native alert() แทน showAlert → inconsistent UX (FAIL) | แก้แล้ว: ใช้ showAlert แทน alert |
| Interaction | [BUG-5] fetchLayouts failure is silently swallowed — no error shown to user | แก้แล้ว: แจ้งด้วย showAlert เทสต์เก่าคาดให้ตั้งค่า error ซึ่งจะทำให้ทั้งหน้าหาย |
