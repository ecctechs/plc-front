<template>
  <div class="border rounded p-3 mb-3">
    <h6 class="mb-3">Number Setting ({{ type }})</h6>

    <div class="row g-2 mb-3">
      <div class="col-4">
        <label class="form-label small">Decimal</label>
        <input
          type="number"
          min="0"
          v-model.number="model.decimal_places"
          class="form-control"
        />
      </div>

      <div class="col-4">
        <label class="form-label small">Scale (×)</label>
        <input
          type="number"
          step="any"
          v-model.number="model.scale"
          class="form-control"
        />
      </div>

      <div class="col-4">
        <label class="form-label small">Offset (+)</label>
        <input
          type="number"
          step="any"
          v-model.number="model.offset"
          class="form-control"
        />
      </div>
    </div>

    <div
      v-if="type === 'number_gauge'"
      class="row g-2 mb-3"
    >
      <div class="col-4">
        <label class="form-label small">Min Value</label>
        <input
          type="number"
          step="any"
          v-model.number="model.min_value"
          class="form-control"
        />
      </div>

      <div class="col-4">
        <label class="form-label small">Max Value</label>
        <input
          type="number"
          step="any"
          v-model.number="model.max_value"
          class="form-control"
        />
      </div>

      <div class="col-4">
        <label class="form-label small">Unit</label>
        <input
          type="text"
          v-model="model.unit"
          class="form-control"
          placeholder="rpm, °C, bar"
        />
      </div>
    </div>

    <div
      v-if="type === 'number_gauge' && minMaxInvalid"
      class="text-danger small mb-2"
    >
      Min value ต้องน้อยกว่า Max value
    </div>

    <div class="bg-light rounded p-2 text-center">
      <div class="small text-muted">Preview</div>

      <div class="fs-5 fw-bold">
        {{ previewValue }}
        <span v-if="type === 'number_gauge' && model.unit" class="fs-6">
          {{ model.unit }}
        </span>
      </div>

      <div class="small text-muted" style="font-size: 11px;">
        raw {{ rawValue }} → ({{ rawValue }} × {{ model.scale ?? 1 }} + {{ model.offset ?? 0 }})
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
    // รับค่า 'number' หรือ 'number_gauge'
    type: {
      type: String,
      default: 'number' 
    }
  },

  computed: {
    model: {
      get() {
        return this.modelValue;
      },
      set(v) {
        this.$emit("update:modelValue", v);
      },
    },

    rawValue() {
      return 123;
    },

    previewValue() {
      const scale = this.model.scale ?? 1;
      const offset = this.model.offset ?? 0;
      const decimal = this.model.decimal_places ?? 0;

      const scaled = this.rawValue * scale + offset;
      return Number(scaled).toFixed(decimal);
    },

    minMaxInvalid() {
      if (this.type !== 'number_gauge') return false;

      if (
        this.model.min_value !== null &&
        this.model.max_value !== null &&
        this.model.min_value !== undefined &&
        this.model.max_value !== undefined
      ) {
        return Number(this.model.min_value) >= Number(this.model.max_value);
      }
      return false;
    },
  },
};
</script>