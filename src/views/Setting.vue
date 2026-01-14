<template>
  <div class="setting-page">
       <DeviceForm @saved="addDevice" />
      <WorkingTimeForm />
  </div>
</template>

<script>
import WorkingTimeForm from "../components/setting/WorkingTimeForm.vue";
import DeviceForm from "../components/setting/DeviceForm.vue";

export default {
  name: "Setting",
  emits: ["add-device"],
  components: {
    WorkingTimeForm,
    DeviceForm
  },
  data() {
    return {
      devices: [], // ✅ mock storage
    };
  },
  methods: {
    addDevice(device) {
      this.$emit("add-device", device);
    },
  },
};
</script>

<style scoped>
.setting-page {
  padding: 24px;
}
</style>
