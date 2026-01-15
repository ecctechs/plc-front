<template>
  <div class="container mt-4">
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      <div v-for="device in displayDevices" :key="device.id" class="col">
        <div class="card shadow-sm p-3 text-center position-relative">
          
          <span class="status-dot" :class="device.connected ? 'online' : 'offline'"></span>

          <div class="fw-bold fs-5 mb-1 text-truncate px-3">{{ device.name }}</div>
          <div class="text-muted small mb-3 text-uppercase">
            Type : {{ device.data_display_type.replace('_', ' ') }}
          </div>

          <div class="main-display-area d-flex align-items-center justify-content-center mb-3">
            
            <div v-if="device.data_display_type === 'onoff'" class="w-100">
              <div class="onoff-circle mx-auto mb-2" :class="device.value !== 0 ? 'on' : 'off'"></div>
              <div class="onoff-text mt-2" :class="device.value !== 0 ? 'text-success' : 'text-danger'">
                {{ device.value !== 0 ? "ON" : "OFF" }}
              </div>
            </div>

            <div v-else-if="device.data_display_type === 'number'" class="w-100 py-4">
              <div class="display-value fw-bold text-primary">
                {{ getDisplayValue(device) }}
              </div>
              <div class="text-muted fs-5">{{ device.numberConfig?.unit || '' }}</div>
            </div>

            <div v-else-if="device.data_display_type === 'number_gauge'" class="w-100">
              <div class="gauge-container mx-auto">
                <canvas :id="'gauge-' + device.id"></canvas>
              </div>
              <div class="text-muted small fw-bold mt-minus">
                {{ getDisplayValue(device) }} {{ device.numberConfig?.unit || '' }}
              </div>
            </div>

          </div>

          <div class="pt-3 border-top mt-auto">
            <div class="d-flex justify-content-center gap-2 mb-2">
              <button 
                class="btn btn-sm w-50" 
                :class="device.expand ? 'btn-secondary' : 'btn-outline-secondary'"
                @click="device.expand = !device.expand"
              >
                {{ device.expand ? "Hide Info" : "More Info" }}
              </button>
              <button class="btn btn-sm btn-outline-primary w-50" @click="openChart(device)">Chart</button>
            </div>

            <transition name="fade">
              <div v-if="device.expand" class="mt-2 text-muted small text-start bg-light p-2 rounded border shadow-inner">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <div>
                    <strong>Address:</strong> 
                    <span class="ms-1 text-primary">{{ device.plc_address }}</span>
                  </div>
                  
                  <div class="text-end">
                    <strong>Refresh:</strong> 
                    <span class="ms-1">{{ device.refresh_rate_ms }} ms</span>
                  </div>
                </div>
                <template v-if="device.data_display_type === 'number' || device.data_display_type === 'number_gauge'">
                  <div class="d-flex justify-content-between">
                    <strong>Scale:</strong> <span>×{{ device.numberConfig?.scale || 1 }}</span>
                  </div>
                  <div class="d-flex justify-content-between">
                    <strong>Offset:</strong> <span>{{ device.numberConfig?.offset || 0 }}</span>
                  </div>
                </template>

                <template v-if="device.data_display_type === 'number_gauge'">
                  <div class="d-flex justify-content-between border-top mt-1 pt-1">
                    <strong>Range:</strong> 
                    <span>{{ device.numberConfig?.min_value ?? 0 }} - {{ device.numberConfig?.max_value ?? 100 }}</span>
                  </div>
                </template>
                <div class="mt-1 pt-1 border-top" style="font-size: 0.7rem;">
                  <strong>Last Update:</strong> {{ device.updated_at ? formatTime(device.updated_at) : "-" }}
                </div>
              </div>
            </transition>
          </div>

        </div>
      </div>
    </div>
  </div>

  <div v-if="showChart" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
    <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header">
          <h5 class="modal-title">Chart : {{ selectedDevice?.name }}</h5>
          <button class="btn-close" @click="closeChart"></button>
        </div>
        <div class="modal-body text-center">
          <Chart v-if="selectedDevice" :device="selectedDevice" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Chart from "./Chart.vue";
