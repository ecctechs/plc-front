<template>
  <div class="level-chart-wrapper">
    <div v-show="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2 text-muted">กำลังโหลดข้อมูล...</p>
    </div>

    <div v-show="!loading && isEmpty" class="text-center py-5 text-muted">
      <div style="font-size: 48px;">📊</div>
      <h6 class="mt-3 fw-bold">ไม่มีข้อมูลในช่วงเวลาที่เลือก</h6>
    </div>

    <div v-show="!loading && !isEmpty" class="row g-3">
      
      <div class="col-lg-12">
        <div class="card h-100 shadow-sm border-0">
          <div class="card-body">
            <h6 class="card-title text-center fw-bold mb-3">ระดับ (Level) ตามช่วงเวลา</h6>
            <div style="height: 300px;">
              <canvas ref="levelCanvas"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-8">
        <div class="card h-100 shadow-sm border-0">
          <div class="card-body">
            <h6 class="card-title text-center fw-bold mb-3 text-success">สถานะการเชื่อมต่อ (Network)</h6>
            <div style="height: 250px;">
              <canvas ref="connLineCanvas"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card h-100 shadow-sm border-0">
          <div class="card-body text-center d-flex flex-column justify-content-between">
            <h6 class="card-title fw-bold">สัดส่วน Connection</h6>
            <div style="height: 180px;">
              <canvas ref="connPieCanvas"></canvas>
            </div>
            <div class="mt-3">
              <span class="badge bg-success d-block mb-1">Connect: {{ stats.connected }} ครั้ง</span>
              <span class="badge bg-secondary d-block">Disconnect: {{ stats.disconnected }} ครั้ง</span>
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

