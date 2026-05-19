<template>
  <div class="container-fluid mt-4">
    <div>
      <h3 class="page-title">
        <i class="bi bi-gear-wide-connected page-title-icon me-2"></i>{{ locale.t('System Settings') }}
      </h3>
      <p class="page-title-subtitle mb-4">{{ locale.t('Manage PLC system settings') }}</p>
    </div>

    <!-- Section 0: Role Setting (100%) -->
    <div class="setting-section mb-4">
      <RoleSetting />
    </div>

    <!-- Section 1: Type + Room (70% + 30%) -->
    <div class="row g-4 mb-4">
      <div class="col-12 col-md-8">
        <TypeSetting />
      </div>
      <div class="col-12 col-md-4">
        <RoomSetting @room-updated="reloadDevices" />
      </div>
    </div>

    <!-- Section 2: Product Management (100%) -->
    <div class="setting-section mb-4">
      <ProductSetting ref="productSetting" @edit="openProductForm" @add="openProductForm" />
    </div>

    <!-- Section 3: Device Management (100%) -->
    <div class="setting-section mb-4">
      <DeviceSetting ref="deviceSetting" @edit="openDeviceForm" @add="openDeviceForm" />
    </div>

    <!-- Section 4: Working Time + PLC Debug (50% + 50%) -->
    <div class="row g-4">
      <div class="col-12 col-md-12">
        <WorkingTimeForm />
      </div>
      <div class="col-12 col-md-12">
        <PlcDebugForm />
      </div>
    </div>


    <DeviceForm ref="deviceFormModal" @saved="onDeviceSaved" :reloadDevices="reloadDevices" />
    <ProductForm ref="productFormModal" @saved="onProductSaved" :reloadProducts="reloadProducts" />
  </div>
</template>

<script>
import RoleSetting from "../components/setting/RoleSetting.vue";
import TypeSetting from "../components/setting/TypeSetting.vue";
import RoomSetting from "../components/setting/RoomSetting.vue";
import ProductSetting from "../components/setting/ProductSetting.vue";
import ProductForm from "../components/setting/ProductForm.vue";
import DeviceSetting from "../components/setting/DeviceSetting.vue";
import WorkingTimeForm from "../components/setting/WorkingTimeForm.vue";
import PlcDebugForm from "../components/setting/PlcDebugForm.vue";
import DeviceForm from "../components/setting/DeviceForm.vue";

export default {
  name: "Setting",
  emits: ["add-device", "add-product"],
  
  inject: ['locale'],
  
  components: {
    RoleSetting,
    TypeSetting,
    RoomSetting,
    ProductSetting,
    ProductForm,
    DeviceSetting,
    WorkingTimeForm,
    PlcDebugForm,
    DeviceForm
  },
  data() {
    return {
      devices: [],
      products: [],
    };
  },
  methods: {
    openDeviceForm(device = null) {
      this.$refs.deviceFormModal.open(device);
    },
    openProductForm(product = null) {
      this.$refs.productFormModal.open(product);
    },
    reloadDevices() {
      this.$refs.deviceSetting.loadDevices();
    },
    reloadProducts() {
      this.$refs.productSetting.loadProducts();
    },
    onDeviceSaved() {
      this.$emit("add-device");
    },
    onProductSaved() {
      this.$emit("add-product");
    },
    addDevice(device) {
      this.$emit("add-device", device);
    },
  },
};
</script>

<style scoped>
.setting-section {
  margin-bottom: 24px;
}
</style>