import { RadialGauge } from 'canvas-gauges';

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "Dashboard",
  components: { Chart },
  props: {
    devices: { type: Array, required: true },
  },
  data() {
    return {
      statusTimer: null,
      selectedDevice: null,
      showChart: false,
      loading: false,
      gauges: {},
    };
  },
  computed: {
    displayDevices() {
      const allowedTypes = ["onoff", "number", "number_gauge"];
      return (this.devices || []).filter(d => d && allowedTypes.includes(d.data_display_type));
    },
  },
  watch: {
    devices: {
      deep: true,
      handler(newDevices) {
        newDevices.forEach(device => {
          if (device.data_display_type === 'number_gauge' && this.gauges[device.id]) {
            const val = parseFloat(this.getDisplayValue(device));
            this.gauges[device.id].value = val;
          }
        });
      }
    }
  },
  mounted() {
    this.startStatusPolling();
    this.initAllGauges();
  },
  updated() {
    this.initAllGauges();
  },
  beforeUnmount() {
    if (this.statusTimer) clearInterval(this.statusTimer);
    Object.values(this.gauges).forEach(g => g.destroy());
  },
  methods: {
    getDisplayValue(device) {
      const cfg = device.numberConfig || {};
      const raw = device.value ?? 0;
      const scaled = (raw * (cfg.scale ?? 1)) + (cfg.offset ?? 0);
      return Number(scaled).toFixed(cfg.decimal_places ?? 0);
    },
    // initAllGauges() {
    //   this.displayDevices.forEach(device => {
    //     if (device.data_display_type === 'number_gauge') {
    //       const canvasId = `gauge-${device.id}`;
    //       const canvasEl = document.getElementById(canvasId);
    //       if (canvasEl && !this.gauges[device.id]) {
    //         this.gauges[device.id] = new RadialGauge({
    //           renderTo: canvasEl,
    //           width: 180,
    //           height: 180,
    //           minValue: device.numberConfig?.min_value ?? 0,
    //           maxValue: device.numberConfig?.max_value ?? 100,
    //           value: parseFloat(this.getDisplayValue(device)),
    //           units: device.numberConfig?.unit || '',
    //           colorPlate: "#fff",
    //           borderShadowWidth: 0,
    //           borders: false,
    //           needleType: "arrow",
    //           needleWidth: 3,
    //           needleCircleSize: 7,
    //           needleCircleOuter: true,
    //           needleCircleInner: false,
    //           animationDuration: 500,
    //           animationRule: "linear",
    //           majorTicks: ["0", "20", "40", "60", "80", "100"],
    //           highlights: [],
    //           valueBox: false
    //         }).draw();
            
    //       }
    //     }
    //   });
    // },
    initAllGauges() {
      this.displayDevices.forEach(device => {
        if (device.data_display_type === 'number_gauge') {
          const canvasId = `gauge-${device.id}`;
          const canvasEl = document.getElementById(canvasId);
          
          if (canvasEl && !this.gauges[device.id]) {
            // ดึงค่า Config จาก Device
            const min = device.numberConfig?.min_value ?? 0;
            const max = device.numberConfig?.max_value ?? 100;
            const unit = device.numberConfig?.unit || '';
            const decimals = device.numberConfig?.decimal_places ?? 0;

            // ฟังก์ชันคำนวณ Major Ticks ให้แบ่งเป็น 5-6 ช่องอัตโนมัติ
            const generateTicks = (min, max) => {
              const ticks = [];
              const step = (max - min) / 5;
              for (let i = 0; i <= 5; i++) {
                ticks.push((min + (step * i)).toFixed(0));
              }
              return ticks;
            };

            this.gauges[device.id] = new RadialGauge({
              renderTo: canvasId,
              width: 180,
              height: 180,
              minValue: min,
              maxValue: max,
              value: parseFloat(this.getDisplayValue(device)),
              units: unit,
              
              // --- การตั้งค่าเพื่อรองรับค่าหลักล้าน ---
              majorTicks: generateTicks(min, max), // สร้างตัวเลขขีดแบ่งอัตโนมัติ
              colorNumbers: "#444",
              fontNumbersSize: 22, // ปรับขนาดตัวเลขถ้าค่าหลักล้านยาวเกินไป
              
              // --- ตกแต่งหน้าปัดให้สะอาดตา ---
              colorPlate: "#fff",
              borderShadowWidth: 0,
              borders: false,
              highlights: [], // ลบแถบสีเทาเข้มออก
              
              // --- เข็มไมล์ ---
              needleType: "arrow",
              needleWidth: 3,
              needleCircleSize: 7,
              needleCircleOuter: true,
              needleCircleInner: false,
              colorNeedle: "#ff6b6b",
              colorNeedleEnd: "#ff6b6b",
              
              // --- การแสดงผลตัวเลข (เราซ่อนไว้เพราะเขียนใน Vue เองแล้ว) ---
              valueBox: false, 
              
              // --- แอนิเมชัน ---
              animationDuration: 500,
              animationRule: "linear",
              strokeTicks: true,
            }).draw();
          }
        }
      });
    },
    openChart(device) {
      this.selectedDevice = device;
      this.showChart = true;
    },
    closeChart() {
      this.showChart = false;
      this.selectedDevice = null;
    },
    startStatusPolling() {
      this.loadStatus();
      this.statusTimer = setInterval(this.loadStatus, 1000);
    },
    async loadStatus() {
      try {
        const res = await fetch(`${BASE_API}/api/devices/status`);
        if (!res.ok) return;
        const statusList = await res.json();
        statusList.forEach(s => {
          const d = this.devices.find(x => x.id === s.id);
          if (d) {
            d.value = s.last_value;
            d.connected = s.connected;
            d.updated_at = s.value_updated_at;
          }
        });
      } catch (err) {
        console.error("STATUS ERROR:", err.message);
      }
    },
    formatTime(ts) {
      return new Date(ts).toLocaleTimeString();
    },
  },
};
</script>

<style scoped>
.status-dot {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  z-index: 10;
}
.status-dot.online { background-color: #28a745; box-shadow: 0 0 6px #28a745; }
.status-dot.offline { background-color: #dc3545; box-shadow: 0 0 6px #dc3545; }

/* พื้นที่แสดงผลหลัก บังคับความสูงเพื่อให้การ์ดแถวเดียวกันเท่ากันตอนยังไม่ขยาย */
.main-display-area {
  min-height: 220px;
}

.onoff-circle { 
  width: 160px; 
  height: 160px; 
  border-radius: 50%; 
  transition: 0.3s;
  border: 4px solid #f8f9fa;
}
.onoff-circle.on { background-color: #28a745; box-shadow: 0 0 20px rgba(40, 167, 69, 0.4); }
.onoff-circle.off { background-color: #dc3545; box-shadow: 0 0 20px rgba(220, 53, 69, 0.4); }

.onoff-text { font-size: 2.2rem; font-weight: 800; line-height: 1; }
.display-value { font-size: 3.5rem; line-height: 1; }

.gauge-container {
  width: 180px;
  height: 180px;
}

.mt-minus {
  margin-top: -15px;
}

.shadow-inner {
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

/* Animation สำหรับการยืดหด */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>