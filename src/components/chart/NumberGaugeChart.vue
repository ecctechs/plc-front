<template>
  <div class="on-off-chart-wrapper">

    <div v-show="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2 text-muted">กำลังโหลดข้อมูล...</p>
    </div>

    <div v-show="!loading && isEmpty" class="text-center py-5 text-muted">
      <div style="font-size: 48px;">📊</div>
      <h6 class="mt-3 fw-bold">ไม่มีข้อมูลในช่วงเวลาที่เลือก</h6>
      <p class="mb-0">ลองเปลี่ยนวันที่ หรือเลือกอุปกรณ์อื่น</p>
    </div>

    <div v-show="!loading && !isEmpty" class="row g-3">

      <div class="col-lg-12">
        <div class="card h-100 shadow-sm border-0">
          <div class="card-body">
            <h6 class="card-title text-center fw-bold mb-3">
              ค่า Number ตามช่วงเวลา
            </h6>

            <div class="d-flex justify-content-center gap-3 mb-2">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" v-model="showMax" id="checkMax" @change="renderCharts(lastData)">
                <label class="form-check-label small text-danger fw-bold" for="checkMax">แสดง Max</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" v-model="showMin" id="checkMin" @change="renderCharts(lastData)">
                <label class="form-check-label small text-success fw-bold" for="checkMin">แสดง Min</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="checkbox" v-model="showAvg" id="checkAvg" @change="renderCharts(lastData)">
                <label class="form-check-label small text-warning fw-bold" for="checkAvg" style="color: #ff9800 !important;">แสดง Average</label>
              </div>
            </div>

            <div style="height: 280px;">
              <canvas ref="lineCanvas"></canvas>
            </div>

            <div class="d-flex flex-column align-items-center mt-3">
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

const baseUrl = import.meta.env.VITE_API_BASE_URL

