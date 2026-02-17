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
      levels: [], // [{level_index, label}]
      lastData: [],
      stats: { connected: 0, disconnected: 0 },
      refreshTimer: null
    }
  },

  watch: {
    startDate: "restartAutoRefresh",
    endDate: "restartAutoRefresh",
    "device.id": "restartAutoRefresh"
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
    startAutoRefresh() {
      this.stopAutoRefresh();
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

        const res = await fetch(
          `${baseUrl}/api/devices/${this.device.address_id}/chart/level?start=${startUTC}&end=${endUTC}`
        );
        const data = await res.json();

        console.log(data)

        this.levels = data.levels || [];
        const series = (data.series || []).map(log => ({
          x: log.x,
          y: log.y,
          label: log.label,
          value: log.value,
          // ⭐ map ให้ตรง OnOff / Network
          connected: log.connected === 'connected'
        }));

        this.lastData = series;
        this.isEmpty = series.length === 0;

        if (!this.isEmpty) {
          this.processStats(series);
          this.renderCharts(series);
        }

        if (this.alarmTime) this.stopAutoRefresh()
        
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

    renderCharts(series) {
Object.values(this.charts).forEach(c => c?.destroy());

  const levelLabels = {};
  // เพิ่ม "Unknown" เข้าไปในกรณีที่ y เป็น null
  levelLabels[null] = "Unknown"; 
  this.levels.forEach(l => { levelLabels[l.level_index] = l.label; });

  // คำนวณหา Max Level Index จาก config levels
  const maxLevelIndex = this.levels.length > 0 
    ? Math.max(...this.levels.map(l => l.level_index)) 
    : 0;

  this.charts.level = new Chart(this.$refs.levelCanvas.getContext('2d'), {
    type: 'line',
    data: {
      datasets: [{
        label: 'Level',
        // ตรวจสอบค่า d.y ถ้าเป็น null ให้ใส่เป็น null เพื่อให้ Chart.js จัดการ (หรือใส่ 0 ขึ้นอยู่กับความต้องการ)
        data: series.map(d => ({ x: new Date(d.x), y: d.y })), 
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        stepped: true,
        pointRadius: 2,
        spanGaps: false // ตั้งเป็น false เพื่อให้เห็นว่าข้อมูลขาดหาย (null)
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
            // ซ่อนเส้น Grid ของค่าที่ติดลบ (ส่วนที่เป็น Gap) เพื่อความสวยงาม
            drawBorder: false,
            color: (context) => (context.tick.value < 0 ? 'transparent' : '#e5e7eb'),
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const val = context.parsed.y;
              const label = levelLabels[val] || (val === null ? 'Unknown' : val);
              return `Level: ${label}`;
            }
          }
        }
      }
    }
  });

      // --- 2. Connection Line Chart ---
      this.charts.connLine = new Chart(this.$refs.connLineCanvas.getContext('2d'), {
        type: 'line',
        data: {
          datasets: [{
            data: series.map(d => ({ x: new Date(d.x), y: d.connected ? 1 : 0 })),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            stepped: true,
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
              min: 0, max: 1,
              ticks: {
                stepSize: 1,
                callback: (v) => v === 1 ? 'Connected' : 'Disconnected'
              }
            }
          },
          plugins: { legend: { display: false } }
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
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }
}
</script>