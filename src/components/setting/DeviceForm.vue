<template>
  <div class="card shadow-sm setting-card mx-auto mt-4">
    <div class="card-body">
      <h4 class="mb-4">Device Setting</h4>

      <div class="mb-3">
        <label class="form-label fw-bold">Device Name</label>
        <input v-model="form.name" class="form-control" />
      </div>

      <div class="mb-3">
        <label class="form-label">Device Type</label>
        <select v-model="form.device_type" class="form-select">
          <option value="lamp">Lamp</option>
          <option value="motor">Motor</option>
          <option value="pump">Pump</option>
          <option value="inkjet">Inkjet</option>
        </select>
      </div>

      <div class="mb-3">
        <label class="form-label">Data Display Type</label>
        <select v-model="form.data_display_type" class="form-select">
          <option value="onoff">ON / OFF</option>
          <option value="number">Number</option>
          <option value="number_gauge">Number Gauge</option>
          <option value="level">Level</option>
        </select>
      </div>

      <AddressForm
        v-model:address="form.plc_address"
        v-model:refresh="form.refresh_rate_ms"
        :dataDisplayType="form.data_display_type"
      />

      <DisplayNumber
        v-if="['number', 'number_gauge'].includes(form.data_display_type)"
        v-model="form.numberConfig"
        :showMinMax="true"
      />

      <DisplayLevel
        v-if="form.data_display_type === 'level'"
        v-model="form.levels"
        @validate="onLevelValidate"
      />

      <PlcDebugForm />

      <AlertForm v-model="form.alarms"/>

      <div v-if="error" class="alert alert-danger py-2 mt-3 small">{{ error }}</div>

      <div v-if="isFormInvalid && !loading" class="alert alert-warning py-2 mt-2 small text-center">
        <span v-if="!form.name">กรุณาระบุ Device Name</span>
        <span v-else-if="form.data_display_type === 'level'">{{ levelError || "Logic Level ไม่สมบูรณ์" }}</span>
        <span v-else-if="isNumberConfigInvalid">กรุณาระบุค่า Min < Max ให้ถูกต้อง</span>
      </div>

      <button
        class="btn btn-primary w-100 mt-3"
        :disabled="loading || isFormInvalid"
        @click="save"
      >
        <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
        {{ loading ? "Saving..." : "Save Device" }}
      </button>
    </div>
  </div>
</template>

<script>
import Swal from "sweetalert2";
import AddressForm from "./AddressForm.vue";
import DisplayNumber from "./DisplayNumber.vue";
import DisplayLevel from "./DisplayLevel.vue";
import PlcDebugForm from "./PlcDebugForm.vue";
import AlertForm from "./AlertForm.vue";

const API = import.meta.env.VITE_API_BASE_URL + "/api/devices";

export default {
  name: "DeviceForm",
  components: { AddressForm, DisplayNumber, DisplayLevel, PlcDebugForm , AlertForm },
  data() {
    return {
      form: {
        name: "",
        device_type: "lamp",
        data_display_type: "onoff",
        plc_address: "M0",
        refresh_rate_ms: 1000,
        levels: [],
        numberConfig: { min_value: null, max_value: null, scale: 1, offset: 0, decimal_places: 0, unit: '' },
        alarms: []
      },
      levelError: null,
      loading: false,
      error: ""
    };
  },
  computed: {
    isNumberConfigInvalid() {
      if (!['number', 'number_gauge'].includes(this.form.data_display_type)) return false;
      const cfg = this.form.numberConfig;
      return cfg.min_value == null || cfg.max_value == null || cfg.min_value >= cfg.max_value;
    },
    isFormInvalid() {
      if (!this.form.name) return true;
      if (this.form.data_display_type === 'level') return !!this.levelError;
      if (this.isNumberConfigInvalid) return true;
      return false;
    }
  },
  methods: {
  onLevelValidate(msg) { this.levelError = msg; },

  async save() {
    this.error = "";
    let createdDeviceId = null; // เก็บ ID ไว้สำหรับ Rollback

    try {
      this.loading = true;

      // --- ขั้นตอนที่ 1: บันทึก Device หลัก ---
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: this.form.name,
          device_type: this.form.device_type,
          data_display_type: this.form.data_display_type,
          plc_address: this.form.plc_address,
          refresh_rate_ms: this.form.refresh_rate_ms,
        }),
      });

      const device = await res.json();
      if (!res.ok) throw new Error(device.message || "บันทึกอุปกรณ์หลักไม่สำเร็จ");
      
      createdDeviceId = device.id; // เก็บ ID ไว้ ถ้าข้างล่าง error จะเอาไปลบทิ้ง

      // --- ขั้นตอนที่ 2: บันทึก Config ย่อย ---
      
      // กรณีเป็น Number หรือ Number Gauge
      if (['number', 'number_gauge'].includes(this.form.data_display_type)) {
        await this.postData(`${API}/${device.id}/number-config`, this.form.numberConfig);
      }

      // กรณีเป็น Level
      if (this.form.data_display_type === 'level') {
        for (let i = 0; i < this.form.levels.length; i++) {
          const level = this.form.levels[i];
          
          // สร้าง Payload สำหรับส่ง API
          let levelData = {
            label: level.label,
            mode: level.mode,
            condition_type: level.condition_type,
            level_index: i // แก้ไขปัญหา level_index cannot be null
          };

          // แยกการส่งค่าตาม Mode
          if (level.mode === 'exact') {
            // ถ้าเป็น Exact ให้ส่งเข้า field exact_values
            levelData.exact_values = [level.min_value]
            levelData.min_value = null;
            levelData.max_value = null;
          } else {
            // ถ้าเป็น Criteria ให้ส่ง min_value และ max_value ตามปกติ
            levelData.exact_values = null;
            levelData.min_value = level.min_value;
            levelData.max_value = level.max_value;
            levelData.include_min = level.include_min;
            levelData.include_max = level.include_max;
          }

          await this.postData(`${API}/${device.id}/levels`, levelData);
        }
      }

      // --- ขั้นตอนที่ 3: บันทึก Alarms (ถ้ามีการเปิดใช้งาน) ---
    if (this.form.alarms.length > 0) {
      const alarmPromises = this.form.alarms.map(alarm => {
        return this.postData(`${API}/${device.id}/alarms`, {
          ...alarm,
          data_type: this.form.data_display_type // ผูก data_type ตาม device
        });
      });
      
      await Promise.all(alarmPromises); // รอให้บันทึกครบทุก Alarm
    }

      // --- สำเร็จทั้งหมด ---
      Swal.fire({ icon: "success", title: "Saved", timer: 1200, showConfirmButton: false });
      this.$emit("saved", device);

    } catch (err) {
      this.error = err.message;

      // --- ROLLBACK LOGIC ---
      // หากสร้าง Device ไปแล้วแต่บันทึก Config ไม่สำเร็จ ให้ลบ Device นั้นทิ้งทันที
      if (createdDeviceId) {
        console.warn("Rolling back: Deleting device due to config error");
        await fetch(`${API}/${createdDeviceId}`, { method: "DELETE" });
      }

    } finally {
      this.loading = false;
    }
  },

  async postData(url, data) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "บันทึกข้อมูลส่วนเสริม (Number/Level) ไม่สำเร็จ");
    }
  }
}
}
</script>
<style scoped> .setting-card { max-width: 800px; } </style>