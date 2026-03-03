<template>
  <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,.5)">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow">
        <!-- Header -->
        <div class="modal-header bg-dark text-white">
          <h5 class="modal-title">Add Dashboard Card</h5>
          <button class="btn-close btn-close-white" @click="$emit('close')"></button>
        </div>

        <!-- Body -->
        <div class="modal-body">

          <!-- Device -->
          <div class="mb-3">
            <label class="form-label fw-bold">Device</label>
            <select class="form-select" v-model="selectedDeviceId">
              <option disabled value="">Select Device</option>
              <option
                v-for="d in devices"
                :key="d.id"
                :value="d.id"
              >
                {{ d.name }}
              </option>
            </select>
          </div>

          <!-- Address -->
          <div class="mb-3">
            <label class="form-label fw-bold">Address</label>
            <select
              class="form-select"
              v-model="selectedAddressId"
              :disabled="!selectedDeviceId"
            >
              <option disabled value="">Select Address</option>
              <option
                v-for="a in filteredAddresses"
                :key="a.id"
                :value="a.id"
              >
                {{ a.label }} ({{ a.plc_address }})
              </option>

            </select>
          </div>

          <!-- Display Type -->
          <div class="mb-3" v-if="selectedAddress">
            <label class="form-label fw-bold">Display Type</label>
            <select
              class="form-select"
              v-model="selectedDisplayType"
            >
              <option disabled value="">Select Display Type</option>
              <option value="onoff">ON/OFF</option>
              <option value="number">Number</option>
              <option value="number_gauge">Gauge</option>
              <option value="level">Level</option>
            </select>
          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-outline-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button
            class="btn btn-primary"
            :disabled="!canSubmit"
            @click="submit"
          >
            Add Card
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "AddDashboardCardModal",

  data() {
    return {
      selectedDeviceId: "",
      selectedAddressId: "",
      selectedDisplayType: "",
      devices: []
    };
  },

  async mounted() {
    try {
      const res = await fetch(`${BASE_API}/api/devices`);
      const data = await res.json();
      this.devices = data;
    } catch (err) {
      console.error("Failed to load devices:", err);
      this.devices = [];
    }
  },

  computed: {

    selectedDevice() {
      return this.devices.find(
        d => d.id === this.selectedDeviceId
      );
    },

    filteredAddresses() {
      return this.selectedDevice?.addresses || [];
    },

    selectedAddress() {
      return this.filteredAddresses.find(
        a => a.id === this.selectedAddressId
      );
    },

    canSubmit() {
      return !!this.selectedAddress && !!this.selectedDisplayType;
    }
  },

  methods: {
    async submit() {
      try {
        // POST to API
        await fetch(`${BASE_API}/api/dashboard/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address_id: this.selectedAddress.id,
            display_type: this.selectedDisplayType
          })
        });
        
        // Emit success event
        this.$emit("add", {
          address_id: this.selectedAddress.id,
          display_type: this.selectedDisplayType
        });
      } catch (err) {
        console.error("Failed to add card:", err);
        // Optionally emit error event or show alert
      }
    }
  }
};

</script>
