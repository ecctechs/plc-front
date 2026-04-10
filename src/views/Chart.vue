<template>
  <div class="device-chart-container p-4 border rounded shadow-sm bg-white">
    
    <!-- Header -->
    <div class="row align-items-center mb-4 border-bottom pb-3 text-center">
      
      <div class="col-md-4">
        <small class="text-uppercase text-muted fw-bold d-block">{{ locale.t('Value') }} Name</small>
        <h4 class="mb-0 text-primary">{{ device.label }}</h4>
      </div>

      <div class="col-md-4 border-start border-end">
        <small class="text-uppercase text-muted fw-bold d-block">{{ locale.t('Address') }}</small>
        <code class="fs-5 px-2 bg-light rounded">{{ device.plc_address }}</code>
      </div>

      <div class="col-md-4">
        <small class="text-uppercase text-muted fw-bold d-block">{{ locale.t('Refresh Rate') }}</small>
        <span class="fs-5">{{ device.refresh_rate_ms }} <small class="text-muted">ms</small></span>
      </div>

    </div>

    <!-- Filter -->
    <div class="row g-3 mb-4 bg-light p-3 rounded flex-nowrap filter-row">
      <div class="col-auto d-flex align-items-center">
        <!-- <span class="fw-bold me-2">{{ locale.t('Filter') }}:</span> -->
      </div>

      <!-- START -->
      <div class="col-auto">
        <div class="d-flex gap-2 align-items-center flex-nowrap">

          <VDatePicker v-model="startDateOnly" mode="date" locale="th-TH">
            <template #default="{ inputEvents }">
              <input
                class="form-control form-control-sm"
                :value="formatThaiDateOnly(startDateOnly)"
                v-on="inputEvents"
                readonly
              />
            </template>
          </VDatePicker>

          <!-- HH -->
          <select v-model="startH" class="form-select form-select-sm w-auto">
            <option v-for="h in hours" :key="'sh'+h" :value="h">{{ h }}</option>
          </select>

          :

          <!-- MM -->
          <select v-model="startM" class="form-select form-select-sm w-auto">
            <option v-for="m in minutes" :key="'sm'+m" :value="m">{{ m }}</option>
          </select>

          :

          <!-- SS -->
          <select v-model="startS" class="form-select form-select-sm w-auto">
            <option v-for="s in seconds" :key="'ss'+s" :value="s">{{ s }}</option>
          </select>

          <small>น.</small>
        </div>
      </div>

      <!-- END -->
      <div class="col-auto">
        <div class="d-flex gap-2 align-items-center flex-nowrap">

          <VDatePicker v-model="endDateOnly" mode="date" locale="th-TH">
            <template #default="{ inputEvents }">
              <input
                class="form-control form-control-sm"
                :value="formatThaiDateOnly(endDateOnly)"
                v-on="inputEvents"
                readonly
              />
            </template>
          </VDatePicker>

          <select v-model="endH" class="form-select form-select-sm w-auto">
            <option v-for="h in hours" :key="'eh'+h" :value="h">{{ h }}</option>
          </select>

          :

          <select v-model="endM" class="form-select form-select-sm w-auto">
            <option v-for="m in minutes" :key="'em'+m" :value="m">{{ m }}</option>
          </select>

          :

          <select v-model="endS" class="form-select form-select-sm w-auto">
            <option v-for="s in seconds" :key="'es'+s" :value="s">{{ s }}</option>
          </select>

          <small>น.</small>
        </div>
      </div>

      <!-- Apply Button -->
      <div class="col-auto d-flex align-items-center">
        <button class="btn btn-primary btn-sm" @click="applyFilter">
          <i class="bi bi-search"></i> {{ locale.t('Search') }}
        </button>
      </div>
    </div>

    <!-- Chart -->
    <div class="chart-area border rounded p-3">
      <component 
        :is="chartComponent" 
        :device="device" 
        :start-date="appliedStartDate" 
        :end-date="appliedEndDate" 
        :alarmTime="alarmTime"
        :eventType="eventType"
        :filter-applied="filterApplied"
      />
    </div>

  </div>
</template>

<script>
import OnOffChart from '../components/chart/OnOffChart.vue'
import NumberChart from '../components/chart/NumberChart.vue'
import NumberGaugeChart from '../components/chart/NumberGaugeChart.vue'
import LevelChart from '../components/chart/LevelChart.vue'
import { formatISO } from '../utils/date-utils'

