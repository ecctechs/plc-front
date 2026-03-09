<template>
  <div class="container-fluid mt-4">
    
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-5 g-4">
      <div v-for="addr in addresses" :key="addr.address_id" class="col">

        <div class="card shadow-sm p-4 text-center position-relative custom-card h-100 d-flex flex-column">
          
          <!-- Delete icon (Edit mode only) -->
          <button
            v-if="editMode"
            class="btn btn-sm btn-danger position-absolute delete-btn"
            @click="handleDeleteCard(addr)"
          >
            <i class="fas fa-trash"></i>
          </button>

          <div class="status-dot-wrapper">
            <span class="status-dot" :class="addr.is_connected ? 'online' : 'offline'" role="button"></span>
            <div class="status-tooltip">{{ addr.is_connected ? 'Connected' : 'Disconnected' }}</div>
          </div>

          <div class="mb-2">
            <h4 class="fw-bold text-dark mb-0 text-uppercase">{{ addr.device.name }}</h4>
            <div class="text-muted small mb-3 text-uppercase">{{ addr.label.toUpperCase() }}</div>
          </div>

          <div class="flex-grow-1 d-flex flex-column justify-content-center my-4">
            
            <div v-if="addr.display_type === 'onoff'" class="w-100">
              <div class="onoff-circle mx-auto mb-2" :class="addr.last_value !== 0 ? 'on' : 'off'"></div>
              <h2 class="onoff-text fw-bold mb-0" :class="addr.last_value !== 0 ? 'text-success' : 'text-danger'">
                {{ addr.last_value !== 0 ? "ON" : "OFF" }}
              </h2>
            </div>

            <div v-else-if="addr.display_type === 'number' || addr.display_type === 'level'" class="w-100 py-3">
              <div class="display-value fw-bold" :class="getValueColor(addr)">
                {{ getDisplayValue(addr) }}
              </div>
              <div v-if="addr.numberConfig?.unit" class="text-muted fw-bold">{{ addr.numberConfig.unit }}</div>
            </div>

            <div v-else-if="addr.display_type === 'number_gauge'" class="w-100">
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
                    :class="expandedCards[addr.card_id] ? 'btn-secondary' : 'btn-outline-secondary'"
                    @click="expandedCards[addr.card_id] = !expandedCards[addr.card_id]"
                  >
                    {{ expandedCards[addr.card_id] ? 'Hide Info' : 'More Info' }}
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
              <div v-if="expandedCards[addr.card_id]" class="info-panel mt-3 p-3 bg-light rounded text-start small">
                <div class="d-flex justify-content-between mb-1">
                  <span><strong>Address:</strong> {{ addr.plc_address }}</span>
                  <span class="text-muted">Refresh: {{ addr.refresh_rate_ms }} ms</span>
                </div>

                <div v-if="addr.numberConfig && addr.display_type === 'number_gauge'">
                  <div v-if="addr.numberConfig.min_value !== undefined" class="mb-2">
                    <span class="text-muted">Range:</span> <strong>{{ addr.numberConfig.min_value }} - {{ addr.numberConfig.max_value }}</strong>
                  </div>
                  <div class="mt-2 pt-2 border-top">
                    <strong class="text-uppercase" style="font-size: 0.7rem;">Number Gauge Settings:</strong>
                    <div class="row g-2 mt-1">
                      <div class="col-4" v-if="addr.numberConfig.decimal_places !== undefined">
                        <span class="text-muted">Decimal:</span> {{ addr.numberConfig.decimal_places }}
                      </div>
                      <div class="col-4" v-if="addr.numberConfig.scale !== undefined">
                        <span class="text-muted">Scale:</span> {{ addr.numberConfig.scale }}
                      </div>
                      <div class="col-4" v-if="addr.numberConfig.offset !== undefined">
                        <span class="text-muted">Offset:</span> {{ addr.numberConfig.offset }}
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="addr.levelConfigs?.length > 0" class="mt-2 pt-2 border-top">
                  <strong class="text-uppercase" style="font-size: 0.7rem;">Level Settings:</strong>
                  <div class="row g-2 mt-1">
                    <div 
                      v-for="lvl in addr.levelConfigs.sort((a, b) => a.level_index - b.level_index)" 
                      :key="lvl.id" 
                      class="col-6 col-md-4" 
                    >
                      <div class="bg-white border rounded px-2 py-1 h-100 d-flex align-items-center">
                        <span class="fw-bold text-dark" style="font-size: 0.7rem;">
                          {{ lvl.label }}
                          <span class="text-muted fw-normal ms-1" style="font-size: 0.65rem;">
                            <template v-if="lvl.condition_type === 'LT'">&lt;{{ lvl.min_value }}</template>
                            <template v-else-if="lvl.condition_type === 'MT'">&gt;{{ lvl.min_value }}</template>
                            <template v-else>{{ lvl.min_value }}-{{ lvl.max_value }}</template>
                          </span>
                        </span>
                      </div>
                    </div>
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

  <div v-if="showChart" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);">
    <div class="modal-dialog modal-xl modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg">
        <div class="modal-header bg-light">
          <h5 class="modal-title fw-bold text-dark">
            <i class="bi bi-graph-up text-primary me-2"></i>Chart : {{ selectedAddress?.label }}
          </h5>
          <button class="btn-close" @click="closeChart"></button>
        </div>
        <div class="modal-body p-0">
          <div class="p-4">
            <Chart v-if="selectedAddress" :device="selectedAddress" />
          </div>
        </div>
        <div class="modal-footer bg-light border-0">
          <button type="button" class="btn btn-secondary px-4" @click="closeChart">ปิดหน้าต่าง</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Chart from "./Chart.vue";
