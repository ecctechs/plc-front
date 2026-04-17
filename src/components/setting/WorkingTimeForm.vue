<template>
  <div class="card shadow-sm">
    <div class="card-body p-4">
      <h5 class="fw-bold mb-4">
        <i class="bi bi-clock text-primary me-2"></i>{{ locale.t('Working Time') }}
      </h5>
      <p class="text-muted small mb-4">{{ locale.t('Define work and break schedules') }}</p>

      <div class="row g-3">
        <template v-for="(day, index) in dayList" :key="day.id">
          <div v-if="index % 2 === 0" class="w-100"></div>
          <div class="col-6">
            <div class="day-row p-3 border rounded shadow-sm h-100 d-flex flex-column"
                 :class="{'bg-light opacity-75': !day.active, 'border-primary-subtle': day.active}">
              
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="text-primary mb-0 fw-bold text-capitalize">
                  {{ day.id }}
                </h5>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" v-model="day.active" :id="'switch-' + day.id">
                </div>
              </div>

              <div class="flex-grow-1">
                <div v-if="day.active">
                  <div class="mb-2">
                    <label class="form-label mb-1 fw-semibold text-secondary small text-uppercase">
                      {{ locale.t('Working Hours') }}
                    </label>
                    <div v-for="(slot, idx) in schedule[day.id].working_hours" :key="'w-'+idx" class="row g-1 mb-1 align-items-center">
                      <div class="col-5">
                        <input type="time" v-model="slot.start" class="form-control form-control-sm">
                      </div>
                      <div class="col-5">
                        <input type="time" v-model="slot.end" class="form-control form-control-sm">
                      </div>
                      <div class="col-2 text-center">
                        <button @click="removeSlot(day.id, 'working_hours', idx)" class="btn btn-sm btn-outline-danger p-1">
                          <i class="fa-solid fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                    <button @click="addSlot(day.id, 'working_hours')" class="btn btn-xs btn-primary mt-1">
                      <i class="fas fa-plus me-1"></i> {{ locale.t('Add Shift') }}
                    </button>
                  </div>

                  <div class="mb-1">
                    <label class="form-label mb-1 fw-semibold text-secondary small text-uppercase">
                      {{ locale.t('Break Times') }}
                    </label>
                    <div v-for="(slot, idx) in schedule[day.id].break_times" :key="'b-'+idx" class="row g-1 mb-1 align-items-center">
                      <div class="col-5">
                        <input type="time" v-model="slot.start" class="form-control form-control-sm border-dashed">
                      </div>
                      <div class="col-5">
                        <input type="time" v-model="slot.end" class="form-control form-control-sm border-dashed">
                      </div>
                      <div class="col-2 text-center">
                        <button @click="removeSlot(day.id, 'break_times', idx)" class="btn btn-sm btn-outline-danger p-1">
                          <i class="fa-solid fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                    <button @click="addSlot(day.id, 'break_times')" class="btn btn-xs btn-outline-secondary mt-1">
                      <i class="fas fa-plus me-1"></i> {{ locale.t('Add Break') }}
                    </button>
                  </div>
                </div>
                <div v-else class="text-center py-4 text-muted small italic">
                  <i class="fas fa-bed me-2"></i> {{ locale.t('Weekly day off') }}
                </div>
              </div>

              <div class="mt-3 pt-3 border-top text-end">
                <button class="btn btn-sm btn-success" :disabled="savingDay === day.id" @click="saveDay(day.id)">
                  <span v-if="savingDay === day.id" class="spinner-border spinner-border-sm"></span>
                  <i v-else class="fas fa-save me-1"></i> {{ locale.t('Save') }}
                </button>
              </div>

            </div>
          </div>
        </template>
      </div>

      <div class="sticky-bottom bg-white py-3 border-top mt-4">
        <button class="btn btn-success w-100 py-2 shadow fw-bold" :disabled="loading" @click="saveAll">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="fas fa-save me-2"></i>
          {{ loading ? locale.t('Saving...') : locale.t('Save Working Time') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Swal from "sweetalert2";

const API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "WorkingTimeConfig",
  
  inject: ['locale'],
  
  data() {
    return {
      loading: false,
      savingDay: null,
      dayList: [
        { id: "monday", active: true },
        { id: "tuesday", active: true },
        { id: "wednesday", active: true },
        { id: "thursday", active: true },
        { id: "friday", active: true },
        { id: "saturday", active: false },
        { id: "sunday", active: false }
      ],
      schedule: {
        monday: { working_hours: [], break_times: [] },
        tuesday: { working_hours: [], break_times: [] },
        wednesday: { working_hours: [], break_times: [] },
        thursday: { working_hours: [], break_times: [] },
        friday: { working_hours: [], break_times: [] },
        saturday: { working_hours: [], break_times: [] },
        sunday: { working_hours: [], break_times: [] }
      }
    };
  },
  mounted() {
    this.load();
  },
  methods: {
    async load() {
      try {
        const res = await fetch(`${API}/api/working-time`);
        if (!res.ok) throw new Error("Load failed");
        const data = await res.json();
        
        // ดึงจาก object ตามโครงสร้าง API: { id: ..., schedule: {...} }
        if (data?.schedule) {
          this.schedule = data.schedule;
          
          // เช็คการเปิด/ปิดสวิตช์อัตโนมัติ 
          // ถ้ามี working_hours แสดงว่าตั้งเป็นวันเปิดทำงานไว้
          this.dayList.forEach(d => {
            d.active = (this.schedule[d.id].working_hours && this.schedule[d.id].working_hours.length > 0);
          });
        }
      } catch (err) {
        console.error("Load error", err);
      }
    },

    addSlot(dayId, type) {
      // ตั้งค่าเริ่มต้น
      const defaultVal = type === 'working_hours' ? { start: "08:00", end: "12:00" } : { start: "12:00", end: "13:00" };
      this.schedule[dayId][type].push({ ...defaultVal });
    },

    removeSlot(dayId, type, index) {
      this.schedule[dayId][type].splice(index, 1);
    },

    // ฟังก์ชันสร้าง Payload เพื่อนำไปใช้กับ PUT request
    // สร้าง Payload เต็มสัปดาห์เสมอ
    buildPayload() {
      const payload = { schedule: {} };
      this.dayList.forEach(d => {
        // ถ้าวันนั้นเปิดใช้งาน ส่งข้อมูลไปตามปกติ ถ้าปิดสวิตช์ จะส่ง Array ว่าง
        payload.schedule[d.id] = d.active 
          ? this.schedule[d.id] 
          : { working_hours: [], break_times: [] };
      });
      return payload;
    },

    // ตรวจสอบความถูกต้องของข้อมูลรายวัน
    validateDay(dayId) {
      const dayObj = this.dayList.find(d => d.id === dayId);
      if (!dayObj.active) return ""; // ข้ามวันหยุด

      const { working_hours, break_times } = this.schedule[dayId];

      if (working_hours.length === 0) return `วัน ${dayId} ต้องระบุเวลาทำงานอย่างน้อย 1 ช่วง`;

      for (let i = 0; i < working_hours.length; i++) {
        const w = working_hours[i];
        if (!w.start || !w.end) return `กรุณากรอกเวลาทำงานให้ครบ (วัน ${dayId})`;
        if (w.start >= w.end) return `เวลาเลิกงานต้องมากกว่าเวลาเริ่มงาน (วัน ${dayId})`;

        // ตรวจสอบกะการทำงานทับซ้อนกันเอง
        for (let j = i + 1; j < working_hours.length; j++) {
          const nextW = working_hours[j];
          if (w.start < nextW.end && nextW.start < w.end) return `เวลาทำงานในวัน ${dayId} มีช่วงที่ทับซ้อนกัน`;
        }
      }

      for (const b of break_times) {
        if (!b.start || !b.end) return `กรุณากรอกเวลาพักให้ครบ (วัน ${dayId})`;
        if (b.start >= b.end) return `เวลาเริ่มพักต้องก่อนเวลาเลิกพัก (วัน ${dayId})`;
      }
      
      return "";
    },

    async saveDay(dayId) {
      const errorMsg = this.validateDay(dayId);
      if (errorMsg) return Swal.fire("ข้อมูลไม่ถูกต้อง", errorMsg, "warning");

      try {
        this.savingDay = dayId;
        
        // ส่ง Payload เต็มทั้งก้อน เพื่อรักษาโครงสร้างวันอื่นๆ ไว้ด้วย
        const payload = this.buildPayload();

        const res = await fetch(`${API}/api/working-time`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Save failed");
        
        Swal.fire({
          title: "สำเร็จ",
          text: `บันทึกการตั้งค่าวัน ${dayId} เรียบร้อยแล้ว`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
      } catch (err) {
        Swal.fire("Error", "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
      } finally {
        this.savingDay = null;
      }
    },

    async saveAll() {
      // ตรวจสอบทุกวันก่อนเซฟ
      for (const day of this.dayList) {
        const errorMsg = this.validateDay(day.id);
        if (errorMsg) return Swal.fire("ข้อมูลไม่ถูกต้อง", errorMsg, "warning");
      }

      try {
        this.loading = true;
        const payload = this.buildPayload();

        const res = await fetch(`${API}/api/working-time`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Save failed");
        
        Swal.fire({
          title: "สำเร็จ",
          text: "บันทึกการตั้งค่าตารางเวลาทั้งหมดเรียบร้อยแล้ว",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
      } catch (err) {
        Swal.fire("Error", "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", "error");
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.setting-card { max-width: 650px; }
.day-row { transition: all 0.2s ease-in-out; }
.btn-xs { padding: 0.2rem 0.6rem; font-size: 0.7rem; border-radius: 4px; }
.border-dashed { border-style: dashed !important; border-color: #dee2e6 !important; }
.italic { font-style: italic; }
.sticky-bottom { z-index: 1020; margin-bottom: -1rem; }
.btn-link { text-decoration: none; }
.btn-link:hover { opacity: 0.7; }

/* ปรับแต่งสไตล์ให้คลิกง่ายขึ้น */
.form-check-input { cursor: pointer; }
input[type="time"] { cursor: pointer; }
</style>