export default {
  name: "Chart",
  
  inject: ['locale'],
  
  components: { OnOffChart, NumberChart, NumberGaugeChart, LevelChart },
  props: {
    device: Object,
    initialStart: String,
    initialEnd: String,
    alarmTime: String,
    eventType: String,
  },
  data() {

    const today = new Date()

    let start = new Date(today)
    start.setHours(0,0,0)

    let end = new Date(today)
    end.setHours(23,59,59)

    // 🔥 ถ้ามี initialStart ส่งมา → ใช้ค่านั้น
    if (this.initialStart) {
      start = new Date(this.initialStart)
    }

    if (this.initialEnd) {
      end = new Date(this.initialEnd)
    }

    return {
      startDateOnly: start,
      endDateOnly: end,

      startH: String(start.getHours()).padStart(2,'0'),
      startM: String(start.getMinutes()).padStart(2,'0'),
      startS: String(start.getSeconds()).padStart(2,'0'),

      endH: String(end.getHours()).padStart(2,'0'),
      endM: String(end.getMinutes()).padStart(2,'0'),
      endS: String(end.getSeconds()).padStart(2,'0'),

      // เก็บค่าที่ apply แล้ว
      appliedStartDate: null,
      appliedEndDate: null,
      filterApplied: 0
    }
  },
  computed: {
    hours() {
      return Array.from({ length: 24 }, (_, i) =>
        String(i).padStart(2, '0')
      )
    },

    minutes() {
      return Array.from({ length: 60 }, (_, i) =>
        String(i).padStart(2, '0')
      )
    },

    seconds() {
      return this.minutes
    },

    startDate() {
      // ไม่ emit อัตโนมัติ รอกดปุ่ม Apply
      return this.combineDateTime(
        this.startDateOnly,
        this.startH,
        this.startM,
        this.startS
      )
    },

    endDate() {
      // ไม่ emit อัตโนมัติ รอกดปุ่ม Apply
      return this.combineDateTime(
        this.endDateOnly,
        this.endH,
        this.endM,
        this.endS
      )
    },

    chartComponent() {
      const mapping = {
        onoff: 'OnOffChart',
        number: 'NumberChart',
        number_gauge: 'NumberGaugeChart',
        level: 'LevelChart'
      }
      return mapping[this.device.display_type] || null
    }
  },
  watch: {
    // เอาออก ไม่ให้ auto emit ตอนเปลี่ยนวันที่/เวลา
  },
  created() {
    // ตั้งค่าเริ่มต้นเมื่อ component สร้าง
    this.appliedStartDate = this.startDate
    this.appliedEndDate = this.endDate
  },
  methods: {

    formatThaiDateOnly(date) {
      if (!date) return ''
      const d = new Date(date)
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear() + 543
      return `${day}/${month}/${year}`
    },

    combineDateTime(date, h, m, s) {
      if (!date) return null

      const d = new Date(date)
      d.setHours(parseInt(h))
      d.setMinutes(parseInt(m))
      d.setSeconds(parseInt(s))

      const pad = (n) => String(n).padStart(2, '0')

      return (
        d.getFullYear() + '-' +
        pad(d.getMonth() + 1) + '-' +
        pad(d.getDate()) + ' ' +
        pad(d.getHours()) + ':' +
        pad(d.getMinutes()) + ':' +
        pad(d.getSeconds())
      )
    },

    applyFilter() {
      this.appliedStartDate = this.startDate
      this.appliedEndDate = this.endDate
      this.filterApplied++ // เพิ่ม counter เพื่อบอก chart ว่าผู้ใช้กด apply
      this.emitChange()
    },

    emitChange() {
      this.$emit("filter-changed", {
        start: this.startDate,
        end: this.endDate
      })
    }
  }
}
</script>

<style scoped>
.text-uppercase { letter-spacing: 0.5px; font-size: 0.75rem; }
.chart-area { min-height: 400px; background-color: #f8f9fa; }

.filter-row {
  overflow-x: auto;
  flex-wrap: nowrap !important;
}

.filter-row .form-control-sm,
.filter-row .form-select-sm {
  max-width: 110px;
  min-width: 80px;
}

.filter-row select {
  max-width: 60px;
  min-width: 50px;
}
</style>