Chart.register(annotationPlugin)

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "LevelChart",
  props: {
    device: { type: Object, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    alarmTime: { type: String, default: null }
  },

  data() {
    return {
      loading: false,
      isEmpty: false,
      charts: {},
      levels: [], 
      lastData: [],
      stats: { connected: 0, disconnected: 0 },
      refreshTimer: null
    }
  },

  watch: {
    startDate: "restartAutoRefresh",
    endDate: "restartAutoRefresh",
    alarmTime: "restartAutoRefresh",
    "device.address_id": "restartAutoRefresh"
  },

  mounted() {
    this.fetchData();
    this.startAutoRefresh();
  },

  beforeUnmount() {
    this.stopAutoRefresh();
    Object.values(this.charts).forEach(c => c?.destroy());
  },

  methods: {
    formatHourMinute(date) {
      if (!date) return ''
      const d = new Date(date)
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    },

    startAutoRefresh() {
      this.stopAutoRefresh();
      // ถ้าเปิดดู Alarm อยู่ ไม่ต้อง Refresh กราฟเพื่อให้จุด Alarm ไม่เลื่อนหาย
      if (this.alarmTime) return; 

      const rate = this.device.refresh_rate_ms || 5000;
      this.refreshTimer = setInterval(() => this.fetchData(true), rate);
    },

    stopAutoRefresh() {
      if (this.refreshTimer) clearInterval(this.refreshTimer);
    },

    restartAutoRefresh() {
      this.fetchData();
      this.startAutoRefresh();
    },

    async fetchData(isSilent = false) {
      if (!isSilent) this.loading = true;
      try {
        const startUTC = new Date(this.startDate).toISOString();
        const endUTC = new Date(this.endDate).toISOString();

        // ใช้ API เส้นเดียวตามที่กำหนด
        const url = `${baseUrl}/api/devices/${this.device.address_id}/chart/level?start=${startUTC}&end=${endUTC}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response was not ok');
        
        const data = await res.json();

        this.levels = data.levels || [];
        
        // แปลงเวลา Alarm เป็น Milliseconds เพื่อใช้เทียบจุด
        const alarmTs = this.alarmTime ? new Date(this.alarmTime).getTime() : null;

        const series = (data.series || []).map(log => {
          const currentTs = new Date(log.x).getTime();
          
          // ตรวจสอบว่าจุดในข้อมูลนี้ อยู่ใกล้กับเวลา Alarm หรือไม่ (เผื่อความคลาดเคลื่อน 1 วินาที)
          const isAlarmPoint = alarmTs ? Math.abs(currentTs - alarmTs) < 1500 : false;

          return {
            x: new Date(log.x),
            y: log.y,
            label: log.label,
            is_alarm: isAlarmPoint, 
            connected: log.connected === 'connected'
          };
        });

        this.lastData = series;
        this.isEmpty = series.length === 0;

        if (!this.isEmpty) {
          this.processStats(series);
          this.renderCharts(series);
        }
        
      } catch (err) {
        console.error("Fetch Level Error:", err);
      } finally {
        this.loading = false;
      }
    },

    processStats(series) {
      this.stats.connected = series.filter(d => d.connected === true).length;
      this.stats.disconnected = series.filter(d => d.connected === false).length;
    },

    // ฟังก์ชันสร้างเส้นประสีแดงตรงเวลาที่กำหนด
    getAlarmAnnotation(alarmDate) {
      return {
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
              position: 'start',
              yAdjust: -10
            }
          }
        }
      }
    },

    renderCharts(series) {
      Object.values(this.charts).forEach(c => c?.destroy());

      const levelLabels = {};
      this.levels.forEach(l => { levelLabels[l.level_index] = l.label; });

      // ใช้ค่า alarmTime ที่ส่งมาจาก Props โดยตรงในการวาดเส้นแนวตั้ง
      const alarmDate = this.alarmTime ? new Date(this.alarmTime) : null;

      // --- 1. Level Line Chart ---
      this.charts.level = new Chart(this.$refs.levelCanvas.getContext('2d'), {
        type: 'line',
        data: {
          datasets: [{
            label: 'Level',
            data: series.map(d => ({ x: d.x, y: d.y, isAlarm: d.is_alarm })), 
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            stepped: true,
            // ถ้าเป็นจุดที่ตรงกับ Alarm ให้ขยายจุดเป็นสีแดง
            pointRadius: ctx => (ctx.raw?.isAlarm ? 6 : 2),
            pointBackgroundColor: ctx => (ctx.raw?.isAlarm ? '#ef4444' : '#3b82f6'),
            pointBorderColor: ctx => (ctx.raw?.isAlarm ? '#fff' : '#3b82f6'),
            pointBorderWidth: ctx => (ctx.raw?.isAlarm ? 2 : 1),
            spanGaps: true 
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
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
              min: -0.5, 
              max: this.levels.length > 0 ? Math.max(...this.levels.map(l => l.level_index)) + 0.5 : 1,
              ticks: {
                stepSize: 1,
                callback: (val) => this.levels.find(l => l.level_index === val)?.label || null
              },
              grid: { color: (context) => (context.tick.value < 0 ? 'transparent' : '#e5e7eb') }
            }
          },
          plugins: {
            legend: { display: false },
            annotation: alarmDate ? this.getAlarmAnnotation(alarmDate) : {},
            tooltip: {
              callbacks: {
                label: (context) => `Level: ${levelLabels[context.parsed.y] || context.parsed.y}`
              }
            }
          }
        }
      });

      // --- 2. Connection Line Chart (Network) ---
      this.charts.connLine = new Chart(this.$refs.connLineCanvas.getContext('2d'), {
        type: 'line',
        data: {
          datasets: [{
            data: series.map(d => ({ x: d.x, y: d.connected ? 1 : 0, isAlarm: d.is_alarm })),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true, stepped: true,
            pointRadius: ctx => (ctx.raw?.isAlarm ? 6 : 0),
            pointBackgroundColor: '#ef4444'
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          scales: {
            x: { type: 'time', time: { tooltipFormat: 'dd/MM/yyyy HH:mm:ss' }, ticks: { maxTicksLimit: 4 } },
            y: {
              min: -0.3, max: 1.3,
              ticks: {
                stepSize: 1,
                callback: (v) => (v === 1 ? 'Connected' : v === 0 ? 'Disconnected' : '')
              }
            }
          },
          plugins: { 
            legend: { display: false },
            annotation: alarmDate ? this.getAlarmAnnotation(alarmDate) : {}
          }
        }
      });

      // --- 3. Connection Pie Chart ---
      this.charts.connPie = new Chart(this.$refs.connPieCanvas.getContext('2d'), {
        type: 'pie',
        data: {
          labels: ['Connected', 'Disconnected'],
          datasets: [{
            data: [this.stats.connected, this.stats.disconnected],
            backgroundColor: ['#10b981', '#6c757d']
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }
}
</script>