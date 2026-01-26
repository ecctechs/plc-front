<template>
  <div class="on-off-chart-wrapper">

    <!-- ===== Loading ===== -->
    <div v-show="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2 text-muted">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- ===== Empty State ===== -->
    <div
      v-show="!loading && isEmpty"
      class="text-center py-5 text-muted"
    >
      <div style="font-size: 48px;">📊</div>
      <h6 class="mt-3 fw-bold">
        ไม่มีข้อมูลในช่วงเวลาที่เลือก
      </h6>
      <p class="mb-0">
        ลองเปลี่ยนวันที่ หรือเลือกอุปกรณ์อื่น
      </p>
    </div>

    <!-- ===== Charts ===== -->
    <div v-show="!loading && !isEmpty" class="row g-3">

      <div class="col-lg-12">
        <div class="card h-100 shadow-sm border-0">
          <div class="card-body">
            <h6 class="card-title text-center fw-bold mb-3">
              ค่า Number ตามช่วงเวลา
            </h6>

            <div class="d-flex justify-content-center gap-3 mb-2">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" v-model="showMax" id="checkMax" @change="renderAllCharts(lastData)">
                <label class="form-check-label small text-danger fw-bold" for="checkMax">แสดง Max </label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" v-model="showMin" id="checkMin" @change="renderAllCharts(lastData)">
                <label class="form-check-label small text-success fw-bold" for="checkMin">แสดง Min </label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" v-model="showAvg" id="checkAvg" @change="renderAllCharts(lastData)">
                <label class="form-check-label small text-warning fw-bold" for="checkAvg" style="color: #ff9800 !important;">แสดง Average</label>
              </div>
            </div>

            <div style="height: 280px;">
              <canvas ref="lineCanvas"></canvas>
            </div>

            <div class="d-flex flex-column align-items-center">
              <div class="d-flex gap-2 align-items-center justify-content-center">
                <span class="small fw-bold text-muted">Scale Y:</span>
                <input type="number" 
                      class="form-control form-control-sm" 
                      :class="{'is-invalid': isScaleInvalid}" 
                      style="width: 100px;" 
                      v-model.number="limitLower" 
                      @input="handleScaleChange" 
                      placeholder="Lower">
                <span class="text-muted">to</span>
                <input type="number" 
                      class="form-control form-control-sm" 
                      :class="{'is-invalid': isScaleInvalid}" 
                      style="width: 100px;" 
                      v-model.number="limitUpper" 
                      @input="handleScaleChange" 
                      placeholder="Upper">
              </div>
              <small v-if="isScaleInvalid" class="text-danger mt-1" style="font-size: 11px;">
                * ค่า Upper ต้องมากกว่า Lower
              </small>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4" style="display:none">
        <div class="card h-100 shadow-sm border-0">
          <div class="card-body text-center d-flex flex-column justify-content-between">
            <h6 class="card-title fw-bold">สัดส่วน ON/OFF</h6>
            <div style="height: 180px;">
              <canvas ref="pieCanvas"></canvas>
            </div>
            <div class="mt-2">
              <span class="badge bg-primary d-block mb-1">
                ON: {{ stats.on }} ครั้ง
              </span>
              <span class="badge bg-danger d-block">
                OFF: {{ stats.off }} ครั้ง
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-8">
        <div class="card h-100 shadow-sm border-0">
          <div class="card-body">
            <h6 class="card-title text-center fw-bold mb-3 text-success">
              สถานะการเชื่อมต่อ (Network)
            </h6>
            <div style="height: 280px;">
              <canvas ref="lineCanvas_Conn"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card h-100 shadow-sm border-0">
          <div class="card-body text-center d-flex flex-column justify-content-between">
            <h6 class="card-title fw-bold">สัดส่วน Connection</h6>
            <div style="height: 180px;">
              <canvas ref="pieCanvas_Conn"></canvas>
            </div>
            <div class="mt-2">
              <span class="badge bg-success d-block mb-1">
                Connect: {{ stats.connected }} ครั้ง
              </span>
              <span class="badge bg-secondary d-block">
                Disconnect: {{ stats.disconnected }} ครั้ง
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import Chart from 'chart.js/auto'
import 'chartjs-adapter-date-fns'

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "NumberChart",

  props: {
    device: { type: Object, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true }
  },

  data() {
    return {
      isEmpty: false,
      charts: {},
      loading: false,
      showMax: false, 
      showMin: false, 
      limitUpper: null, 
      limitLower: null, 
      isScaleInvalid: false,
      showAvg: false, 
      avgValue: 0,
      lastData: [],   // เก็บข้อมูลไว้ re-render
      stats: {
        on: 0,
        off: 0,
        connected: 0,
        disconnected: 0
      },
      totalRuntime: "0h 0m 0s",
      refreshTimer: null
    }
  },

  watch: {
    startDate: "restartAutoRefresh",
    endDate: "restartAutoRefresh",
    "device.id": "restartAutoRefresh"
  },

  mounted() {
    this.fetchData()
    this.startAutoRefresh()
  },

  beforeUnmount() {
    this.stopAutoRefresh()
    Object.values(this.charts).forEach(c => c?.destroy())
  },

  methods: {
    startAutoRefresh() {
      this.stopAutoRefresh()
      const rate = this.device.refresh_rate_ms || 5000
      this.refreshTimer = setInterval(() => this.fetchData(true), rate)
    },

    stopAutoRefresh() {
      if (this.refreshTimer) clearInterval(this.refreshTimer)
    },

    restartAutoRefresh() {
      this.fetchData()
      this.startAutoRefresh()
    },

    async fetchData(isSilent = false) {
      if (!isSilent) this.loading = true
      try {
        // แปลงวันที่จากตัวเลือก (Local) ให้เป็น UTC ISO String
        const startUTC = new Date(this.startDate).toISOString();
        const endUTC = new Date(this.endDate).toISOString();

        const res = await fetch(
          `${baseUrl}/api/devices/${this.device.id}/chart/number?start=${startUTC}&end=${endUTC}`
        )
        const data = await res.json()

        this.lastData = data;

        this.isEmpty = !data || data.length === 0

        if (!this.isEmpty) {
          this.processData(data)
          this.renderAllCharts(data)
        }

      } catch (err) {
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    processData(data) {
      this.stats.on = data.filter(d => d.x === 1).length
      this.stats.off = data.filter(d => d.x === 0).length
      this.stats.connected = data.filter(d => d.connected === true).length
      this.stats.disconnected = data.filter(d => d.connected === false).length

      const numericValues = data.map(d => Number(d.x)).filter(val => !isNaN(val));

    if (numericValues.length > 0) {
      const sum = numericValues.reduce((a, b) => a + b, 0);
      this.avgValue = sum / numericValues.length;
      
      // หาค่าสูงสุด-ต่ำสุดจากข้อมูลจริง
      this.actualMax = Math.max(...numericValues);
      this.actualMin = Math.min(...numericValues);
    } else {
      this.avgValue = 0;
      this.actualMax = null;
      this.actualMin = null;
    }

      const totalSec = this.stats.on * (this.device.refresh_rate_ms / 1000)
      this.totalRuntime =
        `${Math.floor(totalSec / 3600)}h ` +
        `${Math.floor((totalSec % 3600) / 60)}m ` +
        `${Math.floor(totalSec % 60)}s`
    },

    handleScaleChange() {
      // ตรวจสอบเงื่อนไข: ถ้ามีการกรอกทั้งสองช่อง และ Upper <= Lower
      if (
        this.limitUpper !== null && this.limitUpper !== '' &&
        this.limitLower !== null && this.limitLower !== '' &&
        this.limitUpper <= this.limitLower
      ) {
        this.isScaleInvalid = true;
        // ไม่ต้องสั่ง render ใหม่ หรือสั่ง render ด้วยสเกล Auto เพื่อป้องกันกราฟพัง
      } else {
        this.isScaleInvalid = false;
        this.renderAllCharts(this.lastData);
      }
    },

    renderAllCharts(data) {
        // ล้างกราฟเก่า
        if (this.charts) {
          Object.values(this.charts).forEach(c => c?.destroy());
        }
        this.charts = {}; // ล้างตัวแปรอ้างอิง

        if (!this.$refs.lineCanvas || !data) return;

        // 1. ดึงค่าจาก Config สำหรับตีเส้น Reference
        const configMax = this.device.numberConfig?.max_value;
        const configMin = this.device.numberConfig?.min_value;

        // 2. Plugin สำหรับตีเส้น Reference (Max/Min จาก Config)
        const referenceLinesPlugin = {
          id: 'referenceLines',
          afterDraw: (chart) => {
            const { ctx, scales: { y, x } } = chart;
            ctx.save();
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1.5;

      // เส้น Max (จากข้อมูลจริง)
      if (this.showMax && this.actualMax !== null) {
        const yPos = y.getPixelForValue(this.actualMax);
        if (yPos >= chart.chartArea.top && yPos <= chart.chartArea.bottom) {
          ctx.strokeStyle = '#dc3545';
          ctx.beginPath(); ctx.moveTo(x.left, yPos); ctx.lineTo(x.right, yPos); ctx.stroke();
          ctx.fillStyle = '#dc3545';
          ctx.fillText(`Max: ${this.actualMax}`, x.left + 5, yPos - 5);
        }
      }

      // เส้น Min (จากข้อมูลจริง)
      if (this.showMin && this.actualMin !== null) {
        const yPos = y.getPixelForValue(this.actualMin);
        if (yPos >= chart.chartArea.top && yPos <= chart.chartArea.bottom) {
          ctx.strokeStyle = '#198754';
          ctx.beginPath(); ctx.moveTo(x.left, yPos); ctx.lineTo(x.right, yPos); ctx.stroke();
          ctx.fillStyle = '#198754';
          ctx.fillText(`Min: ${this.actualMin}`, x.left + 5, yPos + 15);
        }
      }

          if (this.showAvg && this.avgValue != null) {
            const yPos = y.getPixelForValue(this.avgValue);
            if (yPos >= chart.chartArea.top && yPos <= chart.chartArea.bottom) {
              ctx.strokeStyle = '#ff9800'; // สีส้ม
              ctx.beginPath(); ctx.moveTo(x.left, yPos); ctx.lineTo(x.right, yPos); ctx.stroke();
              ctx.fillStyle = '#ff9800'; 
              ctx.fillText(`Avg: ${this.avgValue.toFixed(2)}`, x.right - 70, yPos - 5);
            }
          }
            ctx.restore();
          }
        };

        this.charts.line = new Chart(this.$refs.lineCanvas.getContext('2d'), {
          type: 'line',
          plugins: [referenceLinesPlugin],
          data: {
            datasets: [{
              label: 'Value',
              data: data.map(d => ({ x: new Date(d.y), y: d.x })),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              fill: true,
              pointRadius: 1,
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
             scales: {
            x: {
              type: 'time',
              time: {
                tooltipFormat: 'dd-MM-yyyy HH:mm:ss',
                displayFormats: {
                  millisecond: 'dd-MM-yyyy HH:mm:ss',
                  second: 'dd-MM-yyyy HH:mm:ss',
                  minute: 'dd-MM-yyyy HH:mm:ss',
                  hour: 'dd-MM-yyyy HH:mm:ss'
                }
              },
              ticks: { maxTicksLimit: 4, autoSkip: true }
            },
              y: { 
                // ปรับปรุงการส่งค่า min/max ให้ชัวร์ว่าเป็นตัวเลขหรือ undefined
                min: (this.limitLower !== null && this.limitLower !== '' && !this.isScaleInvalid) 
                      ? Number(this.limitLower) : undefined,
                max: (this.limitUpper !== null && this.limitUpper !== '' && !this.isScaleInvalid) 
                      ? Number(this.limitUpper) : undefined,
                ticks: { beginAtZero: false }
              }
            },
            plugins: {
              legend: { display: false },
              clip: true // สำคัญมาก: ป้องกันเส้นกราฟทะลุออกไปนอกกรอบเวลาล็อคสเกล
            }
          }
        });

      // --- [กราฟที่ 2: สถานะการเชื่อมต่อ (Stepped Line)] ---
      this.charts.lineConn = this.createLine(
        this.$refs.lineCanvas_Conn,
        data.map(d => ({ x: new Date(d.y), y: d.connected ? 1 : 0 })),
        '#10b981',
        ['Disconnect', 'Connect']
      );

      // --- [กราฟที่ 3: สัดส่วน Connection (Pie Chart)] ---
      this.charts.pieConn = this.createPie(
        this.$refs.pieCanvas_Conn,
        [this.stats.connected, this.stats.disconnected],
        ['Connect', 'Disconnect'],
        ['#10b981', '#6c757d']
      );

      // หมายเหตุ: ส่วนของ charts.pie เดิมที่ถูกซ่อนไว้ (display:none) สามารถเรียกใช้ createPie ได้เช่นกัน
    },

    createLine(el, data, color, labels) {
      return new Chart(el.getContext('2d'), {
        type: 'line',
        data: {
          datasets: [{
            data,
            borderColor: color,
            backgroundColor: color + '10',
            fill: true,
            stepped: labels ? true : false,
            pointRadius: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          scales: {
            x: {
              type: 'time',
              time: {
                tooltipFormat: 'dd-MM-yyyy HH:mm:ss',
                displayFormats: {
                  millisecond: 'dd-MM-yyyy HH:mm:ss',
                  second: 'dd-MM-yyyy HH:mm:ss',
                  minute: 'dd-MM-yyyy HH:mm:ss',
                  hour: 'dd-MM-yyyy HH:mm:ss'
                }
              },
              ticks: { maxTicksLimit: 4, autoSkip: true }
            },
            y: {
                // ถ้ามี labels (กรณี ON/OFF หรือ Connect/Disconnect) ให้ใช้ Callback เดิม
                // ถ้าไม่มี labels (กรณีค่า x เป็นตัวเลข) ให้ Chart.js คำนวณ Scale อัตโนมัติ
                beginAtZero: true,
                ticks: labels ? {
                    stepSize: 1,
                    callback: v => labels[v] || ''
                } : {} 
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      })
    },

    createPie(el, data, labels, colors) {
      return new Chart(el.getContext('2d'), {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data: data.some(v => v > 0) ? data : [0, 1],
            backgroundColor: colors
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      })
    }
  }
}
</script>
