<template>
  <div class="border rounded p-3 mb-3 bg-white shadow-sm">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 class="m-0 fw-bold text-primary">Level</h6>
      <button class="btn btn-sm btn-primary" @click="addLevel">+ Add Item</button>
    </div>

    <div class="row g-2 mb-2 pb-2 border-bottom d-none d-md-flex align-items-center text-secondary small fw-bold">
      <div class="col-md-2">Label</div>
      <div class="col-md-2">Type</div>
      <div class="col-md-2">Condition</div>
      <div class="col-md-2">Min / Value</div>
      <div class="col-md-2">Max</div>
      <div class="col-md-1 text-center">Delete</div>
    </div>

    <div v-for="(level, index) in modelValue" :key="index" class="row g-2 mb-2 align-items-center border-bottom pb-2">
      <div class="col-md-2">
        <input v-model="level.label" class="form-control form-control-sm" placeholder="Label" />
      </div>

      <div class="col-md-2">
        <select v-model="level.mode" class="form-select form-select-sm" @change="syncCondition(level)">
          <option value="exact">Exact (ค่าคงที่)</option>
          <option value="criteria">Criteria (ช่วง)</option>
        </select>
      </div>

      <div class="col-md-2">
        <select v-model="level.condition_type" class="form-select form-select-sm" :disabled="level.mode === 'exact'">
          <option v-if="level.mode === 'exact'" value="EQ">Equal (=)</option>
          <template v-else>
            <option value="LT">&lt;</option>
            <option value="LTE">&le;</option>
            <option value="MT">&gt;</option>
            <option value="MTE">&ge;</option>
            <option value="BTW">Between</option>
          </template>
        </select>
      </div>

      <div class="col-md-2">
        <div class="input-group input-group-sm">
          <input type="number" step="any" v-model.number="level.min_value" class="form-control" />
          <div class="input-group-text bg-white" v-if="level.mode === 'criteria' && usesMin(level)">
            <input type="checkbox" v-model="level.include_min" class="form-check-input mt-0" title="Include (=)">
            <span class="ms-1 small-7">=</span>
          </div>
        </div>
      </div>

      <div class="col-md-2">
        <div class="input-group input-group-sm" v-if="level.condition_type === 'BTW'">
          <input type="number" step="any" v-model.number="level.max_value" class="form-control" />
          <div class="input-group-text bg-white">
            <input type="checkbox" v-model="level.include_max" class="form-check-input mt-0" title="Include (=)">
            <span class="ms-1 small-7">=</span>
          </div>
        </div>
        <div v-else class="text-center text-muted small">-</div>
      </div>

      <div class="col-md-1 text-center">
        <button class="btn btn-sm btn-outline-danger border-0" @click="removeLevel(index)">✕</button>
      </div>
    </div>

    <div v-if="validationError" class="alert alert-warning py-2 small mt-3 m-0">
      <i class="bi bi-exclamation-triangle me-2"></i>{{ validationError }}
    </div>
  </div>
</template>

<script>
export default {
  props: ["modelValue"],
  emits: ["update:modelValue", "validate"],
  computed: {
    validationError() {
      const levels = this.modelValue;
      if (!levels || levels.length === 0) return "กรุณาเพิ่มอย่างน้อย 1 รายการ";
      const hasExact = levels.some(l => l.mode === 'exact');
      if (hasExact) return null;

      const sorted = [...levels].sort((a, b) => (a.min_value ?? -Infinity) - (b.min_value ?? -Infinity));
      if (this.isMinCondition(sorted[0]) && sorted[0].min_value !== null) return "ต้องเริ่มจาก -Infinity";
      if (this.isMaxCondition(sorted[sorted.length-1]) && sorted[sorted.length-1].max_value !== null) return "ต้องจบที่ +Infinity";

      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const next = sorted[i+1];
        const currMax = curr.condition_type === 'BTW' ? curr.max_value : curr.min_value;
        const nextMin = next.min_value;
        if (currMax !== nextMin) return `รอยต่อไม่ต่อเนื่องที่ค่า ${currMax}`;
        
        const currHasEqual = curr.condition_type === 'BTW' ? curr.include_max : (curr.condition_type === 'LTE' || curr.condition_type === 'MTE');
        const nextHasEqual = next.condition_type === 'BTW' ? next.include_min : (next.condition_type === 'LTE' || next.condition_type === 'MTE');
        if (currHasEqual === nextHasEqual) return `ค่า ${currMax} ซ้อนทับหรือขาดหาย (เลือก Include ฝั่งเดียว)`;
      }
      return null;
    }
  },
  methods: {
    addLevel() {
      const newList = [...this.modelValue];
      newList.push({ mode: "criteria", label: "", condition_type: "BTW", min_value: null, max_value: null, include_min: false, include_max: true });
      this.$emit("update:modelValue", newList);
    },
    syncCondition(l) {
      l.condition_type = l.mode === 'exact' ? 'EQ' : 'BTW';
      l.include_min = false; l.include_max = l.condition_type === 'BTW';
    },
    removeLevel(index) {
      const newList = [...this.modelValue];
      newList.splice(index, 1);
      this.$emit("update:modelValue", newList);
    },
    usesMin(l) { return ["MT", "MTE", "BTW"].includes(l.condition_type); },
    isMinCondition(l) { return ["MT", "MTE", "BTW"].includes(l.condition_type); },
    isMaxCondition(l) { return ["LT", "LTE", "BTW"].includes(l.condition_type); }
  },
  watch: { validationError: { immediate: true, handler(v) { this.$emit("validate", v); } } }
};
</script>

<style scoped>
.small-7 { font-size: 0.75rem; }
.input-group-text { padding: 0 0.5rem; }
</style>