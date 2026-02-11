<template>
  <div class="container-fluid mt-4">
    
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      <div v-for="addr in addresses" :key="addr.address_id" class="col">

        <div class="card shadow-sm p-4 text-center position-relative custom-card h-100 d-flex flex-column">
          
          <!-- Delete icon (Edit mode only) -->
          <button
            v-if="editMode"
            class="btn btn-sm btn-danger position-absolute delete-btn"
            @click="$emit('delete-card', addr)"
          >
            <i class="fas fa-trash"></i>
          </button>

          <span class="status-dot" :class="addr.is_connected ? 'online' : 'offline'"></span>

          <div class="mb-2">
            <h4 class="fw-bold text-dark mb-0 text-uppercase">{{ addr.device.name }}</h4>
            <div class="text-muted small mb-3 text-uppercase">{{ addr.label.toUpperCase() }}</div>
          </div>

          <div class="flex-grow-1 d-flex flex-column justify-content-center my-4">
            
            <div v-if="addr.data_type === 'onoff'" class="w-100">
              <div class="onoff-circle mx-auto mb-2" :class="addr.last_value !== 0 ? 'on' : 'off'"></div>
              <h2 class="onoff-text fw-bold mb-0" :class="addr.last_value !== 0 ? 'text-success' : 'text-danger'">
                {{ addr.last_value !== 0 ? "ON" : "OFF" }}
              </h2>
            </div>

            <div v-else-if="addr.data_type === 'number' || addr.data_type === 'level'" class="w-100 py-3">
              <div class="display-value fw-bold" :class="getValueColor(addr)">
                {{ getDisplayValue(addr) }}
              </div>
              <div v-if="addr.numberConfig?.unit" class="text-muted fw-bold">{{ addr.numberConfig.unit }}</div>
            </div>

            <div v-else-if="addr.data_type === 'number_gauge'" class="w-100">
              <div class="gauge-container mx-auto">
                <canvas :id="'gauge-' + addr.address_id"></canvas>
              </div>
              <div class="fw-bold mt-2 fs-4" :class="getValueColor(addr)">
                {{ getDisplayValue(addr) }} {{ addr.numberConfig?.unit }}
              </div>
            </div>
          </div>

          <div class="mt-auto">
            <div class="pt-3 border-top-light">
              <div class="row g-2">
                <div class="col-6">
                  <button
                    class="btn btn-custom w-100"
                    :class="addr.expand ? 'btn-secondary' : 'btn-outline-secondary'"
                    @click="addr.expand = !addr.expand"
                  >
                    {{ addr.expand ? 'Hide Info' : 'More Info' }}
                  </button>
                </div>
                <div class="col-6">
                  <button class="btn btn-outline-primary btn-custom w-100" @click="openChart(addr)">
                    Chart
                  </button>
                </div>
              </div>
            </div>

            <transition name="fade">
              <div v-if="addr.expand" class="info-panel mt-3 p-3 bg-light rounded text-start small">
                <div class="d-flex justify-content-between mb-1">
                  <span><strong>Address:</strong> {{ addr.plc_address }}</span>
                  <span class="text-muted">Refresh: {{ addr.refresh_rate_ms }} ms</span>
                </div>

                <div v-if="addr.numberConfig">
                  <div>Scale: <strong>×{{ addr.numberConfig.scale ?? 1 }}</strong></div>
                  <div>Offset: <strong>{{ addr.numberConfig.offset ?? 0 }}</strong></div>
                  <div v-if="addr.numberConfig.min_value !== undefined">
                    Range: <strong>{{ addr.numberConfig.min_value }} - {{ addr.numberConfig.max_value }}</strong>
                  </div>
                </div>
                <div class="text-muted mt-2 border-top pt-1">
                  Last Update: {{ formatTimeOnly(addr.updated_at) }}
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
          <h5 class="modal-title">Chart : {{ selectedAddress?.label }}</h5>
          <button class="btn-close" @click="closeChart"></button>
        </div>
        <div class="modal-body text-center">
          <Chart v-if="selectedAddress" :device="selectedAddress" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Chart from "./Chart.vue";