export default {
  name: 'NumberGaugeChart',

  props: {
    device: { type: Object, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true }
  },

  data() {
    return {
      loading: false,
      isEmpty: false,
      charts: {},
      lastData: [],
      // ✅ เพิ่ม Data States จากโค้ดเก่า
      showMax: false,
      showMin: false,
      showAvg: false,
      limitUpper: null,
      limitLower: null,
      isScaleInvalid: false,
      actualMax: null,
      actualMin: null,
      avgValue: 0,
      stats: {
        connected: 0,
        disconnected: 0
      },
      refreshTimer: null
    }
  },

  watch: {
    startDate: 'restartAutoRefresh',
    endDate: 'restartAutoRefresh',
    'device.address_id': 'restartAutoRefresh'
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
        const res = await fetch(
          `${baseUrl}/api/devices/chart` +
          `?address_id=${this.device.address_id}` +
          `&start=${this.startDate}` +
          `&end=${this.endDate}`
        )

        const raw = await res.json()

        if (!raw || raw.length === 0) {
          this.isEmpty = true
          return
        }

        const data = raw.map(d => ({
          x: Number(d.value),
          y: new Date(d.created_at),
          connected: d.status === 1
        }))

        this.lastData = data
        this.isEmpty = false

        this.processStats(data)
        this.renderCharts(data)

      } catch (err) {
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    processStats(data) {
      this.stats.connected = data.filter(d => d.connected).length
      this.stats.disconnected = data.filter(d => !d.connected).length

      // ✅ คำนวณค่า Max, Min, Avg จากชุดข้อมูล
      const numericValues = data.map(d => d.x).filter(v => !isNaN(v))
      if (numericValues.length > 0) {
        this.actualMax = Math.max(...numericValues)
        this.actualMin = Math.min(...numericValues)
        this.avgValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      }
    },

    handleScaleChange() {
      if (
        this.limitUpper !== null && this.limitUpper !== '' &&
        this.limitLower !== null && this.limitLower !== '' &&
        Number(this.limitUpper) <= Number(this.limitLower)
      ) {
        this.isScaleInvalid = true
      } else {
        this.isScaleInvalid = false
        this.renderCharts(this.lastData)
      }
    },

    renderCharts(data) {
      Object.values(this.charts).forEach(c => c?.destroy())
      this.charts = {}

      if (!data || data.length === 0) return

      // ✅ Plugin สำหรับวาดเส้น Reference (Max/Min/Avg)
      const referenceLinesPlugin = {
        id: 'referenceLines',
        afterDraw: (chart) => {
          const { ctx, scales: { y, x } } = chart
          ctx.save()
          ctx.setLineDash([5, 5])
          ctx.lineWidth = 1.5

          // เส้น Max
          if (this.showMax && this.actualMax !== null) {
            const yPos = y.getPixelForValue(this.actualMax)
            if (yPos >= chart.chartArea.top && yPos <= chart.chartArea.bottom) {
              ctx.strokeStyle = '#dc3545'; ctx.beginPath(); ctx.moveTo(x.left, yPos); ctx.lineTo(x.right, yPos); ctx.stroke()
              ctx.fillStyle = '#dc3545'; ctx.fillText(`Max: ${this.actualMax.toFixed(2)}`, x.left + 5, yPos - 5)
            }
          }
          // เส้น Min
          if (this.showMin && this.actualMin !== null) {
            const yPos = y.getPixelForValue(this.actualMin)
            if (yPos >= chart.chartArea.top && yPos <= chart.chartArea.bottom) {
              ctx.strokeStyle = '#198754'; ctx.beginPath(); ctx.moveTo(x.left, yPos); ctx.lineTo(x.right, yPos); ctx.stroke()
              ctx.fillStyle = '#198754'; ctx.fillText(`Min: ${this.actualMin.toFixed(2)}`, x.left + 5, yPos + 15)
            }
          }
          // เส้น Avg
          if (this.showAvg && this.avgValue !== null) {
            const yPos = y.getPixelForValue(this.avgValue)
            if (yPos >= chart.chartArea.top && yPos <= chart.chartArea.bottom) {
              ctx.strokeStyle = '#ff9800'; ctx.beginPath(); ctx.moveTo(x.left, yPos); ctx.lineTo(x.right, yPos); ctx.stroke()
              ctx.fillStyle = '#ff9800'; ctx.fillText(`Avg: ${this.avgValue.toFixed(2)}`, x.right - 70, yPos - 5)
            }
          }
          ctx.restore()
        }
      }

      // ===== Number Line =====
      this.charts.valueLine = new Chart(this.$refs.lineCanvas.getContext('2d'), {
        type: 'line',
        plugins: [referenceLinesPlugin],
        data: {
          datasets: [{
            label: 'Value',
            data: data.map(d => ({ x: d.y, y: d.x })),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
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
              beginAtZero: false,
              // ✅ นำค่าจาก Input มาใช้กำหนด Scale
              min: (this.limitLower !== null && this.limitLower !== '' && !this.isScaleInvalid) ? Number(this.limitLower) : undefined,
              max: (this.limitUpper !== null && this.limitUpper !== '' && !this.isScaleInvalid) ? Number(this.limitUpper) : undefined
            }
          },
          plugins: {
            legend: { display: false },
            clip: true // ✅ ป้องกันกราฟทะลุเส้นขอบเวลาล็อคสเกล
          }
        }
      })

      // ===== Network Line =====
      this.charts.connLine = new Chart(this.$refs.lineCanvas_Conn.getContext('2d'), {
        type: 'line',
        data: {
          datasets: [{
            data: data.map(d => ({ x: d.y, y: d.connected ? 1 : 0 })),
            stepped: true,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            fill: true,
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
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                callback: v => (v === 1 ? 'Connect' : 'Disconnect')
              }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      })

      // ===== Network Pie =====
      this.charts.pieConn = new Chart(this.$refs.pieCanvas_Conn.getContext('2d'), {
        type: 'pie',
        data: {
          labels: ['Connect', 'Disconnect'],
          datasets: [{
            data: [this.stats.connected, this.stats.disconnected],
            backgroundColor: ['#10b981', '#6c757d']
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