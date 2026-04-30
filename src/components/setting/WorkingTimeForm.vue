<template>
  <div class="card shadow-sm border-0">
    <div class="card-body p-4">
      <div class="mb-4">
        <h5 class="fw-bold text-dark">
          <i class="bi bi-clock text-primary me-2"></i>{{ locale.t('Working Time') }}
        </h5>
        <p class="text-muted small">{{ locale.t('Define work and break schedules') }}</p>
      </div>

      <!-- ปรับจาก col-6 เป็นการใช้ Responsive Grid -->
      <div class="row g-4">
        <div v-for="day in dayList" :key="day.id" class="col-12 col-md-6 col-lg-6">
          <div 
            class="day-row p-3 border rounded-3 shadow-sm h-100 d-flex flex-column transition-all"
            :class="{'bg-light opacity-75': !day.active, 'border-primary-subtle bg-white': day.active}"
          >
            
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="text-primary mb-0 fw-bold text-capitalize">
                {{ day.id }}
              </h6>
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" v-model="day.active" :id="'switch-' + day.id">
              </div>
            </div>

            <div class="flex-grow-1">
              <div v-if="day.active">
                <!-- Working Hours Section -->
                <div class="mb-3">
                  <label class="form-label mb-2 fw-semibold text-secondary small text-uppercase d-block">
                    <i class="far fa-clock me-1"></i> {{ locale.t('Working Hours') }}
                  </label>
                  <div v-for="(slot, idx) in schedule[day.id].working_hours" :key="'w-'+idx" class="row g-2 mb-2 align-items-center">
                    <div class="col-5">
                      <input type="time" v-model="slot.start" class="form-control form-control-sm shadow-none">
                    </div>
                    <div class="col-5">
                      <input type="time" v-model="slot.end" class="form-control form-control-sm shadow-none">
                    </div>
                    <div class="col-2 text-center">
                      <button @click="removeSlot(day.id, 'working_hours', idx)" class="btn btn-sm btn-outline-danger">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                  <button @click="addSlot(day.id, 'working_hours')" class="btn btn-xs btn-primary-light mt-1">
                    <i class="fas fa-plus me-1"></i> {{ locale.t('Add Shift') }}
                  </button>
                </div>

                <!-- Break Times Section -->
                <div class="mb-2">
                  <label class="form-label mb-2 fw-semibold text-secondary small text-uppercase d-block">
                    <i class="fas fa-mug-hot me-1"></i> {{ locale.t('Break Times') }}
                  </label>
                  <div v-for="(slot, idx) in schedule[day.id].break_times" :key="'b-'+idx" class="row g-2 mb-2 align-items-center">
                    <div class="col-5">
                      <input type="time" v-model="slot.start" class="form-control form-control-sm border-dashed shadow-none">
                    </div>
                    <div class="col-5">
                      <input type="time" v-model="slot.end" class="form-control form-control-sm border-dashed shadow-none">
                    </div>
                    <div class="col-2 text-center">
                      <button @click="removeSlot(day.id, 'break_times', idx)" class="btn btn-sm btn-outline-danger">
                        <i class="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                  <button @click="addSlot(day.id, 'break_times')" class="btn btn-xs btn-outline-secondary mt-1">
                    <i class="fas fa-plus me-1"></i> {{ locale.t('Add Break') }}
                  </button>
                </div>
              </div>
              
              <!-- Off Day State -->
              <div v-else class="text-center py-5 text-muted small italic">
                <i class="fas fa-moon mb-2 d-block fa-2x opacity-25"></i>
                {{ locale.t('Weekly day off') }}
              </div>
            </div>

            <!-- Single Day Save Button -->
            <div class="mt-3 pt-3 border-top">
              <button class="btn btn-sm btn-light text-success w-100 fw-bold" :disabled="savingDay === day.id" @click="saveDay(day.id)">
                <span v-if="savingDay === day.id" class="spinner-border spinner-border-sm"></span>
                <i v-else class="fas fa-check me-1"></i> {{ locale.t('Save') }}
              </button>
            </div>

          </div>
        </div>
      </div>

      <!-- Main Save All Button -->
      <div class="sticky-bottom bg-white py-3 border-top mt-5">
        <button class="btn btn-success w-100 py-3 shadow-sm fw-bold" :disabled="loading" @click="saveAll">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="fas fa-save me-2"></i>
          {{ loading ? locale.t('Saving...') : locale.t('Save All Working Time Settings') }}
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
        
        if (data?.schedule) {
          this.schedule = data.schedule;
          this.dayList.forEach(d => {
            d.active = (this.schedule[d.id].working_hours && this.schedule[d.id].working_hours.length > 0);
          });
        }
      } catch (err) {
        console.error("Load error", err);
      }
    },
    addSlot(dayId, type) {
      const defaultVal = type === 'working_hours' ? { start: "08:00", end: "17:00" } : { start: "12:00", end: "13:00" };
      this.schedule[dayId][type].push({ ...defaultVal });
    },
    removeSlot(dayId, type, index) {
      this.schedule[dayId][type].splice(index, 1);
    },
    buildPayload() {
      const payload = { schedule: {} };
      this.dayList.forEach(d => {
        payload.schedule[d.id] = d.active 
          ? this.schedule[d.id] 
          : { working_hours: [], break_times: [] };
      });
      return payload;
    },
    validateDay(dayId) {
      const dayObj = this.dayList.find(d => d.id === dayId);
      if (!dayObj.active) return "";
      const { working_hours, break_times } = this.schedule[dayId];
      if (working_hours.length === 0) return `วัน ${dayId} ต้องระบุเวลาทำงานอย่างน้อย 1 ช่วง`;
      for (const w of working_hours) {
        if (!w.start || !w.end) return `กรุณากรอกเวลาทำงานให้ครบ (วัน ${dayId})`;
        if (w.start >= w.end) return `เวลาเลิกงานต้องมากกว่าเวลาเริ่มงาน (วัน ${dayId})`;
      }
      return "";
    },
    async saveDay(dayId) {
      const errorMsg = this.validateDay(dayId);
      if (errorMsg) return Swal.fire("ข้อมูลไม่ถูกต้อง", errorMsg, "warning");
      try {
        this.savingDay = dayId;
        const res = await fetch(`${API}/api/working-time`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.buildPayload())
        });
        if (!res.ok) throw new Error("Save failed");
        Swal.fire({ title: "สำเร็จ", text: `บันทึกวัน ${dayId} แล้ว`, icon: "success", timer: 1000, showConfirmButton: false });
      } catch (err) {
        Swal.fire("Error", "ไม่สามารถบันทึกได้", "error");
      } finally {
        this.savingDay = null;
      }
    },
    async saveAll() {
      for (const day of this.dayList) {
        const errorMsg = this.validateDay(day.id);
        if (errorMsg) return Swal.fire("ข้อมูลไม่ถูกต้อง", errorMsg, "warning");
      }
      try {
        this.loading = true;
        const res = await fetch(`${API}/api/working-time`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.buildPayload())
        });
        if (!res.ok) throw new Error("Save failed");
        Swal.fire({ title: "สำเร็จ", text: "บันทึกทั้งหมดเรียบร้อยแล้ว", icon: "success", timer: 1500, showConfirmButton: false });
      } catch (err) {
        Swal.fire("Error", "เกิดข้อผิดพลาด", "error");
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.day-row {
  transition: transform 0.2s, box-shadow 0.2s;
  background-color: #fff;
}
.day-row:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.05) !important;
}
.btn-xs {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  border-radius: 6px;
}
.btn-primary-light {
  background-color: #e7f1ff;
  color: #0d6efd;
  border: none;
}
.btn-primary-light:hover {
  background-color: #0d6efd;
  color: white;
}
.border-dashed {
  border-style: dashed !important;
}
.transition-all {
  transition: all 0.3s ease;
}
.sticky-bottom {
  position: sticky;
  bottom: -1.5rem;
  z-index: 1020;
}
/* ปรับแต่ง Input Time ให้ดูสะอาดตาขึ้น */
input[type="time"] {
  border-radius: 8px;
  border: 1px solid #eee;
}
</style>