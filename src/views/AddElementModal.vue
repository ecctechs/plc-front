<template>
  <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content border-0 shadow-lg">
        <!-- Header -->
        <div class="modal-header bg-light">
          <h5 class="modal-title fw-bold text-dark">{{ isEdit ? 'Edit Element' : 'Add New Element' }}</h5>
          <button class="btn-close" @click="$emit('close')"></button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <div class="row g-3">
            <!-- Element Type -->
            <div class="col-md-6">
              <label class="form-label fw-bold">Element Type</label>
              <select class="form-select" v-model="form.element_type">
                <option value="gauge_display">Gauge Display</option>
                <option value="number_display">Number Display</option>
                <option value="status_lamp">Status Lamp</option>
                <option value="control_button">Control Button</option>
              </select>
            </div>

            <!-- Name -->
            <div class="col-md-6">
              <label class="form-label fw-bold">Name</label>
              <input type="text" class="form-control" v-model="form.name" placeholder="เช่น Production Gauge" />
            </div>

            <!-- Device Selection -->
            <div class="col-md-6">
              <label class="form-label fw-bold">Device</label>
              <select class="form-select" v-model="form.device_id" @change="onDeviceChange">
                <option disabled value="">Select Device</option>
                <option v-for="d in devices" :key="d.id" :value="d.id">
                  {{ d.name }}
                </option>
              </select>
            </div>

            <!-- Address Selection -->
            <div class="col-md-6">
              <label class="form-label fw-bold">Address</label>
              <select class="form-select" v-model="form.address_id" :disabled="!form.device_id">
                <option disabled value="">Select Address</option>
                <option v-for="a in filteredAddresses" :key="a.id" :value="a.id">
                  {{ a.label }} ({{ a.plc_address }})
                </option>
              </select>
            </div>

            <!-- Position X -->
            <div class="col-md-3">
              <label class="form-label fw-bold">Position X (%)</label>
              <input type="number" class="form-control" v-model.number="form.x_percent" min="0" max="100" step="0.5" />
            </div>

            <!-- Position Y -->
            <div class="col-md-3">
              <label class="form-label fw-bold">Position Y (%)</label>
              <input type="number" class="form-control" v-model.number="form.y_percent" min="0" max="100" step="0.5" />
            </div>

            <!-- Size Width -->
            <div class="col-md-3">
              <label class="form-label fw-bold">Size Width</label>
              <input type="number" class="form-control" v-model.number="form.size_width" min="1" max="100" />
            </div>

            <!-- Size Height -->
            <div class="col-md-3">
              <label class="form-label fw-bold">Size Height</label>
              <input type="number" class="form-control" v-model.number="form.size_height" min="1" max="100" />
            </div>

            <!-- Display Options - Only for gauge/number display -->
            <template v-if="['gauge_display', 'number_display'].includes(form.element_type)">
              <div class="col-md-3">
                <label class="form-label fw-bold">Unit</label>
                <input type="text" class="form-control" v-model="form.unit" placeholder="เช่น pcs, %, °C" />
              </div>

              <div class="col-md-3">
                <label class="form-label fw-bold">Precision (Decimals)</label>
                <input type="number" class="form-control" v-model.number="form.precision" min="0" max="10" />
              </div>
            </template>

            <!-- Button Options - Only for control_button -->
            <template v-if="form.element_type === 'control_button'">
              <div class="col-md-4">
                <label class="form-label fw-bold">Button Label</label>
                <input type="text" class="form-control" v-model="form.button_label" placeholder="เช่น START, STOP" />
              </div>

              <div class="col-md-4">
                <label class="form-label fw-bold">Active Color</label>
                <input type="color" class="form-control form-control-color" v-model="form.active_color" />
              </div>

              <div class="col-md-4">
                <label class="form-label fw-bold">Inactive Color</label>
                <input type="color" class="form-control form-control-color" v-model="form.inactive_color" />
              </div>
            </template>

            <!-- Styling Options -->
            <div class="col-md-4">
              <label class="form-label fw-bold">Background Color</label>
              <div class="input-group">
                <input type="color" class="form-control form-control-color" v-model="form.bg_color" />
                <button class="btn btn-outline-secondary" @click="form.bg_color = null" v-if="form.bg_color">Clear</button>
              </div>
            </div>

            <div class="col-md-4">
              <label class="form-label fw-bold">Text Color</label>
              <input type="color" class="form-control form-control-color" v-model="form.text_color" />
            </div>

            <div class="col-md-4">
              <label class="form-label fw-bold">Font Size</label>
              <input type="number" class="form-control" v-model.number="form.font_size" min="8" max="72" />
            </div>

            <!-- Display Order -->
            <div class="col-md-4">
              <label class="form-label fw-bold">Display Order</label>
              <input type="number" class="form-control" v-model.number="form.display_order" min="0" />
            </div>

            <!-- Visibility -->
            <div class="col-md-4">
              <label class="form-label fw-bold">Visibility</label>
              <div class="form-check form-switch mt-2">
                <input class="form-check-input" type="checkbox" v-model="form.is_visible" />
                <label class="form-check-label">Visible</label>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer bg-light border-0">
          <button class="btn btn-outline-secondary px-4" @click="$emit('close')">
            Cancel
          </button>
          <button class="btn btn-primary px-4" :disabled="!canSubmit" @click="submit">
            {{ isEdit ? 'Update' : 'Add Element' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const BASE_API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default {
  name: "AddElementModal",

  props: {
    layoutId: {
      type: Number,
      required: true
    },
    editData: {
      type: Object,
      default: null
    }
  },

  emits: ['close', 'saved'],

  data() {
    return {
      devices: [],
      form: {
        layout_id: this.layoutId,
        element_type: 'gauge_display',
        name: '',
        x_percent: 0,
        y_percent: 0,
        size_width: 10,
        size_height: 30,
        font_size: null,
        bg_color: null,
        text_color: '#ffffff',
        unit: '',
        precision: 0,
        active_color: null,
        inactive_color: null,
        button_label: null,
        device_id: null,
        address_id: null,
        display_order: 0,
        is_visible: true
      }
    };
  },

  computed: {
    isEdit() {
      return !!this.editData;
    },

    selectedDevice() {
      return this.devices.find(d => d.id === this.form.device_id);
    },

    filteredAddresses() {
      return this.selectedDevice?.addresses || [];
    },

    canSubmit() {
      return this.form.device_id && this.form.address_id && this.form.name;
    }
  },

  async mounted() {
    // Load devices for selection
    await this.fetchDevices();

    // If editing, populate form with existing data
    if (this.editData) {
      this.populateForm();
    }
  },

  methods: {
    async fetchDevices() {
      try {
        const res = await fetch(`${BASE_API}/api/devices`);
        const data = await res.json();
        this.devices = data;
      } catch (err) {
        console.error('Failed to load devices:', err);
        this.devices = [];
      }
    },

    onDeviceChange() {
      // Reset address when device changes
      this.form.address_id = null;
    },

    populateForm() {
      if (!this.editData) return;
      
      // Copy all properties from editData to form
      Object.keys(this.form).forEach(key => {
        if (this.editData[key] !== undefined) {
          this.form[key] = this.editData[key];
        }
      });
    },

    async submit() {
      if (!this.canSubmit) return;

      try {
        const url = this.isEdit 
          ? `${BASE_API}/interaction/elements/${this.editData.id}`
          : `${BASE_API}/interaction/elements`;

        const method = this.isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Element saved successfully:', result);

        this.$emit('saved', result);
      } catch (err) {
        console.error('Failed to save element:', err);
        alert('Failed to save element: ' + err.message);
      }
    }
  }
};
</script>

<style scoped>
.modal-lg {
  max-width: 800px;
}

.form-control-color {
  width: 100%;
  height: 38px;
  padding: 4px;
  cursor: pointer;
}
</style>
