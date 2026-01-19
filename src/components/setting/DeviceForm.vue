<template>
  <div class="card shadow-sm setting-card mx-auto mt-4">
    <div class="card-body">

      <h4 class="mb-4">Device Setting</h4>

      <!-- Device Name -->
      <div class="mb-3">
        <label class="form-label">Device Name</label>
        <input v-model="form.name" class="form-control" />
      </div>

      <!-- Device Type -->
      <div class="mb-3">
        <label class="form-label">Device Type</label>
        <select v-model="form.device_type" class="form-select">
          <option value="lamp">Lamp</option>
          <option value="motor">Motor</option>
          <option value="pump">Pump</option>
          <option value="inkjet">Inkjet</option>
        </select>
      </div>

      <!-- Display Type -->
      <div class="mb-3">
        <label class="form-label">Data Display Type</label>
        <select v-model="form.data_display_type" class="form-select">
          <option value="onoff">ON / OFF</option>
          <option value="number">Number</option>
          <option value="number_gauge">Number Gauge</option>
          <option value="level">Level</option>
        </select>
      </div>

      <!-- Address -->
      <AddressForm
        v-model:address="form.plc_address"
        v-model:refresh="form.refresh_rate_ms"
        :dataDisplayType="form.data_display_type"
      />

      <!-- Display Config -->
      <DisplayOnOff
        v-if="form.data_display_type === 'onoff'"
      />

      <DisplayNumber
        v-if="form.data_display_type === 'number'"
        v-model="form.numberConfig"
        :showMinMax="true"
      />
      
      <DisplayNumber
        v-if="form.data_display_type === 'number_gauge'"
        v-model="form.numberConfig"
        :showMinMax="true"
      />


      <DisplayLevel
        v-if="form.data_display_type === 'level'"
        v-model="form.level"
      />

      <!-- PLC Debug -->
      <PlcDebugForm />

      <!-- Error -->
      <div v-if="error" class="alert alert-danger py-2">
        {{ error }}
      </div>

      <!-- Save -->
      <button
        class="btn btn-primary w-100"
        :disabled="loading || isNumberConfigInvalid"
        @click="save"
      >
        {{ loading ? "Saving..." : "Save Device" }}
      </button>
      
      <div
        v-if="
          (form.data_display_type === 'number' ||
          form.data_display_type === 'number_gauge') &&
          isNumberConfigInvalid
        "
        class="text-danger small mt-2 text-center"
      >
        กรุณากำหนด Min Value &lt; Max Value ให้ถูกต้อง
      </div>

    </div>
  </div>
</template>

<script>
import Swal from "sweetalert2";

import AddressForm from "./AddressForm.vue";
import DisplayOnOff from "./DisplayOnOff.vue";
import DisplayNumber from "./DisplayNumber.vue";
import DisplayLevel from "./DisplayLevel.vue";
import PlcDebugForm from "./PlcDebugForm.vue";

const API = import.meta.env.VITE_API_BASE_URL + "/api/devices";

export default {
  name: "DeviceForm",
  components: {
    AddressForm,
    DisplayOnOff,
    DisplayNumber,
    DisplayLevel,
    PlcDebugForm,
  },

  emits: ["saved"],

  data() {
    return {
      form: {
        name: "",
        device_type: "lamp",
        data_display_type: "onoff",
        plc_address: "M0",
        refresh_rate_ms: 1000,

        numberConfig: {
          decimal_places: 0,
          scale: 1,
          offset: 0,
          min_value: null,
          max_value: null,
          unit: ''
        },

        level: {
          mode: "exact",
          exactValues: "0,1,2",
        },
      },

      loading: false,
      error: "",
    };
  },

  methods: {
  async save() {
    this.error = "";

    if (!this.form.name) {
      this.error = "กรุณากรอก Device Name";
      return;
    }

    try {
      this.loading = true;

      /* ===============================
      * 1️⃣ Save Device
      * =============================== */
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

      if (!res.ok) {
        throw new Error(device.message || "Save device failed");
      }

      /* ===============================
      * 2️⃣ Save Number Config (ถ้ามี)
      * =============================== */
      if (
        this.form.data_display_type === "number" ||
        this.form.data_display_type === "number_gauge"
      ) {
        const cfgRes = await fetch(
          `${API}/${device.id}/number-config`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(this.form.numberConfig),
          }
        );

        const cfgData = await cfgRes.json();
        console.log(this.form.numberConfig)
        console.log('Saved device type:', device.data_display_type);

        if (!cfgRes.ok) {
          throw new Error(cfgData.message || "Save number config failed");
        }
      }

      /* ===============================
      * Success
      * =============================== */
      this.$emit("saved", device);

      Swal.fire({
        icon: "success",
        title: "Saved",
        text: "Device saved to server",
        timer: 1200,
        showConfirmButton: false,
      });

      // reset form
      this.form.name = "";
      this.form.plc_address = "M0";

    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  },
},

  computed: {
    isNumberConfigInvalid() {
      if (this.form.data_display_type !== 'number' && this.form.data_display_type !== 'number_gauge') {
        return false;
      }

      const cfg = this.form.numberConfig;

      if (cfg.min_value == null || cfg.max_value == null) {
        return true;
      }

      if (cfg.min_value >= cfg.max_value) {
        return true;
      }

      return false;
    }
  }
};
</script>

<style scoped>
.setting-card {
  max-width: 600px;
}
</style>
