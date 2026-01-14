<template>
  <div class="card shadow-sm setting-card mx-auto mt-4">
    <div class="card-body">

      <h4 class="mb-4">Working Time Setting (Global)</h4>

      <!-- ===== Working Day ===== -->
      <div class="mb-4">
        <label class="form-label">Working Day</label>

        <div class="d-flex flex-wrap gap-3">
          <div
            v-for="d in days"
            :key="d.value"
            class="form-check"
          >
            <input
              class="form-check-input"
              type="checkbox"
              :value="d.value"
              v-model="form.working_days"
            />
            <label class="form-check-label">
              {{ d.label }}
            </label>
          </div>
        </div>
      </div>

      <!-- ===== Working Hour ===== -->
      <div class="mb-4">
        <label class="form-label">Working Hour</label>

        <div class="row g-2">
          <div class="col-6">
            <input
              type="time"
              v-model="form.start_time"
              class="form-control"
            />
          </div>
          <div class="col-6">
            <input
              type="time"
              v-model="form.end_time"
              class="form-control"
            />
          </div>
        </div>
      </div>

      <!-- ===== Break Time ===== -->
      <div class="mb-4">
        <label class="form-label">Break Time (Optional)</label>

        <div class="row g-2">
          <div class="col-6">
            <input
              type="time"
              v-model="form.break_start"
              class="form-control"
            />
          </div>
          <div class="col-6">
            <input
              type="time"
              v-model="form.break_end"
              class="form-control"
            />
          </div>
        </div>

        <small class="text-muted">
          เว้นว่างไว้ถ้าไม่มีช่วงพัก
        </small>
      </div>

      <!-- ===== Error ===== -->
      <div v-if="error" class="alert alert-danger py-2">
        {{ error }}
      </div>

      <!-- ===== Action ===== -->
      <button
        class="btn btn-success w-100"
        :disabled="loading"
        @click="save"
      >
        <span v-if="loading">Saving...</span>
        <span v-else>Save Working Time</span>
      </button>

    </div>
  </div>
</template>

<script>
import Swal from "sweetalert2";

const API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "WorkingTimeForm",

  data() {
    return {
      form: {
        working_days: [],
        start_time: "",
        end_time: "",
        break_start: null,
        break_end: null,
      },

      error: "",
      loading: false,

      days: [
        { label: "Mon", value: "mon" },
        { label: "Tue", value: "tue" },
        { label: "Wed", value: "wed" },
        { label: "Thu", value: "thu" },
        { label: "Fri", value: "fri" },
        { label: "Sat", value: "sat" },
        { label: "Sun", value: "sun" },
      ],
    };
  },

  mounted() {
    this.load();
  },

  methods: {
    /* ================= Load ================= */
    async load() {
      try {
        const res = await fetch(`${API}/api/working-time`);

        if (!res.ok) {
          throw new Error("Load failed");
        }

        const data = await res.json();

        if (data) {
          this.form = {
            working_days: data.working_days || [],
            start_time: data.start_time,
            end_time: data.end_time,
            break_start: data.break_start,
            break_end: data.break_end,
          };
        }
      } catch (err) {
        await Swal.fire({
          icon: "error",
          title: "Load failed",
          text: "ไม่สามารถโหลด Working Time ได้",
        });
      }
    },

    /* ================= Utils ================= */
    timeToMin(t) {
      if (!t) return null;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    },

    /* ================= Validate ================= */
    validate() {
      const start = this.timeToMin(this.form.start_time);
      const end   = this.timeToMin(this.form.end_time);
      const bs    = this.timeToMin(this.form.break_start);
      const be    = this.timeToMin(this.form.break_end);

      if (start === null || end === null) {
        return "กรุณากรอกเวลาเริ่ม และ เวลาสิ้นสุด";
      }

      if (start >= end) {
        return "Start time ต้องน้อยกว่า End time";
      }

      if ((bs !== null && be === null) || (bs === null && be !== null)) {
        return "ถ้ามี Break ต้องใส่ทั้ง Start และ End";
      }

      if (bs !== null && be !== null) {
        if (bs >= be) {
          return "Break start ต้องน้อยกว่า Break end";
        }

        if (bs < start || be > end) {
          return "Break ต้องอยู่ในช่วงเวลาทำงาน";
        }
      }

      return "";
    },

    /* ================= Save ================= */
    async save() {
      this.error = this.validate();
      if (this.error) return;

      try {
        this.loading = true;

        const res = await fetch(`${API}/api/working-time`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.form),
        });

        // ✅ เช็ค HTTP status
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Save failed");
        }

        await Swal.fire({
          icon: "success",
          title: "Saved",
          text: "Working time has been updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });

      } catch (err) {
        await Swal.fire({
          icon: "error",
          title: "Error",
          text: err.message || "ไม่สามารถบันทึกข้อมูลได้",
        });
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.setting-card {
  max-width: 600px;
}
</style>
