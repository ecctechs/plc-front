<template>
  <!-- Modal -->
  <div class="modal fade" :class="{ show: showModal }" :style="{ display: showModal ? 'block' : 'none' }" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header bg-dark text-white">
          <h5 class="modal-title">{{ isEdit ? 'Edit Device' : 'Add Device' }}</h5>
          <button type="button" class="btn-close btn-close-white" @click="closeModal()"></button>
        </div>
        
        <div class="modal-body p-4">
          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <label class="form-label fw-bold small">Device Name</label>
              <input v-model="form.name" class="form-control" placeholder="เช่น Machine A" />
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Device Type</label>
              <select v-model="form.device_type_id" class="form-select" @change="onDeviceTypeChange">
                <option value="">Select Type</option>
                <option v-for="type in deviceTypes" :key="type.id" :value="type.id">
                  {{ type.name }}
                </option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-bold small">Room</label>
              <select v-model="form.room_id" class="form-select">
                <option value="">Select Room</option>
                <option v-for="room in rooms" :key="room.id" :value="room.id">
                  {{ room.name }}
                </option>
              </select>
            </div>
          </div>

          <h5 class="fw-bold mb-4 text-secondary">Addresses Point ({{ form.addresses.length }})</h5>

          <div v-for="(addr, index) in form.addresses" :key="index" class="address-card p-4 mb-4 border rounded shadow-sm bg-white position-relative">
            
          <button 
            v-if="form.addresses.length > 1" 
            @click="removeAddress(index)" 
            class="btn btn-danger btn-sm position-absolute d-flex align-items-center justify-content-center"
            style="top: -8px; right: -8px; border-radius: 50%; width: 26px; height: 26px; z-index: 10; padding: 0;"
          >
            <i class="fa-solid fa-trash-alt" style="font-size: 0.8rem;"></i>
          </button>

            <div class="row g-4">
              <div class="col-md-5 border-end">
                <div class="mb-3">
                  <label class="form-label small fw-bold">Label Name</label>
                  <input v-model="addr.label" class="form-control" placeholder="เช่น Speed, Status" />
                </div>
                <div>
                  <label class="form-label small fw-bold">Display Type</label>
                  <select v-model="addr.data_type" class="form-select" @change="onTypeChange(addr)" :disabled="!form.device_type_id">
                    <option value="">Select Type</option>
                    <option v-for="dt in availableDisplayTypes" :key="dt" :value="dt">{{ getDisplayTypeLabel(dt) }}</option>
                  </select>
                </div>
              </div>

              <div class="col-md-7 bg-light-blue rounded p-3">
                <div class="fw-bold small mb-3 text-primary"><i class="bi bi-link-45deg"></i> PLC Connection Setting</div>
                <AddressForm 
                  v-model:address="addr.plc_address" 
                  v-model:refresh="addr.refresh_rate_ms"
                  :dataDisplayType="addr.data_type" 
                />
              </div>
            </div>

            <div class="mt-4 pt-3 border-top" v-if="addr.data_type !== 'onoff'">
              <div v-if="['number', 'number_gauge'].includes(addr.data_type)">
                <DisplayNumber v-model="addr.numberConfig" :type="addr.data_type" />
              </div>
              <div v-if="addr.data_type === 'level'">
                <DisplayLevel v-model="addr.levels" @validate="handleLevelValidate" />
              </div>
            </div>

            <div class="mt-3">
              <AlertForm 
                ref="alertForms"
                v-model="addr.alarms" 
                :dataType="addr.data_type" 
                :levelLabels="addr.levels" 
              />
            </div>


          </div>

          <button @click="addAddress" class="btn btn-outline-primary w-100 py-3 mb-4 border-dashed">
            <i class="bi bi-plus-circle me-2"></i> Add New Address Point
          </button>


        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal()">Cancel</button>
          <button class="btn btn-success btn fw-bold" @click="saveDevice" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ isEdit ? 'Update' : 'บันทึกข้อมูลเทั้งหมด' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showModal" class="modal-backdrop fade show"></div>
</template>

