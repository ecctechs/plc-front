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
                v-for="d in addresses"
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
export default {
  name: "AddDashboardCardModal",

  props: {
    // device list จาก API
    addresses: {
      type: Array,
      required: true
    }
  },

  data() {
    return {
      selectedDeviceId: "",
      selectedAddressId: ""
    };
  },

  computed: {
    devices() {
      return this.addresses;
    },

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
    submit() {
      this.$emit("add", {
        address_id: this.selectedAddress.id,
        display_type: this.displayType
      });
    }
  }
};

</script>
