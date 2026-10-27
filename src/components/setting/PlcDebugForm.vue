<template>
  <div class="card shadow-sm">
    <div class="card-body p-4">
      <h5 class="fw-bold mb-4">
        <i class="bi bi-terminal text-primary me-2"></i>PLC Debug
      </h5>
    <div class="border rounded p-3 mb-4">
    <!-- ===== One Row ===== -->
    <div class="row g-2 align-items-end mb-3">

      <!-- Address -->
      <div class="col-4">
        <label class="form-label small">PLC Address</label>
        <input
          v-model="address"
          class="form-control"
          placeholder="M0, D10"
        />
      </div>

      <!-- Interval -->
      <div class="col-3">
        <label class="form-label small">Interval (ms)</label>
        <input
          type="number"
          min="500"
          v-model.number="interval"
          class="form-control"
        />
      </div>

      <!-- Actions -->
      <div class="col-5 d-flex gap-2">
        <button
          class="btn btn-sm btn-outline-primary w-100"
          @click="readOnce"
          :disabled="loading"
        >
          ▶ Test
        </button>

        <button
          class="btn btn-sm btn-outline-secondary w-100"
          @click="togglePolling"
          :disabled="loading"
        >
          {{ timer ? "⏸ Stop" : "⏱ Poll" }}
        </button>
      </div>

    </div>

    <!-- ===== Result ===== -->
    <div v-if="result" class="alert alert-light py-2 mb-2">
      <strong>Value:</strong> {{ result.value }}
      <span class="text-muted ms-2">
        ({{ result.time }})
      </span>
    </div>

    <div v-if="error" class="alert alert-danger py-2">
      {{ error }}
    </div>
  </div>
    </div>
  </div>
</template>

<script>
import { BASE_API, authH } from '../../utils/api';

const MIN_INTERVAL = 500;

export default {
  name: "PlcDebugForm",

  data() {
    return {
      address: "M0",
      interval: 1000,
      timer: null,
      loading: false,
      result: null,
      error: "",
    };
  },

  beforeUnmount() {
    this.stopPolling();
  },

  methods: {
    async readOnce() {
      // request ก่อนหน้ายังไม่กลับ (PLC ตอบช้ากว่า interval) → ข้ามรอบนี้ ไม่ยิงซ้อน
      if (this.loading) return;
      this.error = "";
      this.loading = true;

      try {
        const res = await fetch(
          `${BASE_API}/api/plc/read?address=${encodeURIComponent(this.address)}`,
          { headers: authH() }
        );

        // error บางแบบไม่ได้ส่ง JSON กลับมา → อย่าให้ขึ้น SyntaxError
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "Read failed");
        }

        this.result = {
          value: data.value,
          time: new Date().toLocaleTimeString(),
        };
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    togglePolling() {
      this.timer ? this.stopPolling() : this.startPolling();
    },

    startPolling() {
      // ไม่ให้มี timer ค้างซ้อน และไม่ให้ interval ต่ำกว่า 500ms
      this.stopPolling();
      const ms = Math.max(MIN_INTERVAL, Number(this.interval) || 1000);
      this.interval = ms;
      this.readOnce();
      this.timer = setInterval(this.readOnce, ms);
    },

    stopPolling() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
  },
};
</script>
