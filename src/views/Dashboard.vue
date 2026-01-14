<template>
  <div class="container mt-4">
    <div class="row">

      <div
        v-for="device in devices"
        :key="device.id"
        class="col-md-4"
      >
        <div class="card shadow-sm mb-4 p-3 text-center position-relative">

          <!-- STATUS DOT -->
          <span
            class="status-dot"
            :class="device.connected ? 'online' : 'offline'"
            title="connection status"
          ></span>

          <!-- Device Name -->
          <div class="fw-bold fs-5 mb-1">
            {{ device.name }}
          </div>

          <!-- Type -->
          <div class="text-muted small mb-2">
            Type : ON / OFF
          </div>

          <!-- ON / OFF -->
          <div
            class="onoff-circle mx-auto mb-3"
            :class="device.value ? 'on' : 'off'"
          ></div>

          <div
            class="onoff-text mb-3"
            :class="device.value ? 'text-success' : 'text-danger'"
          >
            {{ device.value ? "ON" : "OFF" }}
          </div>

          <!-- ACTION -->
          <div class="d-flex justify-content-center gap-2">
            <button
              class="btn btn-sm btn-outline-secondary"
              @click="device.expand = !device.expand"
            >
              {{ device.expand ? "Collapse" : "Expand" }}
            </button>

            <button
              class="btn btn-sm btn-outline-primary"
              @click="openChart(device)"
            >
              Chart
            </button>
          </div>

          <!-- EXPAND -->
          <div
            v-if="device.expand"
            class="mt-3 text-muted small"
          >
            <div>Address: {{ device.plc_address }}</div>
            <div>Refresh: {{ device.refresh_rate_ms }} ms</div>
            <div>
              Last update:
              {{ device.updated_at ? formatTime(device.updated_at) : "-" }}
            </div>
          </div>

        </div>
      </div>

      <div v-if="loading" class="text-muted text-center">
        Loading...
      </div>

      <div
        v-if="!loading && !devices.length"
        class="text-muted text-center"
      >
        No device
      </div>

    </div>
  </div>

  <!-- ===== Chart Modal ===== -->
  <div
    v-if="showChart"
    class="modal fade show"
    tabindex="-1"
    style="display: block"
  >
    <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content">

        <div class="modal-header">
          <h5 class="modal-title">
            Chart : {{ selectedDevice?.name }}
          </h5>
          <button
            type="button"
            class="btn-close"
            @click="closeChart"
          ></button>
        </div>

        <div class="modal-body">
          <Chart
            v-if="selectedDevice"
            :device="selectedDevice"
          />
        </div>

      </div>
    </div>
  </div>

  <div
    v-if="showChart"
    class="modal-backdrop fade show"
  ></div>
</template>

<script>
import Chart from "./Chart.vue";

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "Dashboard",

  components: {
    Chart,
  },

  props: {
    devices: {
      type: Array,
      required: true,
    },
  },

  data() {
    return {
      statusTimer: null,
      selectedDevice: null,
      showChart: false,
      loading: false,
    };
  },

  mounted() {
    this.startStatusPolling();
  },

  beforeUnmount() {
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
    }
  },

  methods: {
    openChart(device) {
      this.selectedDevice = device;
      this.showChart = true;
    },

    closeChart() {
      this.showChart = false;
      this.selectedDevice = null;
    },

    startStatusPolling() {
      this.loadStatus();
      this.statusTimer = setInterval(this.loadStatus, 1000);
    },

    async loadStatus() {
      try {
        const res = await fetch(`${BASE_API}/api/devices/status`);
        if (!res.ok) return;

        const statusList = await res.json();

        statusList.forEach(s => {
          const d = this.devices.find(x => x.id === s.id);
          if (d) {
            d.value = s.value;
            d.connected = s.connected;
            d.updated_at = s.value_updated_at;
          }
        });
      } catch (err) {
        console.error("STATUS ERROR:", err.message);
      }
    },

    formatTime(ts) {
      return new Date(ts).toLocaleString();
    },
  },
};
</script>

<style scoped>
/* STATUS DOT */
.status-dot {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-dot.online {
  background-color: #28a745;
  box-shadow: 0 0 6px rgba(40, 167, 69, 0.8);
}

.status-dot.offline {
  background-color: #dc3545;
  box-shadow: 0 0 6px rgba(220, 53, 69, 0.8);
}

/* ON / OFF UI */
.onoff-circle {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.onoff-circle.on {
  background-color: #28a745;
  box-shadow: 0 0 25px rgba(40, 167, 69, 0.6);
}

.onoff-circle.off {
  background-color: #dc3545;
  box-shadow: 0 0 25px rgba(220, 53, 69, 0.6);
}

.onoff-text {
  font-size: 2.5rem;
  font-weight: bold;
}
</style>
