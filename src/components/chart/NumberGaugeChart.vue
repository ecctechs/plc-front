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
                <span class="small fw-bold text-muted">Max:</span>
                <input type="number" 
                       class="form-control form-control-sm" 
                       :class="{'is-invalid': isScaleInvalid}" 
                       style="width: 100px;" 
                       v-model.number="limitUpper" 
                       @input="handleScaleChange" 
                       :placeholder="actualMax">
                <span class="small fw-bold text-muted">Min:</span>
                <input type="number" 
                       class="form-control form-control-sm" 
                       :class="{'is-invalid': isScaleInvalid}" 
                       style="width: 100px;" 
                       v-model.number="limitLower" 
                       @input="handleScaleChange" 
                       :placeholder="actualMin">              
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
import annotationPlugin from 'chartjs-plugin-annotation'
import { showConfirm } from '../../utils/swalHelper'
import { toUTC7 } from '../../utils/date-utils'

// ลงทะเบียน Plugin สำหรับวาดเส้น Annotation (เส้นประ Alarm)
Chart.register(annotationPlugin)

const baseUrl = import.meta.env.VITE_API_BASE_URL
const authH = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` })

export default {
  name: 'NumberGaugeChart',
  inject: ['locale'],
  props: {
    device: { type: Object, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    alarmTime: { type: String, default: null },
    eventType: { type: String, default: null },
    filterApplied: { type: Number, default: 0 }
  },

  data() {
    return {
      loading: false,
      isEmpty: false,
      charts: {},
      allData: [],
      lastData: [],
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
      refreshTimer: null,
      isFetching: false,
      isInitialLoad: true,
      lastFetchTime: null
    }
  },

  watch: {
    startDate: 'restartAutoRefresh',
    endDate: 'restartAutoRefresh',
    alarmTime: 'restartAutoRefresh',
    'device.address_id': 'restartAutoRefresh',
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
     resetAccumulatedData() {
       this.allData = []
       this.lastFetchTime = null
     },

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
         day: '2-digit', month: '2-digit', year: 'numeric',
         hour: '2-digit', minute: '2-digit', second: '2-digit'
       })
     },

     formatHourMinute(date) {
       const d = new Date(date)
       return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
     },

    startAutoRefresh() {
      this.stopAutoRefresh()
      // ถ้าเปิดจากหน้า Alarm History ไม่ต้อง Auto Refresh เพื่อให้ภาพนิ่งอยู่ที่จุดเกิดเหตุ
      if (this.alarmTime) return 

      const rate = this.device.refresh_rate_ms || 5000
      this.refreshTimer = setInterval(() => this.fetchData(true), rate)
    },

    stopAutoRefresh() {
      if (this.refreshTimer) clearInterval(this.refreshTimer)
    },

     restartAutoRefresh() {
       this.resetAccumulatedData()
       this.fetchData()
       this.startAutoRefresh()
     },

    async fetchData(isSilent = false) {
      const isInitialLoad = this.isInitialLoad
      this.isInitialLoad = false

      const dataCount = this.calculateEstimatedDataCount()
      if (dataCount > 500 && !isSilent && !isInitialLoad) {
        const confirmed = await showConfirm(
          this.locale.current === 'th' ? 'ยืนยันดึงข้อมูลจำนวนมาก' : 'Large Data Warning',
          this.locale.current === 'th'
            ? `ช่วงเวลาที่เลือกจะดึงข้อมูลประมาณ <b>${dataCount.toLocaleString()}</b> ค่า<br>อาจทำให้ระบบช้าลง ต้องการดำเนินการต่อหรือไม่?`
            : `The selected range will fetch approximately <b>${dataCount.toLocaleString()}</b> records.<br>This may slow down the system. Continue?`,
          this.locale.current === 'th' ? 'ดึงข้อมูล' : 'Fetch',
          this.locale.current === 'th' ? 'ยกเลิก' : 'Cancel'
        )
        if (!confirmed) return
      }

      if (!isSilent) this.loading = true

      try {
        let url = this.alarmTime
          ? `${baseUrl}/api/devices/chart-by-alarm?address_id=${this.device.address_id}&alarm_time=${encodeURIComponent(this.alarmTime)}&expand=20`
          : `${baseUrl}/api/devices/chart?address_id=${this.device.address_id}&start=${this.startDate}&end=${this.endDate}`

        const res = await fetch(url, { headers: authH() })
        const raw = await res.json()

        if (!raw || raw.length === 0) {
          this.isEmpty = true
          return
        }

        console.log("urs ->",url)

        const data = raw.map(d => ({
          x: d.value !== null ? Number(d.value) : null,
          y: new Date(d.created_at),
          is_alarm: d.is_alarm || false,
          connected: d.status === null ? null : d.status === 1
        }))

        this.isEmpty = false

        const latestFetchTime = data.length > 0
          ? Math.max(...data.map(p => new Date(p.y).getTime()))
          : this.lastFetchTime

        if (isInitialLoad) {
          this.allData = [...data]
        } else {
          const newPoints = data.filter(p => new Date(p.y).getTime() > this.lastFetchTime)
          if (newPoints.length > 0) {
            this.allData = [...this.allData, ...newPoints]
          }
        }
        this.lastFetchTime = latestFetchTime

         this.lastData = this.allData
         this.processStats(this.allData)

         // Always display last 500 points (sliding window)
         let displayData = this.allData
         if (this.allData.length > 500) {
           displayData = this.allData.slice(-500)
         }

         this.renderCharts(displayData)

        if (this.alarmTime) this.stopAutoRefresh()

      } catch (err) {
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    processStats(data) {
      this.stats.connected = data.filter(d => d.connected === true).length
      this.stats.disconnected = data.filter(d => d.connected === false).length

      const numericValues = data.map(d => d.x).filter(v => v !== null && !isNaN(v))
      if (numericValues.length > 0) {
        this.actualMax = Math.max(...numericValues)
        this.actualMin = Math.min(...numericValues)
        this.avgValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      }
    },

    handleScaleChange() {
      if (this.limitUpper !== null && this.limitLower !== null && Number(this.limitUpper) <= Number(this.limitLower)) {
        this.isScaleInvalid = true
      } else {
        this.isScaleInvalid = false
        this.renderCharts(this.lastData)
      }
    },

    // ฟังก์ชันสร้าง Object สำหรับเส้นประสีแดงตรงจุด Alarm
    getAlarmAnnotation(alarmDate) {
      const isRecovery = this.eventType === 'RECOVER';
      const label = isRecovery 
        ? `✅ RECOVERY ${this.formatHourMinute(alarmDate)}`
        : `🚨 ALARM ${this.formatHourMinute(alarmDate)}`;
      const bgColor = isRecovery ? '#22c55e' : '#ef4444';
      
      return {
        annotations: {
          alarmLine: {
            type: 'line',
            xMin: alarmDate,
            xMax: alarmDate,
            borderColor: isRecovery ? '#22c55e' : '#ef4444',
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
              display: true,
              content: label,
              backgroundColor: bgColor,
              color: '#fff',
              position: 'start',
              yAdjust: -10
            }
          }
        }
      }
    },

    renderCharts(data) {
      Object.values(this.charts).forEach(c => c?.destroy())
      this.charts = {}

      // หาเวลาที่เกิด Alarm จากข้อมูล หรือจาก Prop
      const alarmPoint = data.find(d => d.is_alarm === true)
      const alarmDate = alarmPoint ? new Date(alarmPoint.y) : (this.alarmTime ? new Date(this.alarmTime) : null)

      // 1. Number Value Line Chart
      const referenceLinesPlugin = this.createReferencePlugin()
      this.charts.valueLine = new Chart(this.$refs.lineCanvas.getContext('2d'), {
        type: 'line',
        plugins: [referenceLinesPlugin],
        data: {
          datasets: [{
            label: 'Value',
            data: data.map(d => ({ x: toUTC7(d.y), y: d.x, isAlarm: d.is_alarm })),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            fill: true,
            pointRadius: ctx => (ctx.raw?.isAlarm ? 5 : 1),
            pointBackgroundColor: ctx => (ctx.raw?.isAlarm ? '#ef4444' : '#3b82f6'),
            tension: 0.1,
            spanGaps: true
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          interaction: { mode: 'nearest', intersect: false, axis: 'x' },
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
              ticks: { maxTicksLimit: 6 }
            },
            y: { 
              min: (this.limitLower !== null && !this.isScaleInvalid) ? Number(this.limitLower) : undefined,
              max: (this.limitUpper !== null && !this.isScaleInvalid) ? Number(this.limitUpper) : undefined
            }
          },
          plugins: { 
            legend: { display: false },
            annotation: alarmDate ? this.getAlarmAnnotation(alarmDate) : {}
          }
        }
      })

      // 2. Network Chart (แก้ไขปัญหา Disconnect ซ้อนกัน)
      this.charts.connLine = new Chart(this.$refs.lineCanvas_Conn.getContext('2d'), {
        type: 'line',
        data: {
          datasets: [{
            data: data.map(d => ({ x: toUTC7(d.y), y: d.connected === null ? null : (d.connected ? 1 : 0), isAlarm: d.is_alarm })),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            fill: true, stepped: true,
            pointRadius: ctx => (ctx.raw?.isAlarm ? 5 : 0),
            pointBackgroundColor: '#ef4444'
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          interaction: { mode: 'nearest', intersect: false, axis: 'x' },
          scales: {
            x: { type: 'time', time: { tooltipFormat: 'dd/MM/yyyy HH:mm:ss' }, ticks: { maxTicksLimit: 4 } },
            y: { 
              min: -0.3, max: 1.3, // เพิ่มระยะขอบไม่ให้ชื่อ Label เบียดขอบกราฟ
              ticks: { 
                stepSize: 1, 
                callback: v => (v === 1 ? 'Connect' : v === 0 ? 'Disconnect' : '') 
              } 
            }
          },
          plugins: { 
            legend: { display: false },
            annotation: alarmDate ? this.getAlarmAnnotation(alarmDate) : {}
          }
        }
      })

      // 3. Network Pie Chart
      this.charts.pieConn = new Chart(this.$refs.pieCanvas_Conn.getContext('2d'), {
        type: 'pie',
        data: {
          labels: ['Connect', 'Disconnect'],
          datasets: [{ data: [this.stats.connected, this.stats.disconnected], backgroundColor: ['#10b981', '#6c757d'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      })
    },

    createReferencePlugin() {
      return {
        id: 'referenceLines',
        afterDraw: (chart) => {
          const { ctx, scales: { y, x }, chartArea } = chart
          ctx.save(); ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.font = '12px Arial'
          const drawLabelLine = (val, label, color, isBottom = false) => {
            const yPos = y.getPixelForValue(val)
            if (yPos >= chartArea.top && yPos <= chartArea.bottom) {
              ctx.strokeStyle = color; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x.left, yPos); ctx.lineTo(x.right, yPos); ctx.stroke()
              ctx.fillText(`${label}: ${val.toFixed(2)}`, x.left + 5, isBottom ? yPos + 15 : yPos - 5)
            }
          }
          if (this.showMax && this.actualMax !== null) drawLabelLine(this.actualMax, 'Max', '#dc3545')
          if (this.showMin && this.actualMin !== null) drawLabelLine(this.actualMin, 'Min', '#198754', true)
          if (this.showAvg && this.avgValue !== null) drawLabelLine(this.avgValue, 'Avg', '#ff9800')
          ctx.restore()
        }
      }
    }
  }
}
</script>