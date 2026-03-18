<template>
  <div class="modal fade show d-block modal-backdrop-custom" tabindex="-1" style="background: rgba(0,0,0,.5)">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow">
        <!-- Header -->
        <div class="modal-header bg-dark text-white">
          <h5 class="modal-title">{{ editingCard ? 'Edit Card' : 'Add Dashboard Card' }}</h5>
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

          <!-- Position -->
          <div class="mb-3" v-if="selectedAddress">
            <label class="form-label fw-bold">Insert Position</label>
            <select class="form-select" v-model.number="selectedPosition">
              <option
                v-for="n in parseInt(currentCardCount) + 1"
                :key="n"
                :value="n"
              >
                Position {{ n }} {{ n === parseInt(currentCardCount) + 1 ? '(End)' : '' }}
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
            {{ editingCard ? 'Save Changes' : 'Add Card' }}
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
    currentCardCount: {
      type: Number,
      default: 0
    },
    editingCard: {
      type: Object,
      default: null
    }
  },

  data() {
    return {
      selectedDeviceId: "",
      selectedAddressId: "",
      selectedDisplayType: "",
      selectedPosition: 1,
      devices: []
    };
  },

  async mounted() {
    try {
      const res = await fetch(`${BASE_API}/api/devices`);
      const data = await res.json();
      this.devices = data;
      
      // If editing, pre-fill form with existing card data
      if (this.editingCard) {
        // Find the device that contains this address
        for (const device of this.devices) {
          const address = device.addresses?.find(a => a.id === this.editingCard.address_id);
          if (address) {
            this.selectedDeviceId = device.id;
            this.selectedAddressId = address.id;
            this.selectedDisplayType = this.editingCard.display_type;
            this.selectedPosition = this.editingCard.position || 1;
            break;
          }
        }
      }
    } catch (err) {
      console.error("Failed to load devices:", err);
      this.devices = [];
    }
  },

  computed: {
    isEditMode() {
      return !!this.editingCard;
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

    canSubmit() {
      return !!this.selectedAddress && !!this.selectedDisplayType;
    }
  },

  methods: {
    async submit() {
      if (this.isEditMode) {
        // Emit update event
        this.$emit('update', {
          selectedDeviceId: this.selectedDeviceId,
          selectedAddressId: this.selectedAddressId,
          selectedDisplayType: this.selectedDisplayType,
          selectedPosition: this.selectedPosition
        });
      } else {
        try {
          // POST to API
          await fetch(`${BASE_API}/api/dashboard/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address_id: this.selectedAddress.id,
              display_type: this.selectedDisplayType,
              position: this.selectedPosition
            })
          });
          
          // Emit success event
          this.$emit("add", {
            address_id: this.selectedAddress.id,
            display_type: this.selectedDisplayType
          });
        } catch (err) {
          console.error("Failed to add card:", err);
        }
      }
    }
  }
};

</script>
