<template>
  <div class="container-fluid mt-4 pb-5">
    <!-- Header & Product Selector -->
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
      <div>
        <h2 class="page-title fw-bold text-primary mb-1">
          <i class="bi bi-bar-chart-line-fill me-2"></i>{{ locale.t('OEE Dashboard') }}
        </h2>
        <p class="text-muted mb-0">{{ locale.t('Overall Equipment Effectiveness Monitoring') }}</p>
      </div>

      <div class="card shadow-sm border-0 bg-white" style="min-width: 300px;">
        <div class="card-body p-3">
          <label class="form-label text-muted small fw-bold mb-1">{{ locale.t('SELECT PRODUCT') }}</label>
          <select class="form-select form-select-lg" v-model="selectedProductId">
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- MAIN OEE SCORE -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card border-0 oee-card bg-white">
          <div class="card-body text-center py-5">
            <h6 class="text-uppercase fw-bold oee-subtitle mb-3">
              {{ locale.t('Overall Equipment Effectiveness') }}
            </h6>
            <h1 class="display-1 fw-bolder oee-value mb-4">
              {{ oee }}<span class="fs-3 text-muted ms-1">%</span>
            </h1>
            <div class="d-inline-flex align-items-center formula-pill px-4 py-2 mb-2">
              <span class="fs-6 text-muted fw-medium">{{ locale.t('OEE = ') }}</span>
              <span class="fs-5 ms-3 text-theme-blue fw-bold">A</span>
              <span class="mx-2 text-muted fw-light">×</span>
              <span class="fs-5 text-theme-orange fw-bold">P</span>
              <span class="mx-2 text-muted fw-light">×</span>
              <span class="fs-5 text-theme-green fw-bold">Q</span>
            </div>
            <!-- สูตรแสดงตัวเลขจริง -->
            <div class="mt-2 text-muted small fw-medium">
              <span class="text-theme-blue">{{ availability }}%</span>
              <span class="mx-2">×</span>
              <span class="text-theme-orange">{{ performance }}%</span>
              <span class="mx-2">×</span>
              <span class="text-theme-green">{{ quality }}%</span>
              <span class="mx-2">=</span>
              <span class="fw-bold text-dark">{{ oee }}%</span>
            </div>
            <!-- Target OEE Bar -->
            <div class="target-bar-wrap mx-auto mt-4" style="max-width: 520px;">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span :class="parseFloat(oee) >= targetOee ? 'badge bg-success px-3 py-2' : 'badge bg-danger px-3 py-2'">
                  {{ locale.t('Actual') }} {{ oee }}%
                </span>
                <span :class="parseFloat(oee) >= targetOee ? 'text-success fw-bold' : 'text-danger fw-bold'">
                  {{ parseFloat(oee) >= targetOee ? '▲ ' + locale.t('Above target') : '▼ ' + locale.t('Below target') }}
                  {{ Math.abs(parseFloat(oee) - targetOee).toFixed(2) }}%
                </span>
                <span class="badge bg-secondary px-3 py-2">{{ locale.t('Target') }} {{ targetOee }}%</span>
              </div>
              <div class="position-relative" style="height: 22px;">
                <div class="progress h-100 rounded-pill">
                  <div class="progress-bar rounded-pill"
                    :class="parseFloat(oee) >= targetOee ? 'bg-success' : 'bg-danger'"
                    :style="{ width: Math.min(parseFloat(oee), 100) + '%' }"
                    role="progressbar">
                  </div>
                </div>
                <div class="position-absolute top-0 bottom-0"
                  :style="{ left: Math.min(targetOee, 100) + '%', transform: 'translateX(-50%)' }"
                  style="width: 3px; background: #212529; border-radius: 2px; z-index: 1;">
                </div>
              </div>
              <div class="d-flex justify-content-between mt-1 small text-muted">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3 PILLARS: A, P, Q -->
    <div class="row g-4 mb-4">
      <!-- Availability -->
      <div class="col-md-4">
        <div class="card shadow-sm border-0 h-100 border-top border-info border-4">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="card-title text-muted fw-bold">{{ locale.t('Availability') }}</h5>
              <h2 class="text-info fw-bold mb-0">{{ availability }}%</h2>
            </div>
            <hr class="text-muted">
            <div class="calculation-box bg-light rounded p-3">
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-calculator me-1"></i> {{ locale.t('Calculation Formula:') }}</p>
              <code class="d-block text-dark mb-3 bg-white p-2 rounded border">{{ locale.t('Operating Time / Planned Time') }}</code>
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-123 me-1"></i> {{ locale.t('Actual Values:') }}</p>
              <div class="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
                <span class="text-info fw-bold">{{ operatingTime }} {{ locale.t('min') }}</span>
                <span class="text-muted mx-1">÷</span>
                <span class="text-secondary fw-bold">{{ plannedMin }} {{ locale.t('min') }}</span>
                <span class="text-muted mx-1">=</span>
                <span class="text-info fw-bold">{{ availability }}%</span>
              </div>
              <div class="progress mt-3" style="height: 8px; border-radius: 4px;">
                <div class="progress-bar bg-info" role="progressbar"
                  :style="{ width: Math.min(parseFloat(availability), 100) + '%' }">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance -->
      <div class="col-md-4">
        <div class="card shadow-sm border-0 h-100 border-top border-warning border-4">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="card-title text-muted fw-bold">{{ locale.t('Performance') }}</h5>
              <h2 class="text-warning fw-bold mb-0">{{ performance }}%</h2>
            </div>
            <hr class="text-muted">
            <div class="calculation-box bg-light rounded p-3">
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-calculator me-1"></i> {{ locale.t('Calculation Formula:') }}</p>
              <code class="d-block text-dark mb-3 bg-white p-2 rounded border">{{ locale.t('(Ideal Cycle Time × Total Output) / (Operating Time × 60)') }}</code>
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-123 me-1"></i> {{ locale.t('Actual Values:') }}</p>
              <div class="d-flex align-items-center justify-content-between bg-white p-2 rounded border flex-wrap gap-1 text-center">
                <span class="text-warning fw-bold">({{ idealCycleTime }} × {{ totalOutput }})</span>
                <span class="text-muted">÷</span>
                <span class="text-secondary fw-bold">({{ operatingTime }} × 60)</span>
                <span class="text-muted">=</span>
                <span class="text-warning fw-bold">{{ performance }}%</span>
              </div>
              <div class="progress mt-3" style="height: 8px; border-radius: 4px;">
                <div class="progress-bar bg-warning" role="progressbar"
                  :style="{ width: Math.min(parseFloat(performance), 100) + '%' }">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quality -->
      <div class="col-md-4">
        <div class="card shadow-sm border-0 h-100 border-top border-success border-4">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="card-title text-muted fw-bold">{{ locale.t('Quality') }}</h5>
              <h2 class="text-success fw-bold mb-0">{{ quality }}%</h2>
            </div>
            <hr class="text-muted">
            <div class="calculation-box bg-light rounded p-3">
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-calculator me-1"></i> {{ locale.t('Calculation Formula:') }}</p>
              <code class="d-block text-dark mb-3 bg-white p-2 rounded border">{{ locale.t('Good Count / Total Output') }}</code>
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-123 me-1"></i> {{ locale.t('Actual Values:') }}</p>
              <div class="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
                <span class="text-success fw-bold">{{ goodCount }} {{ locale.t('pcs') }}</span>
                <span class="text-muted mx-1">÷</span>
                <span class="text-secondary fw-bold">{{ totalOutput }} {{ locale.t('pcs') }}</span>
                <span class="text-muted mx-1">=</span>
                <span class="text-success fw-bold">{{ quality }}%</span>
              </div>
              <div class="progress mt-3" style="height: 8px; border-radius: 4px;">
                <div class="progress-bar bg-success" role="progressbar"
                  :style="{ width: Math.min(parseFloat(quality), 100) + '%' }">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RAW DATA SOURCES (Time & Output) -->
    <div class="row g-4 mb-4">
      <!-- Time Variables -->
      <div class="col-md-6">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-header bg-white py-3">
            <h5 class="mb-0 fw-bold"><i class="bi bi-clock-history me-2 text-primary"></i>{{ locale.t('Time Breakdown') }}</h5>
          </div>
          <div class="card-body">
            <div class="row text-center g-3">
              <div class="col-4">
                <div class="p-3 bg-light rounded h-100 border">
                  <h6 class="text-muted small">{{ locale.t('Planned Time') }}</h6>
                  <h4 class="mb-0">{{ plannedMin }}</h4>
                  <small class="text-muted">{{ locale.t('mins') }}</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-danger bg-opacity-10 rounded h-100 border border-danger border-opacity-25">
                  <h6 class="text-danger small">{{ locale.t('Downtime') }}</h6>
                  <h4 class="text-danger mb-0">{{ downtimeMin }}</h4>
                  <small class="text-danger">{{ locale.t('mins') }}</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-info bg-opacity-10 rounded h-100 border border-info border-opacity-25">
                  <h6 class="text-info small">{{ locale.t('Operating Time') }}</h6>
                  <h4 class="text-info mb-0">{{ operatingTime }}</h4>
                  <small class="text-info">{{ locale.t('mins') }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Output Variables -->
      <div class="col-md-6">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-header bg-white py-3">
            <h5 class="mb-0 fw-bold"><i class="bi bi-box-seam me-2 text-primary"></i>{{ locale.t('Production Output') }}</h5>
          </div>
          <div class="card-body">
            <div class="row text-center g-3 mb-3">
              <div class="col-4">
                <div class="p-3 bg-light rounded h-100 border">
                  <h6 class="text-muted small">{{ locale.t('Total Output') }}</h6>
                  <h4 class="mb-0">{{ totalOutput }}</h4>
                  <small class="text-muted">{{ locale.t('pcs') }}</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-danger bg-opacity-10 rounded h-100 border border-danger border-opacity-25">
                  <h6 class="text-danger small">{{ locale.t('Reject') }}</h6>
                  <h4 class="text-danger mb-0">{{ totalReject }}</h4>
                  <small class="text-danger">{{ locale.t('pcs') }}</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-success bg-opacity-10 rounded h-100 border border-success border-opacity-25">
                  <h6 class="text-success small">{{ locale.t('Good Count') }}</h6>
                  <h4 class="text-success mb-0">{{ goodCount }}</h4>
                  <small class="text-success">{{ locale.t('pcs') }}</small>
                </div>
              </div>
            </div>       
            <div v-if="targetOutput > 0" class="bg-light rounded border p-3 mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-bold text-muted small text-uppercase">{{ locale.t('Target Output') }}</span>
                <span :class="totalOutput >= targetOutput ? 'badge bg-success' : 'badge bg-warning text-dark'">
                  {{ ((totalOutput / targetOutput) * 100).toFixed(1) }}%
                </span>
              </div>
              <div class="progress mb-2" style="height: 12px; border-radius: 6px;">
                <div class="progress-bar"
                  :class="totalOutput >= targetOutput ? 'bg-success' : 'bg-warning'"
                  :style="{ width: Math.min((totalOutput / targetOutput) * 100, 100) + '%' }"
                  role="progressbar">
                </div>
              </div>
              <div class="d-flex justify-content-between small">
                <span><b>{{ totalOutput }}</b> / {{ targetOutput }} {{ locale.t('pcs') }}</span>
                <span v-if="totalOutput < targetOutput" class="text-danger fw-bold">
                  {{ locale.t('Short by') }} {{ targetOutput - totalOutput }} {{ locale.t('pcs') }}
                </span>
                <span v-else class="text-success fw-bold">
                  {{ locale.t('Exceeded by') }} {{ totalOutput - targetOutput }} {{ locale.t('pcs') }} ✓
                </span>
              </div>
              <div v-if="projectedOutput > 0" class="text-muted small mt-2 border-top pt-2">
                <i class="bi bi-graph-up me-1"></i>{{ locale.t('Estimated end of day') }}: ~<b>{{ projectedOutput }}</b> {{ locale.t('pcs') }}
                <span v-if="projectedOutput >= targetOutput" class="text-success ms-1">({{ locale.t('Target achieved') }} ✓)</span>
                <span v-else class="text-danger ms-1">({{ locale.t('Below target') }} {{ targetOutput - projectedOutput }} {{ locale.t('pcs') }})</span>
              </div>
            </div>
            <div class="p-3 bg-light rounded border d-flex justify-content-between align-items-center">
              <span class="text-muted fw-bold">{{ locale.t('Ideal Cycle Time') }}</span>
              <span class="badge bg-warning text-dark fs-6">{{ idealCycleTime }} {{ locale.t('seconds / pc') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- OEE TREND CHART -->
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 class="mb-0 fw-bold">
          <i class="bi bi-graph-up me-2 text-primary"></i>{{ locale.t('OEE Trend') }}
        </h5>
        <div class="btn-group btn-group-sm">
          <button
            :class="trendDays === 7 ? 'btn btn-primary' : 'btn btn-outline-primary'"
            @click="trendDays = 7">{{ locale.t('7 Days') }}</button>
          <button
            :class="trendDays === 30 ? 'btn btn-primary' : 'btn btn-outline-primary'"
            @click="trendDays = 30">{{ locale.t('30 Days') }}</button>
        </div>
      </div>
      <div class="card-body">
        <div v-if="trendLoading" class="text-center py-5 text-muted">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 mb-0">{{ locale.t('Loading...') }}</p>
        </div>
        <div v-else-if="!trendData.length" class="text-center py-5 text-muted">
          <i class="bi bi-bar-chart fs-1 opacity-25"></i>
          <p class="mt-2">{{ locale.t('No trend data') }}</p>
        </div>
        <vue-apex-charts
          v-else
          type="line"
          height="350"
          :options="trendChartOptions"
          :series="trendSeries"
        />
      </div>
    </div>

    <!-- PLC STATUS -->
    <div class="card shadow-sm border-0">
      <div class="card-header bg-white py-3">
        <h5 class="mb-0 fw-bold text-muted"><i class="bi bi-cpu me-2"></i>{{ locale.t('PLC Real-time Status') }}</h5>
      </div>
      <div class="card-body">
        <div class="row g-3 text-center">
          <!-- Output Status -->
          <div class="col-md-3">
            <div class="p-3 border rounded">
              <h6 class="text-muted small text-uppercase">{{ locale.t('Output Signal') }}</h6>
              <div class="my-2">
                <span v-if="latestPLCLog.plc_onoff_value === 1" class="badge bg-success px-4 py-2 fs-5">{{ locale.t('ON') }}</span>
                <span v-else class="badge bg-danger px-4 py-2 fs-5">{{ locale.t('OFF') }}</span>
              </div>
              <small class="text-muted d-block font-monospace bg-light p-1 rounded">{{ plcAddresses.plc_address_output || locale.t('Address N/A') }}</small>
            </div>
          </div>

          <!-- Active Status -->
          <div class="col-md-3">
            <div class="p-3 border rounded border-info">
              <h6 class="text-info small text-uppercase fw-bold">{{ locale.t('Active Model') }}</h6>
              <div class="my-2">
                <span class="badge bg-info px-4 py-2 fs-5">{{ latestPLCLog.plc_active_value || '-' }}</span>
              </div>
              <small class="text-dark fw-bold d-block mb-1">{{ getProductNameById(latestPLCLog.plc_active_value) }}</small>
              <small class="text-muted d-block font-monospace bg-light p-1 rounded">{{ plcAddresses.plc_address_active || locale.t('Address N/A') }}</small>
            </div>
          </div>

          <!-- Complete Status -->
          <div class="col-md-3">
            <div class="p-3 border rounded">
              <h6 class="text-muted small text-uppercase">{{ locale.t('Complete Signal') }}</h6>
              <div class="my-2">
                <span v-if="latestPLCLog.plc_complete_value === 1" class="badge bg-success px-4 py-2 fs-5">{{ locale.t('ON') }}</span>
                <span v-else class="badge bg-danger px-4 py-2 fs-5">{{ locale.t('OFF') }}</span>
              </div>
              <small class="text-muted d-block font-monospace bg-light p-1 rounded">{{ plcAddresses.plc_address_complete || locale.t('Address N/A') }}</small>
            </div>
          </div>

          <!-- Reject Status -->
          <div class="col-md-3">
            <div class="p-3 border rounded border-danger">
              <h6 class="text-danger small text-uppercase fw-bold">{{ locale.t('Reject Signal') }}</h6>
              <div class="my-2">
                <span v-if="latestPLCLog.plc_reject_value === 1" class="badge bg-success px-4 py-2 fs-5">{{ locale.t('ON') }}</span>
                <span v-else class="badge bg-danger px-4 py-2 fs-5">{{ locale.t('OFF') }}</span>
              </div>
              <small class="text-muted d-block font-monospace bg-light p-1 rounded">{{ plcAddresses.plc_address_reject || locale.t('Address N/A') }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import VueApexCharts from 'vue3-apexcharts'

const BASE_API = import.meta.env.VITE_API_BASE_URL

export default {
  name: 'Oee',
  components: { VueApexCharts },
  inject: ['locale'],

  data() {
    return {
      results: [],
      selectedProductId: null,
      idealCycleTime: 0,
      targetOee: 85,
      targetOutput: 0,
      plcAddresses: {
        plc_address_output: null,
        plc_address_active: null,
        plc_address_complete: null,
        plc_address_reject: null,
      },
      latestPLCLog: {
        plc_onoff_value: null,
        plc_active_value: null,
        plc_complete_value: null,
        plc_reject_value: null,
      },
      pollTimer: null,
      plcPollTimer: null,
      trendDays: 7,
      trendData: [],
      trendLoading: false,
    }
  },

  computed: {
    products() {
      return this.results.map(r => ({ id: r.product_id, name: r.product_name }))
    },
    selected() {
      return this.results.find(r => r.product_id === this.selectedProductId) || {}
    },
    oee() {
      return (this.selected.oee || 0).toFixed(2)
    },
    availability() {
      return (this.selected.availability || 0).toFixed(2)
    },
    performance() {
      return ((this.selected.performance || 0)).toFixed(2)
    },
    quality() {
      return (this.selected.quality || 0).toFixed(2)
    },
    totalOutput() {
      return this.selected.total_output || 0
    },
    totalReject() {
      return this.selected.reject_output || 0
    },
    goodCount() {
      return Math.max(0, this.totalOutput - this.totalReject)
    },
    plannedMin() {
      return this.selected.planned_min || 0
    },
    downtimeMin() {
      return (this.selected.downtime_min || 0).toFixed(2)
    },
    operatingTime() {
      return Math.max(0, (this.selected.planned_min || 0) - (this.selected.downtime_min || 0)).toFixed(2)
    },
    projectedOutput() {
      const opTime = parseFloat(this.operatingTime)
      if (opTime <= 0 || this.totalOutput <= 0) return 0
      const rate = this.totalOutput / opTime
      return Math.round(rate * this.plannedMin)
    },
    trendSeries() {
      if (!this.trendData.length) return []
      const toNum = v => v != null ? parseFloat(parseFloat(v).toFixed(2)) : null
      return [
        {
          name: 'OEE',
          data: this.trendData.map(d => ({ x: d.date, y: toNum(d.oee) })),
        },
        {
          name: 'Availability',
          data: this.trendData.map(d => ({ x: d.date, y: toNum(d.availability) })),
        },
        {
          name: 'Performance',
          data: this.trendData.map(d => ({ x: d.date, y: toNum(d.performance) })),
        },
        {
          name: 'Quality',
          data: this.trendData.map(d => ({ x: d.date, y: toNum(d.quality) })),
        },
        {
          name: 'Target OEE',
          data: this.trendData.map(d => ({ x: d.date, y: this.targetOee })),
        },
      ]
    },
    trendChartOptions() {
      return {
        chart: { type: 'line', height: 350, toolbar: { show: false }, animations: { enabled: false } },
        stroke: {
          width: [4, 1.5, 1.5, 1.5, 1.5],
          dashArray: [0, 0, 0, 0, 6],
          curve: 'smooth',
        },
        colors: ['#1e3a8a', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444'],
        markers: { size: [4, 3, 3, 3, 0] },
        xaxis: { type: 'category', labels: { rotate: -45 } },
        yaxis: { min: 0, max: 100, tickAmount: 5, labels: { formatter: v => v != null ? v.toFixed(1) + '%' : '' } },
        legend: {
          show: true,
          position: 'top',
          markers: { width: 12, height: 4, radius: 2 },
        },
        tooltip: {
          shared: true,
          y: { formatter: v => v != null ? v.toFixed(2) + '%' : '-' },
        },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
      }
    },
  },

  watch: {
    selectedProductId(id) {
      if (id) {
        this.loadProductDetail(id)
        this.loadTrend()
      }
    },
    trendDays() {
      this.loadTrend()
    },
  },

  async mounted() {
    await this.loadSnapshot()
    await this.loadLatestLog()
    this.pollTimer = setInterval(() => this.loadSnapshot(), 5000)
    this.plcPollTimer = setInterval(() => this.loadLatestLog(), 2000)
  },

  beforeUnmount() {
    clearInterval(this.pollTimer)
    clearInterval(this.plcPollTimer)
  },

  methods: {
    async loadSnapshot() {
      const now = new Date()
      const date = now.toISOString().split('T')[0]
      const currentTime = now.toTimeString().slice(0, 5)
      try {
        const res = await fetch(`${BASE_API}/api/oee/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, current_time: currentTime }),
        })
        if (!res.ok) throw new Error('Failed to fetch OEE snapshot')
        const data = await res.json()
        this.results = data.results || []
        if (!this.selectedProductId && this.results.length > 0) {
          this.selectedProductId = this.results[0].product_id
        }
      } catch (err) {
        console.error('OEE snapshot error:', err)
      }
    },

    async loadProductDetail(id) {
      try {
        const res = await fetch(`${BASE_API}/api/products/${id}`)
        if (!res.ok) throw new Error('Failed to load product detail')
        const json = await res.json()
        const product = json.data || json
        this.idealCycleTime = product.cycle_time || 0
        this.targetOee    = product.target_oee    || 85
        this.targetOutput = product.target_output || 0
        this.plcAddresses = {
          plc_address_output: product.plc_address_output || null,
          plc_address_active: product.plc_address_active || null,
          plc_address_complete: product.plc_address_complete || null,
          plc_address_reject: product.plc_address_reject || null,
        }
      } catch (err) {
        console.error('Product detail error:', err)
      }
    },

    async loadLatestLog() {
      try {
        const res = await fetch(`${BASE_API}/api/products/latest-log`)
        if (!res.ok) throw new Error('Failed to load latest PLC log')
        const data = await res.json()
        if (data.success && data.data) {
          this.latestPLCLog = {
            plc_onoff_value: data.data.plc_onoff_value,
            plc_active_value: data.data.plc_active_value,
            plc_complete_value: data.data.plc_complete_value,
            plc_reject_value: data.data.plc_reject_value,
          }
        }
      } catch (err) {
        console.error('Latest PLC log error:', err)
      }
    },

    async loadTrend() {
      if (!this.selectedProductId) return
      this.trendLoading = true
      try {
        const res = await fetch(`${BASE_API}/api/oee/snapshot/${this.selectedProductId}/history?days=${this.trendDays}`)
        if (!res.ok) throw new Error('Failed to load trend')
        const json = await res.json()
        this.trendData = json.data || []
      } catch (err) {
        console.error('OEE trend error:', err)
        this.trendData = []
      } finally {
        this.trendLoading = false
      }
    },

    getProductNameById(id) {
      if (!id) return '-'
      const product = this.products.find(p => p.id === id)
      return product ? product.name : '-'
    },
  },
}
</script>

<style scoped>
.calculation-box {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
}

code {
  font-family: var(--bs-font-monospace);
  font-size: 0.875em;
  color: #d63384;
  word-wrap: break-word;
}

.oee-card {
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.08) !important;
  transition: transform 0.3s ease;
}

.oee-subtitle {
  color: #64748b;
  letter-spacing: 1.5px;
  font-size: 0.85rem;
}

.oee-value {
  color: #1e3a8a;
  letter-spacing: -2px;
}

.formula-pill {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 50px;
}

.text-theme-blue   { color: #3b82f6; }
.text-theme-orange { color: #f59e0b; }
.text-theme-green  { color: #10b981; }
</style>