import { RadialGauge } from 'canvas-gauges';
import { showConfirm } from '../utils/swalHelper';

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
      localAddresses: [],
      expandedCards: {} // เก็บ state ขยาย: { card_id: boolean }
    };
  },
  watch: {
    addresses: {
      deep: true,
      handler(newVal) {
        this.localAddresses = newVal;
        // Initialize expandedCards for any new addresses
        newVal.forEach(addr => {
          if (!(addr.card_id in this.expandedCards)) {
            this.expandedCards[addr.card_id] = false;
          }
        });
        this.updateGauges();
      }
    }
  },
  mounted() {
    this.localAddresses = this.addresses;
    // Initialize expandedCards for all addresses
    this.addresses.forEach(addr => {
      this.expandedCards[addr.card_id] = false;
    });
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
        
        if (addr.display_type === 'number_gauge') {
          const canvasId = `gauge-${addr.address_id}`;
          const canvasEl = document.getElementById(canvasId);
          
          if (canvasEl && !this.gauges[addr.address_id]) {
            const min = addr.numberConfig?.min_value ?? 0;
            const max = addr.numberConfig?.max_value ?? 100;
            const unitLabel = addr.numberConfig?.unit || ''; 

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
                highlights: highlights, 
                highlightsWidth: 10,
                needleType: "arrow",
                needleWidth: 4,
                needleCircleSize: 7,
                needleCircleOuter: true,
                needleCircleInner: false,
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
          } else {
            console.log("Skipping gauge - canvas not found or already initialized");
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
          gauge.update({
            colorNeedle: colorHex,
            colorNeedleEnd: colorHex,
            colorNeedleCircleOuter: colorHex
          });
        }
      });
    },

    getDisplayValue(addr) {
      const raw = addr.last_value ?? 0;
      return Number(raw).toFixed(addr.numberConfig?.decimal_places ?? 0);
    },

    generateTicks(min, max) {
      const ticks = [];
      const step = (max - min) / 5;
      for (let i = 0; i <= 5; i++) ticks.push((min + (step * i)).toFixed(0));
      return ticks;
    },

    openChart(addr) { this.selectedAddress = addr; this.showChart = true; },
    closeChart() { this.showChart = false; this.selectedAddress = null; },
    async handleDeleteCard(addr) {
      const confirmed = await showConfirm(
        'ลบการ์ด',
        `คุณต้องการลบ \"${addr.label}\" ออกจากแดชบอร์ดหรือไม่?`,
        'ลบ'
      );
      if (confirmed) {
        this.$emit('delete-card', addr);
      }
    },
    formatTimeOnly(iso) {
      if (!iso) return '-';
      return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },
    formatConditionType(type) {
      const map = {
        'LT': '<',
        'LTE': '≤',
        'MT': '>',
        'MTE': '≥',
        'BTW': '↔',
        'EXACT': '='
      };
      return map[type] || type;
    }
  }
};
</script>

<style scoped>
/* Component-specific styles only */
/* Note: Shared styles are imported from src/assets/shared-styles.css */
</style>

