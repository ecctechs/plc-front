<template>
  <div class="border rounded p-3 mb-3">
    <h6 class="mb-3">PLC Address</h6>

    <div class="row g-2 align-items-end">

      <!-- Address -->
      <div class="col-7">
        <label class="form-label small">Address</label>
        <div class="input-group">
          <span class="input-group-text">
            {{ addressPrefix }}
          </span>
          <input
            type="number"
            min="0"
            class="form-control"
            :value="addressNumber"
            @input="onAddressChange($event.target.value)"
            placeholder="0"
          />
        </div>
      </div>

      <!-- Refresh -->
      <div class="col-5">
        <label class="form-label small">Refresh Rate (ms)</label>
        <input
          type="number"
          min="500"
          class="form-control"
          :value="refresh"
          @input="$emit('update:refresh', +$event.target.value)"
        />
      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: "AddressForm",

  props: {
    address: {
      type: String,
      required: true,
    },
    refresh: {
      type: Number,
      required: true,
    },
    dataDisplayType: {
      type: String,
      required: true, // onoff | number
    },
  },

  computed: {
    // fix prefix ตาม display type
    addressPrefix() {
      return this.dataDisplayType === "onoff" ? "M" : "D";
    },

    // ดึงเฉพาะตัวเลขจาก M0 / D10
    addressNumber() {
      return Number(this.address.replace(/[^\d]/g, "")) || 0;
    },
  },

  watch: {
    // ถ้าเปลี่ยน display type → force address ใหม่
    dataDisplayType: {
      immediate: true,
      handler() {
        this.emitAddress(this.addressNumber);
      },
    },
  },

  methods: {
    onAddressChange(num) {
      this.emitAddress(num);
    },

    emitAddress(num) {
      const safe = num === "" || num === null || num === undefined ? 0 : num;
      const value = `${this.addressPrefix}${safe}`;
      this.$emit("update:address", value);
    },
  },
};
</script>
