<template>
  <div class="border rounded p-3 mb-3">
    <h6>Number Display Setting</h6>

    <!-- Decimal -->
    <div class="row g-2 mb-3">
      <div class="col-4">
        <label class="form-label">Decimal</label>
        <input
          type="number"
          min="0"
          v-model.number="local.decimal"
          class="form-control"
        />
      </div>

      <div class="col-4">
        <label class="form-label">Scale (×)</label>
        <input
          type="number"
          v-model.number="local.scale"
          class="form-control"
        />
      </div>

      <div class="col-4">
        <label class="form-label">Offset (+)</label>
        <input
          type="number"
          v-model.number="local.offset"
          class="form-control"
        />
      </div>
    </div>

    <!-- Unit -->
    <div class="mb-3">
      <label class="form-label">Unit</label>
      <input
        type="text"
        v-model="local.unit"
        class="form-control"
        placeholder="°C, bar, rpm"
      />
    </div>

    <!-- Preview -->
    <div class="bg-light rounded p-2">
      <small class="text-muted">Preview</small>
      <div class="fw-bold">
        {{ previewValue }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "DisplayNumber",

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

      // mock raw value
      rawValue: 12.3456,
    };
  },

  computed: {
    previewValue() {
      let v = this.rawValue;

      if (typeof this.local.scale === "number") {
        v = v * this.local.scale;
      }

      if (typeof this.local.offset === "number") {
        v = v + this.local.offset;
      }

      const d = this.local.decimal ?? 0;
      return `${v.toFixed(d)} ${this.local.unit || ""}`;
    },
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
