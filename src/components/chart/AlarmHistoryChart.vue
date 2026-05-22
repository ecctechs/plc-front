<template>
  <div class="card shadow-sm border-0 mb-4">
    <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
      <h5 class="mb-0 fw-bold">
        <i class="bi bi-graph-up-arrow me-2 text-primary"></i>{{ locale.t('Alarm History Trend') }}
      </h5>
      <div class="btn-group btn-group-sm">
        <button
          :class="days === 7 ? 'btn btn-primary' : 'btn btn-outline-primary'"
          @click="setDays(7)">{{ locale.t('7 Days') }}</button>
        <button
          :class="days === 30 ? 'btn btn-primary' : 'btn btn-outline-primary'"
          @click="setDays(30)">{{ locale.t('30 Days') }}</button>
      </div>
    </div>
    <div class="card-body">
      <div v-if="loading" class="text-center py-5 text-muted">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2 mb-0">{{ locale.t('Loading...') }}</p>
      </div>
      <div v-else-if="!chartData.length" class="text-center py-5 text-muted">
        <i class="bi bi-bar-chart fs-1 opacity-25"></i>
        <p class="mt-2">{{ locale.t('No data') }}</p>
      </div>
      <vue-apex-charts
        v-else
        type="line"
        height="300"
        :options="chartOptions"
        :series="chartSeries"
      />
    </div>
  </div>
</template>

<script>
import VueApexCharts from 'vue3-apexcharts'

const BASE_API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const authH = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` })

export default {
  name: 'AlarmHistoryChart',
  components: { VueApexCharts },
  inject: ['locale'],

  data() {
    return {
      days: 7,
      chartData: [],
      loading: false,
    }
  },

  computed: {
    chartSeries() {
      return [
        {
          name: this.locale.t('Alarm Count'),
          type: 'bar',
          data: this.chartData.map(d => ({ x: d.date, y: d.alarm_count })),
        },
        {
          name: this.locale.t('Downtime (sec)'),
          type: 'line',
          data: this.chartData.map(d => ({ x: d.date, y: d.total_downtime_sec })),
        },
      ]
    },
    chartOptions() {
      return {
        chart: {
          type: 'line',
          height: 300,
          toolbar: { show: false },
          animations: { enabled: false },
        },
        stroke: {
          width: [0, 3],
          curve: 'smooth',
        },
        plotOptions: {
          bar: { borderRadius: 4, columnWidth: '45%' },
        },
        colors: ['#ef4444', '#3b82f6'],
        markers: { size: [0, 4] },
        xaxis: {
          type: 'category',
          labels: { rotate: -45 },
        },
        yaxis: [
          {
            title: { text: this.locale.t('Alarm Count') },
            min: 0,
            labels: { formatter: v => Math.round(v) },
          },
          {
            opposite: true,
            title: { text: this.locale.t('Downtime (sec)') },
            min: 0,
            labels: { formatter: v => Math.round(v) + 's' },
          },
        ],
        legend: {
          show: true,
          position: 'top',
          markers: { width: 12, height: 4, radius: 2 },
        },
        tooltip: {
          shared: true,
          intersect: false,
          y: [
            { formatter: v => v != null ? Math.round(v) + ' ครั้ง' : '-' },
            { formatter: v => v != null ? Math.round(v) + ' วิ' : '-' },
          ],
        },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
        dataLabels: { enabled: false },
      }
    },
  },

  mounted() {
    this.fetchData()
  },

  methods: {
    setDays(n) {
      this.days = n
      this.fetchData()
    },

    async fetchData() {
      this.loading = true
      try {
        const res = await fetch(`${BASE_API}/api/alarms/events/history?days=${this.days}`, { headers: authH() })
        const json = await res.json()
        this.chartData = json.data || []
      } catch (err) {
        console.error('AlarmHistoryChart fetch error:', err)
        this.chartData = []
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
