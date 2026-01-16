<template>
  <div class="p-3">
    <h3 class="mb-4">DEMO MODE (Simulation)</h3>
    <div class="form-check form-switch">
      <input
        class="form-check-input"
        type="checkbox"
        :checked="model"
        @change="onChange"
      >
      <label class="form-check-label">
        Simulate Mode
      </label>
    </div>
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
      <div v-for="device in devices" :key="device.id" class="col">
        <div class="card shadow-sm h-100">
          
          <div class="card-header bg-light d-flex align-items-center gap-2 py-1">
            <span class="fw-bold">{{ device.name }}</span>
            <span class="badge rounded-pill bg-secondary text-lowercase" style="font-size: 0.7rem;">
              {{ device.data_display_type }}
            </span>
          </div>

          <div class="card-body" style="min-height: 120px;">
            
            <div v-if="device.data_display_type === 'onoff'">
              <div class="mb-3">
                Status: 
                <span :class="['badge', device.value ? 'bg-success' : 'bg-danger']">
                  {{ device.value ? 'ON' : 'OFF' }}
                </span>
              </div>
              <div class="d-flex gap-2">
                <button 
                  class="btn btn-success w-50 py-2" 
                  @click="emitUpdate(device, 1)"
                >ON</button>
                <button 
                  class="btn btn-danger w-50 py-2" 
                  @click="emitUpdate(device, 0)"
                >OFF</button>
              </div>
            </div>

            <div v-else-if="device.data_display_type === 'number' || device.data_display_type === 'number_gauge'">
              <div class="mb-2">Value: <strong>{{ Number(device.value).toFixed(2) }}</strong></div>
              <input 
                type="range" 
                class="form-range" 
                :value="device.value"
                min="0" max="100" step="0.01"
                @input="emitUpdate(device, $event.target.value)"
              >
              <input 
                type="number" 
                class="form-control mt-2" 
                :value="device.value"
                @change="emitUpdate(device, $event.target.value)"
              >
            </div>

          </div>

          <div 
            class="card-footer bg-light text-center py-1 cursor-pointer" 
            style="cursor: pointer;"
            @click="toggleAuto(device)"
          >
            <small :class="device._timer ? 'text-primary fw-bold' : 'text-muted'">
              {{ device._timer ? 'Stop Simulation' : 'Simulation Control' }}
            </small>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "Demo",
  props: {
    devices: { type: Array, required: true },
  model: {
      type: Boolean,
      default: false
    }
  },
  emits: ["update"],
  methods: {
    onChange(e) {
      this.$emit("update", e.target.checked); // ⭐ emit boolean
    },
    // ส่ง Event ไปหา Parent
    emitUpdate(device, newValue) {
      let val = newValue;
      // กรองประเภทข้อมูล
      if (device.data_display_type !== 'onoff') {
        val = parseFloat(newValue) || 0;
        device.value = val;
      }else if(device.data_display_type == 'onoff'){
        device.value = newValue;
      }

      this.$emit('update-device', {
        ...device,
        value: val,
        connected: true,
        updated_at: new Date()
      });
    },

    toggleAuto(device) {
      if (device._timer) {
        clearInterval(device._timer);
        this.$emit('update-device', { ...device, _timer: null });
      } else {
        const timer = setInterval(() => {
          let randomVal;
          if (device.data_display_type === 'onoff') {
            randomVal = Math.random() >= 0.5;
          } else {
            randomVal = (Math.random() * 100).toFixed(2);
          }
          this.emitUpdate(device, randomVal);
        }, 2000);

        this.$emit('update-device', { ...device, _timer: timer });
      }
    }
  },
  beforeUnmount() {
    this.devices.forEach(d => { if (d._timer) clearInterval(d._timer); });
  }
};
</script>

<style scoped>
.card { border-radius: 4px; border: 1px solid #ddd; }
.card-header { font-size: 0.9rem; border-bottom: 1px solid #eee; }
.card-footer { border-top: 1px solid #eee; transition: 0.2s; }
.card-footer:hover { background-color: #f0f0f0 !important; }
.btn { border-radius: 4px; font-weight: bold; }
</style>