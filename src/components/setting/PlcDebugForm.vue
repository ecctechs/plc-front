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
const BASE_API = import.meta.env.VITE_API_BASE_URL;

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
      this.error = "";
      this.loading = true;

      try {
        const res = await fetch(
          `${BASE_API}/api/plc/read?address=${this.address}`
        );

        const data = await res.json();

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
      this.readOnce();
      this.timer = setInterval(this.readOnce, this.interval);
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
