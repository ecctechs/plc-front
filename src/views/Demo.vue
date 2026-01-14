<template>
  <div class="container mt-4">
    <h4 class="mb-3">Demo / Simulation</h4>

    <div
      v-for="device in devices"
      :key="device.id"
      class="card shadow-sm mb-3 p-3"
    >
      <strong>{{ device.name }}</strong>

      <div class="mt-2">
        Status:
        <span :class="device.value ? 'text-success' : 'text-danger'">
          {{ device.value ? "ON" : "OFF" }}
        </span>
      </div>

      <button
        class="btn btn-sm btn-outline-primary mt-2 me-2"
        @click="manualToggle(device)"
      >
        Manual Toggle
      </button>

      <button
        class="btn btn-sm btn-outline-secondary mt-2"
        @click="toggleAuto(device)"
      >
        {{ device._timer ? "Stop Auto" : "Start Auto" }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "Demo",

  props: {
    devices: {
      type: Array,
      required: true,
    },
  },

  beforeUnmount() {
    this.devices.forEach(d => {
      if (d._timer) clearInterval(d._timer);
    });
  },

  methods: {
    manualToggle(device) {
      device.value = !device.value;
      device.connected = true;
      device.updated_at = new Date();
    },

    toggleAuto(device) {
      if (device._timer) {
        clearInterval(device._timer);
        device._timer = null;
        return;
      }

      device._timer = setInterval(() => {
        device.value = Math.random() >= 0.5;
        device.connected = true;
        device.updated_at = new Date();
      }, device.refresh_rate_ms || 1000);
    },
  },
};
</script>
