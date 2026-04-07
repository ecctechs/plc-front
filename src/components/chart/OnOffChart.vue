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

      <div class="col-lg-8">
        <div class="card h-100 shadow-sm border-0">
          <div class="card-body">
            <h6 class="card-title text-center fw-bold mb-3">
              สถานะการทำงาน (ON/OFF)
            </h6>
            <div style="height: 280px;">
              <canvas ref="lineCanvas"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
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
import annotationPlugin from 'chartjs-plugin-annotation'
import { showConfirm } from '../../utils/swalHelper'

Chart.register(annotationPlugin)

const baseUrl = import.meta.env.VITE_API_BASE_URL

export default {
  name: "OnOffChart",

  props: {
    device: { type: Object, required: true }, // ต้องมี address_id, refresh_rate_ms
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    alarmTime: { type: String, default: null },
    filterApplied: { type: Number, default: 0 }
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
      refreshTimer: null,
      isFetching: false,
      isInitialLoad: true
    }
  },

  watch: {
    startDate: "restartAutoRefresh",
    endDate: "restartAutoRefresh",
    "device.address_id": "restartAutoRefresh",
    filterApplied() {
      // เมื่อผู้ใช้กดปุ่ม apply ให้รีเซ็ต flag เพื่อให้แสดง dialog เตือนได้
      this.isInitialLoad = false
    }
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
    calculateEstimatedDataCount() {
      if (!this.startDate || !this.endDate) return 0
      
      const start = new Date(this.startDate).getTime()
      const end = new Date(this.endDate).getTime()
      const refreshRate = this.device.refresh_rate_ms || 5000
      
      const timeRangeMs = end - start
      const estimatedCount = Math.ceil(timeRangeMs / refreshRate)
      
      return estimatedCount
    },

    formatDateTime(date) {
      const d = new Date(date)
      return d.toLocaleString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },

    formatHourMinute(date) {
      const d = new Date(date)
      return d.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    startAutoRefresh() {
      this.stopAutoRefresh()
      // ถ้าเปิดจากหน้า Alarm ไม่ควร Auto Refresh เพราะจะทำให้ช่วงเวลาที่ดูอยู่คลาดเคลื่อน
      if (this.alarmTime) return 

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
      // ตรวจสอบจำนวนข้อมูลที่จะดึงก่อน (ยกเว้นการโหลดครั้งแรก)
      const dataCount = this.calculateEstimatedDataCount()
      if (dataCount > 500 && !isSilent && !this.isInitialLoad) {
        const confirmed = await showConfirm(
          'ยืนยันดึงข้อมูลจำนวนมาก',
          `ช่วงเวลาที่เลือกจะดึงข้อมูลประมาณ <b>${dataCount.toLocaleString()}</b> ค่า<br>อาจทำให้ระบบช้าลง ต้องการดำเนินการต่อหรือไม่?`,
          'ดึงข้อมูล'
        )
        if (!confirmed) {
          // ยกเลิก - ไม่ดึงข้อมูล แต่ยังคงอนุญาตให้ auto-refresh ทำงานได้
          return
        }
      }

      // หลังจากครั้งแรก ให้ข้ามไปเช็คการแจ้งเตือนในครั้งต่อไป
      this.isInitialLoad = false

      if (!isSilent) this.loading = true
      try {
        let url = ''
        if (this.alarmTime) {
          url = `${baseUrl}/api/devices/chart-by-alarm` +
                `?address_id=${this.device.address_id}` +
                `&alarm_time=${encodeURIComponent(this.alarmTime)}` +
                `&expand=20`
        } else {
          url = `${baseUrl}/api/devices/chart` +
                `?address_id=${this.device.address_id}` +
                `&start=${this.startDate}` +
                `&end=${this.endDate}`
        }

        const res = await fetch(url)
        const raw = await res.json()

        this.isEmpty = !raw || raw.length === 0
        if (this.isEmpty) return

        // ปั้น Data ให้พร้อมสำหรับ Chart และเก็บสถานะ is_alarm
        const processedData = raw.map(r => ({
          x: r.value,
          y: r.created_at,
          is_alarm: r.is_alarm || false,
          connected: r.status === null ? null : r.status === 1
        }))

        this.processStats(processedData)
        this.renderAllCharts(processedData)

      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        this.loading = false
      }
    },

    processStats(data) {
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
      // ทำลายกราฟเก่าก่อนวาดใหม่
      Object.values(this.charts).forEach(c => c?.destroy())

      // 1. Line Chart: สถานะ ON/OFF
      this.charts.line = this.createLine(
        this.$refs.lineCanvas,
        data.map(d => ({ x: d.y, y: d.x, is_alarm: d.is_alarm })),
        '#3b82f6',
        ['OFF', 'ON']
      )

      // 2. Pie Chart: สัดส่วน ON/OFF
      this.charts.pie = this.createPie(
        this.$refs.pieCanvas,
        [this.stats.on, this.stats.off],
        ['ON', 'OFF'],
        ['#3b82f6', '#f43f5e']
      )

      // 3. Line Chart: Connection Status
      this.charts.lineConn = this.createLine(
        this.$refs.lineCanvas_Conn,
        data.map(d => ({
          x: d.y,
          y: d.connected === null ? null : (d.connected ? 1 : 0),
          is_alarm: d.is_alarm
        })),
        '#10b981',
        ['Disconnect', 'Connect']
      )

      // 4. Pie Chart: สัดส่วน Connection
      this.charts.pieConn = this.createPie(
        this.$refs.pieCanvas_Conn,
        [this.stats.connected, this.stats.disconnected],
        ['Connect', 'Disconnect'],
        ['#10b981', '#6c757d']
      )
    },

    createLine(el, data, color, labels) {
      // ค้นหาตำแหน่ง Alarm จาก data เพื่อวาดเส้นประ
      const alarmPoint = data.find(d => d.is_alarm === true)
      const alarmDate = alarmPoint ? new Date(alarmPoint.x) : null

      return new Chart(el.getContext('2d'), {
        type: 'line',
        data: {
          datasets: [{
            data: data.map(d => ({
              x: new Date(d.x),
              y: d.y,
              isAlarm: d.is_alarm
            })),
            borderColor: color,
            backgroundColor: color + '10',
            fill: true,
            stepped: true,
            pointRadius: (ctx) => (ctx.raw && ctx.raw.isAlarm ? 5 : 0),
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            spanGaps: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { mode: 'nearest', intersect: false },
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
              ticks: { maxTicksLimit: 4 }
            },
            y: {
              min: -0.1,
              max: 1.1,
              ticks: {
                stepSize: 1,
                callback: (v) => labels[v] || ''
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (context) => 'เวลา: ' + this.formatDateTime(context[0].parsed.x),
                label: (context) => {
                  const status = labels[context.parsed.y] || '-'
                  const isAlarm = context.raw.isAlarm
                  return `สถานะ: ${status}${isAlarm ? ' 🚨 (Alarm)' : ''}`
                }
              }
            },
            annotation: alarmDate ? {
              annotations: {
                alarmLine: {
                  type: 'line',
                  xMin: alarmDate,
                  xMax: alarmDate,
                  borderColor: '#ef4444',
                  borderWidth: 2,
                  borderDash: [6, 6],
                  label: {
                    display: true,
                    content: `🚨 ALARM ${this.formatHourMinute(alarmDate)}`,
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    position: 'start'
                  }
                }
              }
            } : {}
          }
        }
      })
    },

    createPie(el, data, labels, colors) {
      const hasData = data.some(v => v > 0)
      return new Chart(el.getContext('2d'), {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data: hasData ? data : [0, 0.000001], // กัน Pie เน่ากรณีไม่มีข้อมูล
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
