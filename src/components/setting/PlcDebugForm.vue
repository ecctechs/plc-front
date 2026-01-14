<template>
  <div class="border rounded p-3 mb-4">
    <h6 class="mb-2">
      PLC Address Debug (Test)
    </h6>

    <!-- PLC Address -->
    <div class="mb-3">
      <label class="form-label">PLC Address</label>
      <input
        v-model="address"
        class="form-control"
        placeholder="M0, D10"
      />
    </div>

    <!-- Interval -->
    <div class="mb-3">
      <label class="form-label">Interval (ms)</label>
      <input
        type="number"
        min="500"
        v-model.number="interval"
        class="form-control"
      />
      <small class="text-muted">
        แนะนำ ≥ 1000 ms สำหรับ debug
      </small>
    </div>

    <!-- Action -->
    <div class="d-flex gap-2 mb-3">
      <button
        class="btn btn-sm btn-outline-primary"
        @click="readOnce"
        :disabled="loading"
      >
        ▶ Test Read
      </button>

      <button
        class="btn btn-sm btn-outline-secondary"
        @click="togglePolling"
        :disabled="loading"
      >
        {{ timer ? "⏸ Stop" : "⏱ Start Polling" }}
      </button>
    </div>

    <!-- Result -->
    <div v-if="result" class="alert alert-light py-2">
      <div><strong>Value:</strong> {{ result.value }}</div>
      <div><strong>Updated:</strong> {{ result.time }}</div>
    </div>

    <div v-if="error" class="alert alert-danger py-2">
      {{ error }}
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
      if (this.timer) {
        this.stopPolling();
      } else {
        this.startPolling();
      }
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