import { RadialGauge } from 'canvas-gauges';

export default {
  name: "Dashboard",
  components: { Chart },
  props: {
    addresses: { type: Array, required: true },
    simulate: { type: Boolean, default: false },
    editMode: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      selectedAddress: null,
      showChart: false,
      gauges: {},
      localAddresses: []
    };
  },
  watch: {
    addresses: {
      deep: true,
      handler(newVal) {
        this.localAddresses = newVal;
        this.updateGauges();
      }
    }
  },
  mounted() {
    this.localAddresses = this.addresses;
    this.$nextTick(() => {
      this.initAllGauges();
    });
  },
  updated() {
    this.$nextTick(() => {
      this.initAllGauges();
    });
  },
  methods: {
    // คำนวณแถบสีบนหน้าปัด Gauge
    getGaugeHighlights(addr) {
      if (!addr.alarms || addr.alarms.length === 0) return [];

      const highlights = [];
      const minGauge = addr.numberConfig?.min_value ?? 0;
      const maxGauge = addr.numberConfig?.max_value ?? 100;

      addr.alarms.forEach(al => {
        let color = '#28a745'; 
        if (al.severity === 'warning' || al.severity === 'Warning') color = '#ffc107';
        if (al.severity === 'critical' || al.severity === 'Error') color = '#dc3545';

        let from = 0;
        let to = 0;

        if (al.type === 'BTW') {
          from = al.min;
          to = al.max;
        } else if (al.type === 'MTE' || al.type === 'MT') {
          from = al.min;
          to = maxGauge;
        } else if (al.type === 'LTE' || al.type === 'LT') {
          from = minGauge;
          to = al.min;
        }

        highlights.push({ from, to, color });
      });

      return highlights;
    },

    getValueColor(addr) {
      if (!addr.alarms || addr.alarms.length === 0) return 'text-success';

      const currentValue = parseFloat(this.getDisplayValue(addr));
      
      const isCritical = addr.alarms.some(al => 
        (al.severity === 'critical' || al.severity === 'Error') && this.checkCondition(currentValue, al)
      );
      if (isCritical) return 'text-danger';

      const isWarning = addr.alarms.some(al => 
        (al.severity === 'warning' || al.severity === 'Warning') && this.checkCondition(currentValue, al)
      );
      if (isWarning) return 'text-warning';

      return 'text-success';
    },

    checkCondition(value, rule) {
      const min = rule.min;
      const max = rule.max;
      switch (rule.type) {
        case 'EXACT': return value === min;
        case 'MT':    return value > min;
        case 'MTE':   return value >= min;
        case 'LT':    return value < (max ?? min);
        case 'LTE':   return value <= (max ?? min);
        case 'BTW':   return value >= min && value <= max;
        default:      return false;
      }
    },

    initAllGauges() {
      if (!this.localAddresses || this.localAddresses.length === 0) return;

      this.localAddresses.forEach(addr => {
        if (addr.data_type === 'number_gauge') {
          const canvasId = `gauge-${addr.address_id}`;
          const canvasEl = document.getElementById(canvasId);
          
          if (canvasEl && !this.gauges[addr.address_id]) {
            const min = addr.numberConfig?.min_value ?? 0;
            const max = addr.numberConfig?.max_value ?? 100;
            const unitLabel = addr.numberConfig?.unit || ''; 

            // ตรวจสอบว่ามี Alarm หรือไม่
            const highlights = this.getGaugeHighlights(addr);

            try {
              this.gauges[addr.address_id] = new RadialGauge({
                renderTo: canvasEl,
                width: 200,
                height: 200,
                minValue: min,
                maxValue: max,
                value: parseFloat(this.getDisplayValue(addr)),
                units: unitLabel,
                majorTicks: this.generateTicks(min, max),
                colorNumbers: "#444",
                fontNumbersSize: 22,
                fontNumbersWeight: "bold",
                colorPlate: "transparent", 
                borderShadowWidth: 0,
                borders: false,
                // ⭐ ถ้ามี Alarm ให้โชว์ Highlights ถ้าไม่มีให้เป็นค่าว่าง
                highlights: highlights, 
                highlightsWidth: 10,
                needleType: "arrow",
                needleWidth: 4,
                needleCircleSize: 7,
                needleCircleOuter: true,
                needleCircleInner: false,
                // สีเข็มเริ่มต้น
                colorNeedle: "#28a745",
                colorNeedleEnd: "#28a745",
                colorNeedleCircleOuter: "#28a745",
                valueBox: false, 
                ticksAngle: 240,
                startAngle: 60,
                animationDuration: 800,
                animationRule: "linear",
                strokeTicks: true,
              }).draw();
            } catch (err) {
              console.error("Gauge Error:", err);
            }
          }
        }
      });
    },

    updateGauges() {
      this.localAddresses.forEach(addr => {
        const gauge = this.gauges[addr.address_id];
        if (gauge) {
          const displayVal = parseFloat(this.getDisplayValue(addr));
          const colorClass = this.getValueColor(addr);
          
          let colorHex = '#28a745'; // Green
          if (colorClass === 'text-warning') colorHex = '#ffc107'; // Yellow
          if (colorClass === 'text-danger') colorHex = '#dc3545';  // Red

          gauge.value = displayVal;
          // ⭐ อัปเดตสีเข็มให้เปลี่ยนตามสถานะ
          gauge.update({
            colorNeedle: colorHex,
            colorNeedleEnd: colorHex,
            colorNeedleCircleOuter: colorHex
          });
        }
      });
    },

    getDisplayValue(addr) {
      const cfg = addr.numberConfig || {};
      const raw = addr.last_value ?? 0;
      const scaled = (raw * (cfg.scale ?? 1)) + (cfg.offset ?? 0);
      return Number(scaled).toFixed(cfg.decimal_places ?? 0);
    },

    generateTicks(min, max) {
      const ticks = [];
      const step = (max - min) / 5;
      for (let i = 0; i <= 5; i++) ticks.push((min + (step * i)).toFixed(0));
      return ticks;
    },

    openChart(addr) { this.selectedAddress = addr; this.showChart = true; },
    closeChart() { this.showChart = false; this.selectedAddress = null; },
    formatTimeOnly(iso) {
      if (!iso) return '-';
      return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }
};
</script>

<style scoped>
.custom-card {
  border-radius: 12px;
  background-color: #ffffff;
  border: 1.5px solid #d1d1d1 !important;
}

.onoff-circle {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 4px solid #ffffff; 
  transition: all 0.4s ease;
}

.onoff-circle.on {
  background-color: #28a745;
  box-shadow: 0 0 30px rgba(40, 167, 69, 0.4);
}

.onoff-circle.off {
  background-color: #c84d4d;
  box-shadow: 0 0 30px rgba(200, 77, 77, 0.4);
}

.onoff-text {
  font-size: 2.5rem;
  font-weight: 800;
  margin-top: 15px;
}

.gauge-container {
  width: 200px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.display-value {
  font-size: 4.5rem;
  letter-spacing: -2px;
  transition: color 0.3s ease;
}

.status-dot {
    position: absolute;
    top: 15px;
    right: 15px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.status-dot.online { background-color: #28a745; }
.status-dot.offline { background-color: #dc3545; }

.text-success { color: #28a745 !important; }
.text-warning { color: #ffc107 !important; }
.text-danger  { color: #dc3545 !important; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.info-panel { border: 1px solid #eee; }

.delete-btn {
  top: 10px;
  left: 10px;
  z-index: 5;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>