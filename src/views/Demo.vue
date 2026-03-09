<template>
  <div class="container py-3">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="mb-0"> Demo / Simulate Mode</h5>

      <div class="form-check form-switch">
        <input
          class="form-check-input"
          type="checkbox"
          :checked="isSimulate"
          @change="$emit('update:is-simulate', $event.target.checked)"
        />
        <label class="form-check-label fw-bold">
          Simulate Mode {{ isSimulate ? 'ON' : 'OFF' }}
        </label>
      </div>
    </div>

    <div class="row row-cols-1 row-cols-md-2 row-cols-xl-5 g-3">
      <div
        v-for="device in displayDevices"
        :key="device.address_id"
        class="col"
      >
        <div class="card shadow-sm h-100 " :class="{ 'opacity-75': !isSimulate }">
          <div class="card-body">
            
            <div class="d-flex justify-content-between mb-3">
              <div>
                <div class="fw-bold">{{ device.label }}</div>
                <small class="text-muted text-uppercase" style="font-size: 0.7rem;">
                  {{ device.plc_address }} · {{ device.data_type }}
                </small>
              </div>
              <!-- <span
                class="badge"
                :class="device.is_connected ? 'bg-success' : 'bg-secondary'"
              >
                {{ device.is_connected ? 'Connected' : 'Offline' }}
              </span> -->
            </div>

            <div class="my-4">
              <template v-if="device.data_type === 'onoff'">
                <div class="d-flex justify-content-center">
                  <div class="btn-group w-100" role="group">
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="device.last_value === 0 ? 'btn-danger' : 'btn-outline-danger'"
                      :disabled="!isSimulate"
                      @click="onInputChange(device, false)"
                    >
                      OFF
                    </button>

                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="device.last_value === 1 ? 'btn-success' : 'btn-outline-success'"
                      :disabled="!isSimulate"
                      @click="onInputChange(device, true)"
                    >
                      ON
                    </button>
                  </div>
                </div>
              </template>

              <template v-else-if="hasRange(device)">
                <div class="mb-3">
                  <div class="d-flex justify-content-between mb-1">
                    <span class="small text-muted">Value: <strong>{{ device.last_value ?? 0 }}</strong></span>
                    <span class="small text-muted">{{ device.min }} - {{ device.max }}</span>
                  </div>
                  
                  <input 
                    type="range" 
                    class="form-range" 
                    :min="device.min" 
                    :max="device.max" 
                    step="0.01"
                    :value="device.last_value ?? 0"
                    :disabled="!isSimulate"
                    @input="onInputChange(device, $event.target.value)"
                  >

                  <input
                    type="number"
                    class="form-control form-control-sm mt-2"
                    :value="device.last_value"
                    :disabled="!isSimulate"
                    @input="onInputChange(device, $event.target.value)"
                  />
                </div>
              </template>
            </div>

            <!-- <div class="d-flex justify-content-between align-items-center mt-auto border-top pt-3">
              <button
                class="btn btn-sm"
                :class="isAuto(device) ? 'btn-danger' : 'btn-outline-primary'"
                :disabled="!isSimulate"
                @click="$emit('toggle-auto', device)"
              >
                <i class="bi" :class="isAuto(device) ? 'bi-stop-fill' : 'bi-play-fill'"></i>
                {{ isAuto(device) ? 'Stop Auto' : 'Auto Random' }}
              </button>

              <small class="text-muted" style="font-size: 0.75rem;">
                {{ formatTime(device.updated_at) }}
              </small>
            </div> -->

          </div>
        </div>
      </div>
    </div>

    <div v-if="!devices.length" class="text-center text-muted py-5">
      No devices found.
    </div>
  </div>
</template>

<script>
export default {
  name: 'Demo',
  props: {
    devices: Array,
    isSimulate: Boolean,
    autoTimers: Object // รับ Set() มาจาก App.vue
  },
  emits: ['update:is-simulate', 'update-device', 'toggle-auto'],

  computed: {
    displayDevices() {
      return this.devices.map(d => ({
        ...d,
        min: d.min ?? 0,
        max: d.max ?? 100
      }));
    }
  },

  methods: {
    hasRange(device) {
      const types = ['number', 'number_gauge', 'level'];
      return types.includes(device.data_type);
    },

    isAuto(device) {
      return this.autoTimers.has(device.address_id);
    },

    onInputChange(device, newValue) {
      if (!this.isSimulate) return;

      let val;
      if (device.data_type === 'onoff') {
        val = newValue ? 1 : 0;
      } else {
        val = parseFloat(newValue) || 0;
        // Clamp value
        val = Math.min(device.max, Math.max(device.min, val));
      }

      this.$emit('update-device', {
        address_id: device.address_id,
        value: val
      });
    },

    formatTime(ts) {
      return ts ? new Date(ts).toLocaleTimeString() : '-';
    }
  }
};
</script>
