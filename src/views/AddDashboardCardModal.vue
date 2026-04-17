<template>
  <div class="modal fade show d-block modal-backdrop-custom" tabindex="-1" style="background: rgba(0,0,0,.5)">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow">
        <!-- Header -->
        <div class="modal-header bg-dark text-white">
          <h5 class="modal-title">{{ editingCard ? locale.t('Edit Card') : locale.t('Add Card') }}</h5>
          <button class="btn-close btn-close-white" @click="$emit('close')"></button>
        </div>

        <!-- Body -->
        <div class="modal-body">

          <!-- Room -->
          <div class="mb-3">
            <label class="form-label fw-bold">{{ locale.t('Room') }}</label>
            <select v-model="form.room_id" class="form-select">
              <option value="">{{ locale.current === 'th' ? 'ไม่มีห้อง' : 'Unassigned' }}</option>
              <option v-for="room in rooms" :key="room.id" :value="room.id">
                {{ room.name }}
              </option>
            </select>
          </div>

          <!-- Device -->
          <div class="mb-3">
            <label class="form-label fw-bold">{{ locale.t('Device') }}</label>
            <select class="form-select" v-model="selectedDeviceId">
              <option disabled value="">Select {{ locale.t('Device') }}</option>
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
            <label class="form-label fw-bold">{{ locale.t('Address') }}</label>
            <select
              class="form-select"
              v-model="selectedAddressId"
              :disabled="!selectedDeviceId"
            >
              <option disabled value="">Select {{ locale.t('Address') }}</option>
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
            <label class="form-label fw-bold">Display {{ locale.t('Type') }}</label>
            <select
              class="form-select"
              v-model="selectedDisplayType"
            >
              <option disabled value="">Select Display {{ locale.t('Type') }}</option>
              <option value="onoff">ON/OFF</option>
              <option value="number">Number</option>
              <option value="number_gauge">Gauge</option>
              <option value="level">Level</option>
            </select>
          </div>

          <!-- Position -->
          <div class="mb-3" v-if="selectedAddress">
            <label class="form-label fw-bold">{{ locale.t('Insert Position') }}</label>
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

          <!-- Validation Error -->
          <div v-if="validationError" class="alert alert-warning py-2">
            {{ validationError }}
          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-outline-secondary" @click="$emit('close')">
            {{ locale.t('Cancel') }}
          </button>
          <button
            class="btn btn-primary"
            @click="submit"
          >
            {{ editingCard ? locale.t('Save Changes') : locale.t('Add Card') }}
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

  inject: ['locale'],

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
      form: {
        room_id: ""
      },
      selectedDeviceId: "",
      selectedAddressId: "",
      selectedDisplayType: "",
      selectedPosition: 1,
      devices: [],
      rooms: [],
      validationError: ""
    };
  },

  async mounted() {
    try {
      const [devicesRes, roomsRes] = await Promise.all([
        fetch(`${BASE_API}/api/devices`),
        fetch(`${BASE_API}/api/rooms`)
      ]);
      const devicesData = await devicesRes.json();
      const roomsData = await roomsRes.json();
      this.devices = devicesData;
      this.rooms = roomsData.data || roomsData || [];
      
      if (this.editingCard) {
        this.form.room_id = this.editingCard.device.room_id || "";
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
    }
  },

  methods: {
    getValidationError() {
      if (!this.selectedDeviceId) {
        return this.locale.current === 'th' ? 'กรุณาเลือก Device' : 'Please select a Device';
      }
      if (!this.selectedAddressId) {
        return this.locale.current === 'th' ? 'กรุณาเลือก Address' : 'Please select an Address';
      }
      if (!this.selectedDisplayType) {
        return this.locale.current === 'th' ? 'กรุณาเลือก Display Type' : 'Please select a Display Type';
      }
      return "";
    },

    async submit() {
      const error = this.getValidationError();
      if (error) {
        this.validationError = error;
        return;
      }
      this.validationError = "";

      if (this.isEditMode) {
        this.$emit('update', {
          selectedDeviceId: this.selectedDeviceId,
          selectedAddressId: this.selectedAddressId,
          selectedDisplayType: this.selectedDisplayType,
          selectedPosition: this.selectedPosition,
        });

        if (this.selectedDeviceId) {
          await fetch(`${BASE_API}/api/devices/${this.selectedDeviceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_id: this.form.room_id ? parseInt(this.form.room_id) : null })
          });
        }
      } else {
        try {
          await fetch(`${BASE_API}/api/dashboard/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address_id: this.selectedAddress.id,
              display_type: this.selectedDisplayType,
              position: this.selectedPosition
            })
          });
          
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
