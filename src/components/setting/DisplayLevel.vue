<template>
  <div class="border rounded p-3 mb-3">
    <h6>Level Display Setting</h6>

    <!-- ===== Mode ===== -->
    <div class="mb-3">
      <label class="form-label">Mode</label>
      <select v-model="local.mode" class="form-select">
        <option value="exact">Exact</option>
        <option value="criteria">Criteria</option>
      </select>
    </div>

    <!-- ===== Exact Mode ===== -->
    <div v-if="local.mode === 'exact'" class="mb-3">
      <label class="form-label">Exact Values</label>
      <input
        type="text"
        v-model="local.exactValues"
        class="form-control"
        placeholder="0,1,2"
      />
      <small class="text-muted">
        คั่นค่าด้วยเครื่องหมาย ,
      </small>
    </div>

    <!-- ===== Criteria Mode ===== -->
    <div v-else class="mb-3">

      <label class="form-label">Criteria</label>
      <select v-model="local.criteria" class="form-select mb-2">
        <option value="lt">LT (&lt;)</option>
        <option value="lte">LTE (&le;)</option>
        <option value="mt">MT (&gt;)</option>
        <option value="mte">MTE (&ge;)</option>
        <option value="btw">BTW (Between)</option>
      </select>

      <div class="row g-2">
        <div class="col-6">
          <input
            type="number"
            v-model.number="local.value1"
            class="form-control"
            placeholder="Value 1"
          />
        </div>

        <div
          class="col-6"
          v-if="local.criteria === 'btw'"
        >
          <input
            type="number"
            v-model.number="local.value2"
            class="form-control"
            placeholder="Value 2"
          />
        </div>
      </div>
    </div>

    <!-- ===== Preview ===== -->
    <div class="bg-light rounded p-2">
      <small class="text-muted">Preview</small>

      <div class="fw-bold">
        {{ previewText }}
      </div>
    </div>

  </div>
</template>

<script>
export default {
  name: "DisplayLevel",

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

      // mock input value
      mockValue: 1,
    };
  },

  computed: {
    previewText() {
      if (this.local.mode === "exact") {
        return `Value = ${this.mockValue} → Levels: ${this.local.exactValues}`;
      }

      const v1 = this.local.value1;
      const v2 = this.local.value2;

      switch (this.local.criteria) {
        case "lt":
          return `${this.mockValue} < ${v1}`;
        case "lte":
          return `${this.mockValue} ≤ ${v1}`;
        case "mt":
          return `${this.mockValue} > ${v1}`;
        case "mte":
          return `${this.mockValue} ≥ ${v1}`;
        case "btw":
          return `${v1} ≤ ${this.mockValue} ≤ ${v2}`;
        default:
          return "";
      }
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
