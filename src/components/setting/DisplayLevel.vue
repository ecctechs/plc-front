<template>
  <div class="border rounded p-3 mb-3">
    <h6>Level Setting</h6>

    <select v-model="model.mode" class="form-select mb-2">
      <option value="exact">Exact</option>
      <option value="criteria">Criteria</option>
    </select>

    <input
      v-if="model.mode === 'exact'"
      v-model="model.exactValues"
      class="form-control"
      placeholder="0,1,2"
    />
  </div>
</template>

<script>
export default {
  name: "DisplayLevel",
  props: {
    modelValue: Object,
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
  },
};
</script>
