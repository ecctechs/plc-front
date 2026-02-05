<template>
  <div class="card shadow-sm mx-auto mt-4" style="max-width: 1000px; border-radius: 15px;">
    <div class="card-body p-4">
      <div class="mb-4 pb-3 border-bottom">
        <h4 class="fw-bold m-0"><i class="bi bi-gear-fill text-primary me-2"></i>Device Configuration</h4>
      </div>

      <div class="row g-3 mb-5">
        <div class="col-md-5">
          <label class="form-label fw-bold small">Device Name</label>
          <input v-model="form.name" class="form-control" placeholder="เช่น Motor 01" />
        </div>
        <div class="col-md-4">
          <label class="form-label fw-bold small">Device Type</label>
          <select v-model="form.device_type" class="form-select">
            <option value="motor">Motor</option>
            <option value="pump">Pump</option>
            <option value="lamp">Lamp</option>
            <option value="inkjet">Inkjet</option>
          </select>
        </div>
        <!-- <div class="col-md-3">
          <label class="form-label fw-bold small">Global Refresh (ms)</label>
          <input type="number" v-model.number="form.refresh_rate_ms" class="form-control" />
        </div> -->
      </div>

      <h5 class="fw-bold mb-4 text-secondary">Addresses Point ({{ form.addresses.length }})</h5>

      <div v-for="(addr, index) in form.addresses" :key="index" class="address-card p-4 mb-4 border rounded shadow-sm bg-white position-relative">
        
        <button 
          v-if="form.addresses.length > 1" 
          @click="removeAddress(index)" 
          class="btn btn-danger btn-sm position-absolute"
          style="top: -10px; right: -10px; border-radius: 50%; width: 30px; height: 30px; z-index: 10;"
        >
          <i class="fa-solid fa-trash-can"></i>
        </button>

        <div class="row g-4">
          <div class="col-md-5 border-end">
            <div class="mb-3">
              <label class="form-label small fw-bold">Label Name</label>
              <input v-model="addr.label" class="form-control" placeholder="เช่น Speed, Status" />
            </div>
            <div>
              <label class="form-label small fw-bold">Display Type</label>
              <select v-model="addr.data_type" class="form-select" @change="onTypeChange(addr)">
                <option value="onoff">ON / OFF</option>
                <option value="number">Number (Text)</option>
                <option value="number_gauge">Number (Gauge)</option>
                <option value="level">Level (Status Range)</option>
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
            v-model="addr.alarms" 
            :dataType="addr.data_type" 
            :levelLabels="addr.levels" 
          />
        </div>
      </div>

      <button @click="addAddress" class="btn btn-outline-primary w-100 py-3 mb-5 border-dashed">
        <i class="bi bi-plus-circle me-2"></i> Add New Address Point
      </button>

      <div class="sticky-bottom bg-white py-3 border-top">
        <button class="btn btn-success btn-lg w-100 fw-bold shadow-sm" @click="saveDevice" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          บันทึกข้อมูลเทั้งหมด 
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import AddressForm from "./AddressForm.vue";
import DisplayNumber from "./DisplayNumber.vue";
import DisplayLevel from "./DisplayLevel.vue";
import AlertForm from "./AlertForm.vue";
import { showAlert } from "../../utils/swalHelper";

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  components: { AddressForm, DisplayNumber, DisplayLevel, AlertForm  },
  data() {
    return {
      loading: false,
      levelError: null, // เก็บค่า Error จาก DisplayLevel
      form: {
        name: "",
        device_type: "motor",
        refresh_rate_ms: 1000,
        addresses: [this.createNewAddress()]
      }
    };
  },
  methods: {
    // --- Helper Methods ---
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

    // --- Sub-Config API Calls ---
    async saveChildConfigs(savedAddrId, formAddr) {
      // 1. Save Number Config
      if (["number", "number_gauge"].includes(formAddr.data_type)) {
        await fetch(`${BASE_API}/api/addresses/${savedAddrId}/number-config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formAddr.numberConfig)
        });
      }

      // 2. Save Level Config
      if (formAddr.data_type === "level") {
        await fetch(`${BASE_API}/api/addresses/${savedAddrId}/levels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formAddr.levels)
        });
      }

      // 3. Save Alarms
      if (formAddr.alarms && formAddr.alarms.length > 0) {
        for (const alarm of formAddr.alarms) {
          await fetch(`${BASE_API}/api/addresses/${savedAddrId}/alarms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...alarm,
              data_type: formAddr.data_type,
              is_active: true
            })
          });
        }
      }
    },

    // --- Main Save Action ---
    async saveDevice() {
      try {
        this.validateBeforeSave();
        this.loading = true;

        // Step 1: Create Main Device & Addresses
        const res = await fetch(`${BASE_API}/api/devices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.form)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "บันทึกข้อมูลหลักล้มเหลว");
        }

        const deviceResult = await res.json();

        // Step 2: Loop Save Sub-Configs (Mapping by index)
        const childRequests = deviceResult.addresses.map((savedAddr, i) => {
          return this.saveChildConfigs(savedAddr.id, this.form.addresses[i]);
        });

        await Promise.all(childRequests);

        // Step 3: Success
        await showAlert("บันทึกสำเร็จ", "ข้อมูลถูกอัปเดตเรียบร้อยแล้ว", "success");

        this.$emit("saved");

      } catch (err) {
        console.error("Save Error:", err);
        await showAlert("เกิดข้อผิดพลาด", err.message, "error");
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
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
  transition: all 0.2s ease; /* เพิ่มความนุ่มนวลเวลา hover */
}
/* แก้ไขตอน Hover */
.border-dashed:hover {
  background-color: #f0f7ff !important; /* เปลี่ยนพื้นหลังเป็นฟ้าอ่อนๆ แทนสีน้ำเงินเข้ม */
  color: #0d6efd !important;           /* บังคับให้ข้อความเป็นสีน้ำเงินเหมือนเดิม ไม่เป็นสีขาว */
  border-color: #0d6efd !important;    /* ให้เส้นประเด่นขึ้น */
  transform: translateY(-2px);         /* แถม: ให้ปุ่มลอยขึ้นนิดนึงดูมีมิติ */
}

/* แก้ไขตอน Active (กดค้าง) */
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