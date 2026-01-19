<template>
  <div class="border rounded p-3 mb-3">
    <h6 class="mb-3">Level Setting</h6>

    <div v-for="(level, index) in modelValue" :key="index" class="border rounded p-2 mb-2 bg-light">
      <div class="row g-2 align-items-end">
        <div class="col-3">
          <label class="form-label small">Label</label>
          <input v-model="level.label" class="form-control form-control-sm" placeholder="เช่น High" />
        </div>

        <div class="col-3">
          <label class="form-label small">Condition</label>
          <select v-model="level.condition_type" class="form-select form-select-sm">
            <option value="LT">&lt;</option>
            <option value="LTE">&le;</option>
            <option value="GT">&gt;</option>
            <option value="GTE">&ge;</option>
            <option value="BTW">Between</option>
          </select>
        </div>

        <div class="col-2">
          <label class="form-label small">Min</label>
          <input type="number" step="any" v-model.number="level.min_value" 
                 class="form-control form-control-sm" :disabled="!usesMin(level)" />
        </div>

        <div class="col-2">
          <label class="form-label small">Max</label>
          <input type="number" step="any" v-model.number="level.max_value" 
                 class="form-control form-control-sm" :disabled="!usesMax(level)" />
        </div>

        <div class="col-2 text-end">
          <button class="btn btn-sm btn-outline-danger w-100" @click="removeLevel(index)">✕</button>
        </div>
      </div>
    </div>

    <button class="btn btn-sm btn-outline-primary mt-2" @click="addLevel">+ Add Level</button>
  </div>
</template>

<script>
export default {
  name: "DisplayLevel",
  props: {
    modelValue: { type: Array, default: () => [] }
  },
  emits: ["update:modelValue"],
  methods: {
    addLevel() {
      const newList = [...this.modelValue];
      newList.push({
        level_index: newList.length,
        label: "",
        condition_type: "LTE",
        min_value: null,
        max_value: null,
        include_min: true,  // เพิ่มตามที่ API ต้องการ
        include_max: true
      });
      this.$emit("update:modelValue", newList);
    },
    removeLevel(index) {
      const newList = [...this.modelValue];
      newList.splice(index, 1);
      newList.forEach((l, i) => (l.level_index = i));
      this.$emit("update:modelValue", newList);
    },
    usesMin(level) { return ["GT", "GTE", "BTW"].includes(level.condition_type); },
    usesMax(level) { return ["LT", "LTE", "BTW"].includes(level.condition_type); }
  }
};
</script>