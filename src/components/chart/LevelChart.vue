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
            <div style="height: 350px;">
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
              <span class="badge bg-success d-block mb-1 p-2">Connect: {{ stats.connected }} ครั้ง</span>
              <span class="badge bg-secondary d-block p-2">Disconnect: {{ stats.disconnected }} ครั้ง</span>
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
    alarmTime: { type: String, default: null } // รับเวลาที่เกิด Alarm มาจากหน้า List
  },

  data() {
    return {
      loading: false,
      isEmpty: false,
      charts: {},
      levels: [], 
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
    formatTimeLabel(date) {
      if (!date) return ''
      return new Date(date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    },

    startAutoRefresh() {
      this.stopAutoRefresh();
      if (this.alarmTime) return; // ถ้าดู Alarm ไม่ต้อง refresh ป้องกันจุดขยับ
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
        // Format date as YYYY-MM-DD HH:mm:ss (without T and Z)
        const formatDate = (date) => {
          const d = new Date(date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const seconds = String(d.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        let url;
        if (this.alarmTime) {
          // ใช้ chart-by-alarm เมื่อมี alarmTime (expand ±20%)
          url = `${baseUrl}/api/devices/chart-by-alarm` +
                `?address_id=${this.device.address_id}` +
                `&alarm_time=${encodeURIComponent(this.alarmTime)}` +
                `&expand=20`;
        } else {
          // Format date as YYYY-MM-DD HH:mm:ss
          const startStr = formatDate(this.startDate);
          const endStr = formatDate(this.endDate);
          url = `${baseUrl}/api/devices/chart/` +
                `?address_id=${this.device.address_id}` +
                `&start=${startStr}` +
                `&end=${endStr}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        console.log("Fetch URL:", url);
        console.log("Fetched Chart Data:", data);

        // เก็บข้อมูล Level แบบล้าง Proxy
        this.levels = JSON.parse(JSON.stringify(data.levels || []));
        
        const alarmTs = this.alarmTime ? new Date(this.alarmTime).getTime() : null;

        // หาจุดที่ใกล้ alarmTime มากที่สุด
        let closestIdx = -1;
        let closestDiff = Infinity;
        
        const series = (data.series || []).map((log, idx) => {
          const currentTs = new Date(log.x).getTime();
          
          if (alarmTs) {
            const diff = Math.abs(currentTs - alarmTs);
            if (diff < closestDiff) {
              closestDiff = diff;
              closestIdx = idx;
            }
          }

          return {
            x: new Date(log.x),
            y: log.y,
            is_alarm: false, 
            connected: log.status === 1
          };
        });

        // มาร์คเฉพาะจุดที่ใกล้ alarmTime มากที่สุดจุดเดียว
        if (closestIdx >= 0) {
          series[closestIdx].is_alarm = true;
        }

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
              content: `🚨 ALARM AT ${this.formatTimeLabel(alarmDate)}`,
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

      // เตรียม Map สำหรับแกน Y (Key: index, Value: label)
      const levelMap = {};
      this.levels.forEach(l => {
        levelMap[String(l.level_index)] = l.label;
      });

      const alarmDate = this.alarmTime ? new Date(this.alarmTime) : null;
      const levelKeys = Object.keys(levelMap).map(Number);
      const maxIdx = levelKeys.length > 0 ? Math.max(...levelKeys) : 2;

      // --- 1. Level Chart ---
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
            pointRadius: ctx => (ctx.raw?.isAlarm ? 7 : 2),
            pointBackgroundColor: ctx => (ctx.raw?.isAlarm ? '#ef4444' : '#3b82f6'),
            pointBorderColor: ctx => (ctx.raw?.isAlarm ? '#fff' : '#3b82f6'),
            pointBorderWidth: ctx => (ctx.raw?.isAlarm ? 3 : 1),
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
                // 1. ตั้งค่า min ให้ติดลบ (เช่น -0.5) เพื่อสร้าง Gap ด้านล่างไม่ให้ชิดพื้น
          min: -0.5, 

          // 2. ตั้งค่า max ให้สูงกว่า index สูงสุดเล็กน้อยเพื่อให้ Label อยู่ด้านบน
          max: this.levels.length > 0 
            ? Math.max(...this.levels.map(l => l.level_index)) + 0.2 
            : 0.5,

          ticks: {
            stepSize: 1,
            callback: (val) => {
              // 3. แสดงเฉพาะ Label ที่มีในข้อมูล (ป้องกันไม่ให้เลข -1 หรือ 0.5 โผล่มา)
              const found = this.levels.find(l => l.level_index === val);
              return found ? found.label : null;
            }
          },
              grid: {
                color: (ctx) => (levelMap[String(ctx.tick.value)] ? '#e5e7eb' : 'transparent')
              }
            }
          },
          plugins: {
            legend: { display: false },
            annotation: alarmDate ? this.getAlarmAnnotation(alarmDate) : {},
            tooltip: {
              callbacks: {
                label: (ctx) => `ระดับ: ${levelMap[String(ctx.parsed.y)] || ctx.parsed.y}`
              }
            }
          }
        }
      });

      // --- 2. Network Chart ---
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
          interaction: { mode: 'nearest', intersect: false, axis: 'x' },
          scales: {
            x: { type: 'time', time: { tooltipFormat: 'dd-MM-yyyy HH:mm:ss' }, ticks: { maxTicksLimit: 5 } },
            y: {
              min: -0.2, max: 1.2,
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

      // --- 3. Pie Chart ---
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

<style scoped>
.level-chart-wrapper {
  width: 100%;
}
.card {
  transition: transform 0.2s;
}
.badge {
  font-size: 0.9rem;
}
</style>