<template>
  <div class="border rounded p-3 mb-3">
    <h6>On / Off Display Setting</h6>

    <!-- Default State -->
    <div class="mb-3">
      <label class="form-label">Default State</label>
      <select v-model="local.defaultState" class="form-select">
        <option :value="true">ON</option>
        <option :value="false">OFF</option>
      </select>
    </div>

    <!-- Label -->
    <div class="mb-3">
      <label class="form-label">ON Label</label>
      <input
        type="text"
        v-model="local.onLabel"
        class="form-control"
        placeholder="ON"
      />
    </div>

    <div class="mb-3">
      <label class="form-label">OFF Label</label>
      <input
        type="text"
        v-model="local.offLabel"
        class="form-control"
        placeholder="OFF"
      />
    </div>

    <!-- Icon Preview (Mock) -->
    <div class="d-flex align-items-center gap-3">
      <span class="fw-bold">Preview:</span>

      <span
        class="badge"
        :class="local.defaultState ? 'bg-success' : 'bg-secondary'"
      >
        {{ local.defaultState ? local.onLabel : local.offLabel }}
      </span>
    </div>
  </div>
</template>

<script>
export default {
  name: "DisplayOnOff",

  props: {
    modelValue: {
      type: Object,
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
    local: {
      deep: true,
      handler(val) {
        this.$emit("update:modelValue", val);
      },
    },

    modelValue: {
      deep: true,
      handler(val) {
        this.local = JSON.parse(JSON.stringify(val));
      },
    },
  },
};
</script>
