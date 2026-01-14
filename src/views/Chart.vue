<template>
  <div class="device-chart-container p-4 border rounded shadow-sm bg-white">
    <div class="row align-items-center mb-4 border-bottom pb-3">
      <div class="col-md-4">
        <small class="text-uppercase text-muted fw-bold d-block">Device Name</small>
        <h4 class="mb-0 text-primary">{{ device.name }}</h4>
      </div>
      <div class="col-md-4 border-start">
        <small class="text-uppercase text-muted fw-bold d-block">PLC Address</small>
        <code class="fs-5">{{ device.plc_address }}</code>
      </div>
      <div class="col-md-4 border-start">
        <small class="text-uppercase text-muted fw-bold d-block">Refresh Rate</small>
        <span class="fs-5">{{ device.refresh_rate_ms }} <small>ms</small></span>
      </div>
    </div>

    <div class="row g-3 mb-4 bg-light p-3 rounded">
      <div class="col-sm-auto d-flex align-items-center">
        <span class="fw-bold me-2">Filter:</span>
      </div>
      <div class="col-sm-4">
        <div class="input-group input-group-sm">
          <span class="input-group-text">Start</span>
          <input type="datetime-local" v-model="startDate" class="form-control" @change="onDateChange">
        </div>
      </div>
      <div class="col-sm-4">
        <div class="input-group input-group-sm">
          <span class="input-group-text">End</span>
          <input type="datetime-local" v-model="endDate" class="form-control" @change="onDateChange">
        </div>
      </div>
    </div>

    <div class="chart-area border rounded p-3">
      <OnOffChart 
          :device="device" 
          :start-date="startDate" 
          :end-date="endDate" 
        />
    </div>
  </div>
</template>

<script>
// นำเข้า OnOffChart จากโฟลเดอร์ components
import OnOffChart from '../components/chart/OnOffChart.vue';

export default {
  name: "Chart",
  components: {
    OnOffChart
  },
  props: {
    device: {
      type: Object,
      required: true,
    },
  },
  data() {
    const today = new Date().toISOString().substr(0, 10);
    return {
      // กำหนดค่าเริ่มต้นเป็นวันที่ปัจจุบัน
    startDate: `${today}T00:00`,
    endDate: `${today}T23:59`,
    };
  },
  methods: {
    onDateChange() {
      // แจ้ง Parent Component ว่ามีการเปลี่ยนวันที่
      this.$emit('filter-changed', { start: this.startDate, end: this.endDate });
    }
  }
};
</script>

<style scoped>
.text-uppercase {
  letter-spacing: 0.5px;
  font-size: 0.75rem;
}
.chart-area {
  min-height: 400px;
  background-color: #f8f9fa;
}
</style>