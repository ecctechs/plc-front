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

      <!-- PLC Address -->
      <div class="mb-3">
        <label class="form-label">PLC Address</label>
        <input
          v-model="form.plc_address"
          class="form-control"
          placeholder="M0, D10"
        />
      </div>

      <!-- Refresh Rate -->
      <div class="mb-4">
        <label class="form-label">Refresh Rate</label>
        <div class="row g-2">
          <div class="col-8">
            <input
              type="number"
              min="1"
              v-model.number="refreshValue"
              class="form-control"
            />
          </div>
          <div class="col-4">
            <select v-model="refreshUnit" class="form-select">
              <option value="sec">sec</option>
              <option value="ms">ms</option>
            </select>
          </div>
        </div>
      </div>

      <!-- PLC DEBUG -->
      <PlcDebugForm />

      <!-- Error -->
      <div v-if="error" class="alert alert-danger py-2">
        {{ error }}
      </div>

      <!-- Save -->
      <button
        class="btn btn-primary w-100"
        :disabled="loading"
        @click="save"
      >
        {{ loading ? "Saving..." : "Save Device" }}
      </button>

    </div>
  </div>
</template>

<script>
import Swal from "sweetalert2";
import PlcDebugForm from "./PlcDebugForm.vue";

const API = import.meta.env.VITE_API_BASE_URL + "/api/devices";


export default {
  name: "DeviceForm",
  components: {
    PlcDebugForm,
  },

  emits: ["saved"],

  data() {
    return {
      form: {
        name: "",
        device_type: "lamp",
        plc_address: "M0",
        refresh_rate_ms: 1000,
      },

      refreshValue: 1,
      refreshUnit: "sec",

      loading: false,
      error: "",
    };
  },

  methods: {
    toMs(value, unit) {
      return unit === "sec" ? value * 1000 : value;
    },

    async save() {
      this.error = "";

      if (!this.form.name) {
        this.error = "กรุณากรอก Device Name";
        return;
      }

      this.form.refresh_rate_ms = this.toMs(
        this.refreshValue,
        this.refreshUnit
      );

      try {
        this.loading = true;

        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.form),
        });

        const data = await res.json(); 

        if (!res.ok) {
          console.error("API ERROR:", data.message);
          throw new Error(data.message || "Save failed");
        }

        // data = object ที่ backend ส่งกลับมา
        this.$emit("saved", data);

        Swal.fire({
          icon: "success",
          title: "Saved",
          text: "Device saved to server",
          timer: 1200,
          showConfirmButton: false,
        });

        // reset
        this.form.name = "";
        this.form.plc_address = "M0";
        this.refreshValue = 1;
        this.refreshUnit = "sec";

      } catch (err) {
        console.error(err);
        this.error = err.message || "ไม่สามารถบันทึกข้อมูลได้";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.setting-card {
  max-width: 600px;
}
</style>
