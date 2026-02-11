<template>
  <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,.5)">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow">
        <!-- Header -->
        <div class="modal-header">
          <h5 class="modal-title">Add Dashboard Card</h5>
          <button class="btn-close" @click="$emit('close')"></button>
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

  props: {
    // device list จาก API (optional now - will be fetched internally)
    addresses: {
      type: Array,
      default: () => []
    }
  },

  data() {
    return {
      selectedDeviceId: "",
      selectedAddressId: "",
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

    displayType() {
      if (!this.selectedAddress) return "";

      switch (this.selectedAddress.data_type) {
        case "onoff":
          return "onoff";
        case "number_gauge":
          return "gauge";
        case "level":
          return "level";
        default:
          return "number";
      }
    },

    canSubmit() {
      return !!this.selectedAddress;
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
            display_type: this.displayType
          })
        });
        
        // Emit success event
        this.$emit("add", {
          address_id: this.selectedAddress.id,
          display_type: this.displayType
        });
      } catch (err) {
        console.error("Failed to add card:", err);
        // Optionally emit error event or show alert
      }
    }
  }
};

</script>
