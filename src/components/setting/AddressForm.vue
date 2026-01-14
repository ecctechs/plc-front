<template>
  <div class="border rounded p-3 mb-3">
    <h6>PLC Address</h6>

    <div class="row g-2">

      <!-- Type -->
      <div class="col-4">
        <label class="form-label">Type</label>
        <input
          type="text"
          class="form-control"
          v-model="local.type"
          readonly
        />
      </div>

      <!-- Start -->
      <div class="col-4">
        <label class="form-label">Start</label>
        <input
          type="number"
          min="0"
          class="form-control"
          v-model.number="local.start"
        />
      </div>

      <!-- Length -->
      <div class="col-4">
        <label class="form-label">Length</label>
        <input
          type="number"
          min="1"
          class="form-control"
          v-model.number="local.length"
        />
      </div>

    </div>

    <!-- Hint -->
    <small class="text-muted d-block mt-2">
      Type จะถูกกำหนดอัตโนมัติตาม Data Display Type
    </small>
  </div>
</template>

<script>
export default {
  name: "AddressForm",

  props: {
    modelValue: {
      type: Object,
      required: true,
    },
    displayType: {
      type: String,
      required: true,
    },
  },

  emits: ["update:modelValue"],

  data() {
    return {
      local: JSON.parse(JSON.stringify(this.modelValue)),
    };
  },

  watch: {
    // ปรับ Type อัตโนมัติเมื่อ displayType เปลี่ยน
    displayType: {
      immediate: true,
      handler(type) {
        if (type === "onoff") {
          this.local.type = "M";
          this.local.length = 1;
        } else {
          this.local.type = "D";
          if (!this.local.length || this.local.length < 1) {
            this.local.length = 1;
          }
        }
      },
    },

    // emit กลับ DeviceForm
    local: {
      deep: true,
      handler(val) {
        this.$emit("update:modelValue", val);
      },
    },
    // sync จาก parent
    modelValue: {
      deep: true,
      handler(val) {
        this.local = JSON.parse(JSON.stringify(val));
      },
    },
  },
};
</script>