<script>
import AddressForm from "./AddressForm.vue";
import DisplayNumber from "./DisplayNumber.vue";
import DisplayLevel from "./DisplayLevel.vue";
import AlertForm from "./AlertForm.vue";
import { showAlert } from "../../utils/swalHelper";

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  components: { AddressForm, DisplayNumber, DisplayLevel, AlertForm },
  emits: ['saved'],
  props: {
    reloadDevices: {
      type: Function,
      default: null
    }
  },
  data() {
    return {
      showModal: false,
      isEdit: false,
      editingId: null,
      loading: false,
      rooms: [],
      deviceTypes: [],
      levelError: null,
      form: {
        name: "",
        room_id: "",
        device_type_id: "",
        refresh_rate_ms: 1000,
        addresses: [this.createNewAddress()]
      }
    };
  },
  computed: {
    selectedDeviceType() {
      if (!this.form.device_type_id) return null;
      return this.deviceTypes.find(t => t.id === this.form.device_type_id) || null;
    },
    availableDisplayTypes() {
      if (!this.selectedDeviceType || !this.selectedDeviceType.display_types) {
        return ['onoff', 'number', 'number_gauge', 'level'];
      }
      return this.selectedDeviceType.display_types;
    }
  },
  mounted() {
    this.loadRooms();
    this.loadDeviceTypes();
  },
  methods: {
    async loadRooms() {
      try {
        const res = await fetch(`${BASE_API}/api/rooms`);
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        this.rooms = json.data || [];
      } catch (err) {
        console.error(err);
      }
    },
    
    async loadDeviceTypes() {
      try {
        const res = await fetch(`${BASE_API}/api/device-types`);
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        this.deviceTypes = json.data || [];
      } catch (err) {
        console.error(err);
      }
    },
    
    open(device = null) {
      // Reload device types every time the popup is opened
      this.loadDeviceTypes();
      this.loadRooms();
      
      if (device) {
        this.isEdit = true;
        this.editingId = device.id;
        this.form = {
          name: device.name,
          room_id: device.room?.id || device.room_id || "",
          device_type_id: device.device_type?.id || device.device_type_id || "",
          refresh_rate_ms: device.refresh_rate_ms || 1000,
          addresses: device.addresses && device.addresses.length > 0 
            ? device.addresses.map(a => this.mapAddress(a))
            : [this.createNewAddress()]
        };
      } else {
        this.isEdit = false;
        this.editingId = null;
        this.form = {
          name: "",
          room_id: "",
          device_type_id: "",
          refresh_rate_ms: 1000,
          addresses: [this.createNewAddress()]
        };
      }
      this.showModal = true;
    },
    
    mapAddress(addr) {
      console.log("Mapping address:", addr);
      return {
        id: addr.id,
        label: addr.label || "",
        plc_address: addr.plc_address || "M0",
        data_type: addr.data_type || "onoff",
        refresh_rate_ms: addr.refresh_rate_ms || 1000,
        numberConfig: addr.numberConfig || addr.number_config || { scale: 1, offset: 0, decimal_places: 0, unit: "", min_value: 0, max_value: 100 },
        levels: addr.levels || addr.level_config || [],
        alarms: addr.alarms || []
      };
    },
    
    closeModal() {
      this.showModal = false;
    },
    
    getDisplayTypeLabel(type) {
      const labels = {
        onoff: "ON / OFF",
        number: "Number (Text)",
        number_gauge: "Number (Gauge)",
        level: "Level (Status Range)"
      };
      return labels[type] || type;
    },
    
    onDeviceTypeChange() {
      // Update existing addresses to use valid display types for the selected device type
      if (this.availableDisplayTypes.length > 0) {
        this.form.addresses.forEach(addr => {
          if (!this.availableDisplayTypes.includes(addr.data_type)) {
            addr.data_type = this.availableDisplayTypes[0];
            this.onTypeChange(addr);
          }
        });
      }
    },
    
    createNewAddress() {
      return {
        label: "Point " + (this.form?.addresses?.length + 1 || 1),
        plc_address: "M0",
        data_type: "onoff",
        refresh_rate_ms: 1000,
        numberConfig: { scale: 1, offset: 0, decimal_places: 0, unit: "", min_value: 0, max_value: 100 },
        levels: [],
        alarms: []
      };
    },
    handleLevelValidate(error) {
      this.levelError = error;
    },
    onTypeChange(addr) {
      addr.plc_address = addr.data_type === 'onoff' ? 'M0' : 'D100';
      // Reset address data_type to first available if current is not allowed
      if (this.availableDisplayTypes.length > 0 && !this.availableDisplayTypes.includes(addr.data_type)) {
        addr.data_type = this.availableDisplayTypes[0];
      }
    },
    addAddress() {
      this.form.addresses.push(this.createNewAddress());
    },
    removeAddress(index) {
      this.form.addresses.splice(index, 1);
    },

    // --- Validation Logic ---
    validateBeforeSave() {
      if (!this.form.name) throw new Error("กรุณาระบุชื่อ Device");
      if (!this.form.device_type_id) throw new Error("กรุณาเลือก Device Type");

      for (const [idx, addr] of this.form.addresses.entries()) {
        const pointLabel = addr.label || `Point ${idx + 1}`;

        // Validate Number
        if (["number", "number_gauge"].includes(addr.data_type)) {
          if (addr.numberConfig.min_value >= addr.numberConfig.max_value) {
            throw new Error(`[${pointLabel}]: ค่า Min ต้องน้อยกว่า Max ในส่วน Number Setting`);
          }
        }

        // Validate Level
        if (addr.data_type === "level") {
          if (!addr.levels || addr.levels.length === 0) {
            throw new Error(`[${pointLabel}]: กรุณาเพิ่มอย่างน้อย 1 Level`);
          }
          if (this.levelError) {
            throw new Error(`[${pointLabel}]: ${this.levelError}`);
          }
        }
      }
    },

    // --- Main Save Action ---
    async saveDevice() {
      try {
        this.validateBeforeSave();

        // Validate Alarm Forms
        if (this.$refs.alertForms) {
          const forms = Array.isArray(this.$refs.alertForms) 
                        ? this.$refs.alertForms 
                        : [this.$refs.alertForms];
          
          let isAllValid = true;
          forms.forEach(form => {
            if (!form.validateAlarms()) isAllValid = false;
          });

          if (!isAllValid) {
            throw new Error("การตั้งค่า Alarm ไม่ถูกต้อง (มีชื่อซ้ำ, ค่าว่าง หรือช่วงทับซ้อนกัน)");
          }
        }

        this.loading = true;

        // Prepare form data
        const formData = {
          name: this.form.name,
          device_type_id: parseInt(this.form.device_type_id) || null,
          room_id: this.form.room_id ? parseInt(this.form.room_id) : null,
          refresh_rate_ms: this.form.refresh_rate_ms,
          addresses: this.form.addresses.map(addr => ({
            id: addr.id, // Include ID for existing addresses (for update)
            label: addr.label,
            data_type: addr.data_type,
            plc_address: addr.plc_address,
            refresh_rate_ms: addr.refresh_rate_ms
          }))
        };

        const url = this.isEdit 
          ? `${BASE_API}/api/devices/${this.editingId}`
          : `${BASE_API}/api/devices`;
        const method = this.isEdit ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "บันทึกข้อมูลหลักล้มเหลว");
        }

        const deviceResult = await res.json();

        // Get addresses based on response format
        // Edit mode: deviceResult.data.addresses
        // Add mode: deviceResult.addresses
        const addresses = this.isEdit ? deviceResult.data?.addresses : deviceResult.addresses;

        if (addresses && addresses.length > 0) {
          // Create a map of original form addresses by their ID for matching
          const formAddrMap = new Map();
          this.form.addresses.forEach((addr, i) => {
            // Use index as key since we need to match by position
            formAddrMap.set(i, addr);
          });
          
          // Save sub-configs (number, level, alarms)
          const childRequests = addresses.map((savedAddr, i) => {
            const formAddr = formAddrMap.get(i);
            if (!formAddr) return Promise.resolve(); // Skip if no matching form address
            
            // Determine if this is a new address (no ID in form) or existing address
            const isNewAddress = !formAddr.id;
            
            // Use the original ID from form if exists, otherwise use saved ID
            const originalId = formAddr.id || savedAddr.id;
            
            return this.saveChildConfigs(originalId, savedAddr.id, formAddr, isNewAddress);
          });
          
          await Promise.all(childRequests);
        }

        // Step 3: Success
        await showAlert("บันทึกสำเร็จ", "ข้อมูลถูกอัปเดตเรียบร้อยแล้ว", "success");

        // Reload devices table if function provided
        if (this.reloadDevices) {
          this.reloadDevices();
        }

        this.closeModal();
        // this.$emit("saved");

      } catch (err) {
        console.error("Save Error:", err);
        await showAlert("เกิดข้อผิดพลาด", err.message, "error");
      } finally {
        this.loading = false;
      }
    },

    // --- Sub-Config API Calls ---
    async saveChildConfigs(originalId, savedAddrId, formAddr, isNewAddress = false) {
      
      // Use the correct address ID: original ID for existing addresses, saved ID for new addresses
      const addressId = isNewAddress ? savedAddrId : originalId;
      
      // Determine the correct HTTP method
      const httpMethod = isNewAddress ? "POST" : "PUT";
      
      // 1. Save Number Config
      if (["number", "number_gauge"].includes(formAddr.data_type)) {
        console.log(`Saving number-config: originalId=${originalId}, savedAddrId=${savedAddrId}, addressId=${addressId}, method=${httpMethod}`);
        await fetch(`${BASE_API}/api/addresses/${addressId}/number-config`, {
          method: httpMethod,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formAddr.numberConfig)
        });
      }

      // 2. Save Level Config (always POST - creates/updates levels array)
      if (formAddr.data_type === "level") {
        await fetch(`${BASE_API}/api/addresses/${addressId}/levels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formAddr.levels)
        });

        // Fetch saved levels to get the new level_index for alarms
        const levelsResponse = await fetch(`${BASE_API}/api/addresses/${addressId}/levels`);
        const savedLevels = await levelsResponse.json();
        console.log('Saved levels for alarm mapping:', savedLevels);

        // Update alarms with correct level_index based on level_label
        if (formAddr.alarms && formAddr.alarms.length > 0) {
          formAddr.alarms.forEach(alarm => {
            if (alarm.level_label) {
              const matchedLevel = savedLevels.find(l => l.label === alarm.level_label);
              if (matchedLevel) {
                alarm.level_index = matchedLevel.level_index;
                console.log(`Mapped alarm "${alarm.name}" to level_index: ${matchedLevel.level_index}`);
              }
            }
          });
        }
      }

      // 3. Save Alarms
      if (formAddr.alarms && formAddr.alarms.length > 0) {
        for (const alarm of formAddr.alarms) {
          const alarmPayload = {
            ...alarm,
            address_id: addressId,
            data_type: formAddr.data_type,
            is_active: true
          };
          
          // If alarm has ID, use PUT to update; otherwise use POST to create
          if (alarm.id) {
            await fetch(`${BASE_API}/api/alarms/${alarm.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(alarmPayload)
            });
          } else {
            await fetch(`${BASE_API}/api/addresses/${savedAddrId}/alarms`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(alarmPayload)
            });
          }
        }
      }

      // 4. Delete alarms that were removed from the form
      // Fetch existing alarms from database
      const alarmsResponse = await fetch(`${BASE_API}/api/addresses/${addressId}/alarms`);
      const existingAlarms = await alarmsResponse.json();
      
      // Get alarm IDs from form (only those with ID, meaning they exist in DB)
      const formAlarmIds = (formAddr.alarms || [])
        .filter(a => a.id)
        .map(a => a.id);
      
      // Find alarms to delete (exist in DB but not in form)
      const alarmsToDelete = existingAlarms
        .filter(a => !formAlarmIds.includes(a.id))
        .map(a => a.id);
      
      // Delete removed alarms
      for (const alarmId of alarmsToDelete) {
        console.log(`Deleting alarm ID: ${alarmId}`);
        await fetch(`${BASE_API}/api/alarms/${alarmId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }
};
</script>

<style scoped>
.modal.show {
  display: block !important;
}
.address-card {
  transition: all 0.2s;
  border-left: 5px solid #0d6efd !important;
}
.address-card:hover {
  border-color: #0a58ca !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
}
.bg-light-blue {
  background-color: #f0f7ff;
}
.border-dashed {
  border-style: dashed !important;
  background-color: #fafafa;
  transition: all 0.2s ease;
}
.border-dashed:hover {
  background-color: #f0f7ff !important;
  color: #0d6efd !important;
  border-color: #0d6efd !important;
  transform: translateY(-2px);
}
.border-dashed:active {
  background-color: #e2efff !important;
  transform: translateY(0);
}
.form-control, .form-select {
  border: 1px solid #ced4da !important;
  background-color: #ffffff !important;
}
.form-control:focus {
  border-color: #86b7fe !important;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25) !important;
}
</style>
