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
              ค่า Number Gauge ตามช่วงเวลา
            </h6>
            <div style="height: 280px;">
              <canvas ref="lineCanvas"></canvas>
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
  name: "NumberGaugeChart",

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

      const totalSec = this.stats.on * (this.device.refresh_rate_ms / 1000)
      this.totalRuntime =
        `${Math.floor(totalSec / 3600)}h ` +
        `${Math.floor((totalSec % 3600) / 60)}m ` +
        `${Math.floor(totalSec % 60)}s`
    },

    renderAllCharts(data) {
      Object.values(this.charts).forEach(c => c?.destroy())

      if (!this.$refs.lineCanvas || !this.$refs.pieCanvas) return

      this.charts.line = this.createLine(
        this.$refs.lineCanvas,
        data.map(d => ({ x: new Date(d.y), y: d.x })),
        '#3b82f6',
        null
      )

      this.charts.pie = this.createPie(
        this.$refs.pieCanvas,
        [this.stats.on, this.stats.off],
        ['ON', 'OFF'],
        ['#3b82f6', '#f43f5e']
      )

      this.charts.lineConn = this.createLine(
        this.$refs.lineCanvas_Conn,
        data.map(d => ({ x: new Date(d.y), y: d.connected ? 1 : 0 })),
        '#10b981',
        ['Disconnect', 'Connect']
      )

      this.charts.pieConn = this.createPie(
        this.$refs.pieCanvas_Conn,
        [this.stats.connected, this.stats.disconnected],
        ['Connect', 'Disconnect'],
        ['#10b981', '#6c757d']
      )
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
