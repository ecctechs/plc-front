<template>
  <div class="device-chart-container p-4 border rounded shadow-sm bg-white">
    <div class="row align-items-center mb-4 border-bottom pb-3">
      <div class="col-md-4">
        <small class="text-uppercase text-muted fw-bold d-block">Value Name</small>
        <h4 class="mb-0 text-primary">{{ device.label }}</h4>
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

    <div class="chart-area border rounded p-3" v-if="device.display_type === 'onoff'">
      <OnOffChart 
          :device="device" 
          :start-date="startDate" 
          :end-date="endDate" 
        />
    </div>

    <div class="chart-area border rounded p-3" v-if="device.display_type === 'number'">
      <NumberChart 
          :device="device" 
          :start-date="startDate" 
          :end-date="endDate" 
        />
    </div>

    <div class="chart-area border rounded p-3" v-if="device.display_type === 'number_gauge'">
      <NumberGaugeChart 
          :device="device" 
          :start-date="startDate" 
          :end-date="endDate" 
        />
    </div>

    <div class="chart-area border rounded p-3" v-if="device.display_type === 'level'">
      <LevelChart 
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
import NumberChart from '../components/chart/NumberChart.vue';
import NumberGaugeChart from '../components/chart/NumberGaugeChart.vue';
import LevelChart from '../components/chart/LevelChart.vue';

export default {
  name: "Chart",
  components: {
    OnOffChart,
    NumberChart,
    NumberGaugeChart,
    LevelChart
  },
  props: {
    device: Object,
    initialStart: String,
    initialEnd: String
  },
  data() {
    const today = new Date().toISOString().substr(0, 10);
    return {
      startDate: this.initialStart || `${today}T00:00`,
      endDate: this.initialEnd || `${today}T23:59`,
    };
  },
  watch: {
    initialStart(newVal) {
      if (newVal) this.startDate = newVal;
    },
    initialEnd(newVal) {
      if (newVal) this.endDate = newVal;
    }
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