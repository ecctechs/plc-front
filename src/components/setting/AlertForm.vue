<template>
  <div class="border rounded p-3 mb-3">
    <h6>Alert Setting</h6>

    <!-- Enable -->
    <div class="form-check mb-3">
      <input
        class="form-check-input"
        type="checkbox"
        v-model="local.enabled"
        id="alertEnable"
      />
      <label class="form-check-label" for="alertEnable">
        Enable Alert
      </label>
    </div>

    <div v-if="local.enabled">

      <!-- ON / OFF -->
      <div v-if="displayType === 'onoff'">
        <label class="form-label">OFF Duration (minute)</label>
        <input
          type="number"
          min="1"
          v-model.number="local.offDuration"
          class="form-control mb-2"
        />

        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            v-model="local.onlyWorkingTime"
            id="onlyWorking"
          />
          <label class="form-check-label" for="onlyWorking">
            Alert only in working time
          </label>
        </div>
      </div>

      <!-- NUMBER / GAUGE -->
      <div
        v-if="displayType === 'number' || displayType === 'gauge'"
      >
        <div class="row g-2 mb-2">
          <div class="col-6">
            <label class="form-label">Lower</label>
            <input
              type="number"
              v-model.number="local.lower"
              class="form-control"
            />
          </div>
          <div class="col-6">
            <label class="form-label">Upper</label>
            <input
              type="number"
              v-model.number="local.upper"
              class="form-control"
            />
          </div>
        </div>

        <label class="form-label">Duration (sec)</label>
        <input
          type="number"
          min="0"
          v-model.number="local.duration"
          class="form-control"
        />
      </div>

      <!-- EMAIL -->
      <label class="form-label mt-2">Email</label>
      <input
        type="text"
        v-model="local.emails"
        class="form-control"
        placeholder="admin@email.com, support@email.com"
      />

    </div>
  </div>
</template>

<script>
export default {
  name: "AlertForm",

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
