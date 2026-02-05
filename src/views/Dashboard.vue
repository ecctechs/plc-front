<template>
  <div class="container-fluid mt-4 min-vh-100">
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
      <div v-for="addr in addresses" :key="addr.address_id" class="col">
        <div class="card shadow-sm p-4 text-center position-relative custom-card" 
        :class="{ 'card-fixed': !addr.expand }">
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
              <div class="display-value fw-bold text-primary">
                {{ getDisplayValue(addr) }}
              </div>
              <div v-if="addr.numberConfig?.unit" class="text-muted fw-bold">{{ addr.numberConfig.unit }}</div>
            </div>

            <div v-else-if="addr.data_type === 'number_gauge'" class="w-100">
              <div class="gauge-container mx-auto">
                <canvas :id="'gauge-' + addr.address_id"></canvas>
              </div>
              <div class="fw-bold text-dark mt-2">
                {{ getDisplayValue(addr) }} {{ addr.numberConfig?.unit }}
              </div>
            </div>
          </div>

          <div class="mt-auto pt-3 border-top-light">
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
                  Range:
                  <strong>
                    {{ addr.numberConfig.min_value }} - {{ addr.numberConfig.max_value }}
                  </strong>
                </div>
              </div>
                {{addr.last_update}}
              <div class="text-muted mt-2 border-top pt-1">
                Last Update: {{ formatTimeOnly(addr.updated_at) }}
              </div>
            </div>
          </transition>

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
    // รับข้อมูลที่เป็น Array ของ Address ตาม JSON ที่คุณให้มา
    addresses: { type: Array, required: true },
    simulate: { type: Boolean, default: false }
  },
  data() {
    return {
      selectedAddress: null,
      showChart: false,
      gauges: {},
      // เพิ่ม property expand เข้าไปในแต่ละ address สำหรับ UI
      localAddresses: []
    };
  },
  watch: {
    // คอยดูการอัปเดตค่า last_value
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
    openChart(addr) {
      this.selectedAddress = addr;
      this.showChart = true;
    },
    closeChart() {
      this.showChart = false;
      this.selectedAddress = null;
    },
    formatTimeOnly(iso) {
      if (!iso) return '-';
      return new Date(iso).toLocaleTimeString('en-US', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    },
    getDisplayValue(addr) {
      const cfg = addr.numberConfig || {};
      const raw = addr.last_value ?? 0;
      const scaled = (raw * (cfg.scale ?? 1)) + (cfg.offset ?? 0);
      return Number(scaled).toFixed(cfg.decimal_places ?? 0);
    },
    initAllGauges() {
      // ตรวจสอบก่อนว่ามีข้อมูลหรือไม่
      if (!this.localAddresses || this.localAddresses.length === 0) return;

      this.localAddresses.forEach(addr => {
        if (addr.data_type === 'number_gauge') {
          const canvasId = `gauge-${addr.address_id}`;
          const canvasEl = document.getElementById(canvasId);
          
          // ตรวจสอบว่ามี Element ในหน้าจอ และยังไม่ได้สร้าง Gauge สำหรับ ID นี้
          if (canvasEl && !this.gauges[addr.address_id]) {
            const min = addr.numberConfig?.min_value ?? 0;
            const max = addr.numberConfig?.max_value ?? 100;
            const unitLabel = addr.numberConfig?.unit || ''; 

            try {
              this.gauges[addr.address_id] = new RadialGauge({
                renderTo: canvasEl, // ใช้ Element โดยตรงจะชัวร์กว่า ID string
                width: 200,
                height: 200,
                minValue: min,
                maxValue: max,
                value: parseFloat(this.getDisplayValue(addr)),
                units: unitLabel,
                
                // การตั้งค่า Ticks
                majorTicks: this.generateTicks(min, max),
                colorNumbers: "#444",
                fontNumbersSize: 22,
                fontNumbersWeight: "bold",
                
                // หน้าปัดใสเพื่อให้เห็นพื้นหลังการ์ด
                colorPlate: "transparent", 
                borderShadowWidth: 0,
                borders: false,
                highlights: [], 
                
                // เข็มสีแดงส้มตาม Screenshot
                needleType: "arrow",
                needleWidth: 4,
                needleCircleSize: 7,
                needleCircleOuter: true,
                needleCircleInner: false,
                colorNeedle: "#e74c3c",
                colorNeedleEnd: "#e74c3c",
                colorNeedleCircleOuter: "#e74c3c",
                
                valueBox: false, 
                ticksAngle: 240,
                startAngle: 60,
                animationDuration: 1500,
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
        if (this.gauges[addr.address_id]) {
          this.gauges[addr.address_id].value = parseFloat(this.getDisplayValue(addr));
        }
      });
    },
    generateTicks(min, max) {
      const ticks = [];
      const step = (max - min) / 5;
      for (let i = 0; i <= 5; i++) ticks.push((min + (step * i)).toFixed(0));
      return ticks;
    }
  }
};
</script>

<style scoped>
/* Card Style: ขอบเข้มขึ้นตามที่ต้องการ */
.custom-card {
  border-radius: 12px;
  background-color: #ffffff;
  border: 1.5px solid #d1d1d1 !important; /* ขอบการ์ดเข้ม */
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

/* ON/OFF Circle: หัวใจสำคัญคือขอบขาว + เงาฟุ้ง */
.onoff-circle {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  /* ขอบสีขาวหนา 4px เพื่อให้เหมือนรูป */
  border: 4px solid #ffffff; 
  transition: all 0.4s ease;
}

/* กรณีสถานะ ON (สีเขียว) */
.onoff-circle.on {
  background-color: #28a745;
  /* เงาสีเขียวฟุ้งกระจายกว้างๆ */
  box-shadow: 0 0 0 2px rgba(255,255,255,1), 0 0 30px rgba(40, 167, 69, 0.6);
}

/* กรณีสถานะ OFF (สีแดงตามรูป) */
.onoff-circle.off {
  background-color: #c84d4d;
  /* เงาสีแดงฟุ้งกระจายกว้างๆ */
  box-shadow: 0 0 0 2px rgba(255,255,255,1), 0 0 35px rgba(200, 77, 77, 0.6);
}

/* ข้อความสถานะด้านล่างวงกลม */
.onoff-text {
  font-size: 2.5rem;
  font-weight: 800;
  margin-top: 15px;
  text-transform: uppercase;
}

/* Gauge Container: จัดให้มีเงาจางๆ รอบวงกลม gauge */
.gauge-container {
  width: 200px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* ทำให้ gauge มีมิติขึ้น */
  filter: drop-shadow(0 5px 15px rgba(0,0,0,0.08));
}

/* Typography อื่นๆ */
.display-value {
  font-size: 4.5rem;
  letter-spacing: -2px;
  color: #4a76f1;
}

.status-dot {
    position: absolute;
    top: 15px;
    right: 15px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    z-index: 10;
}

/* Online = เขียว */
.status-dot.online {
  background-color: #28a745;
  box-shadow: 0 0 6px rgba(40, 167, 69, 0.8);
}

/* Offline = แดง */
.status-dot.offline {
    background-color: #dc3545;
    box-shadow: 0 0 6px #dc3545;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.info-panel {
  border: 1px solid #e3e6ea;
  background: #fafafa;
}

.card-fixed {
  min-height: 420px;   /* ปรับได้ตามดีไซน์ */
  display: flex;
  flex-direction: column;
}

</style>