<template>
  <div class="container-fluid py-4 bg-light min-vh-100">
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-3">
          <h4 class="fw-bold mb-0">Performance Analytics</h4>
          <select v-model="selectedDevice" class="form-select w-auto" @change="fetchData">
            <option value="Motor A">Motor A</option>
            <option value="Conveyor B">Conveyor B</option>
          </select>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-2">
          <div class="btn-group me-3">
            <button v-for="type in ['OnOff', 'Number', 'Level']" :key="type"
              :class="['btn btn-sm', dataType === type ? 'btn-dark' : 'btn-outline-dark']"
              @click="setDataType(type)">
              {{ type }}
            </button>
          </div>

          <div class="btn-group shadow-sm">
            <button v-for="p in periods" :key="p"
              :class="['btn btn-outline-primary', activePeriod === p ? 'active' : '']"
              @click="activePeriod = p">
              {{ p }}
            </button>
          </div>
          <button class="btn btn-primary shadow-sm ms-2" @click="fetchData">Refresh</button>
        </div>
      </div>
    </div>

    <div class="row g-4 mb-4">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm border-start border-success border-4 h-100">
          <div class="card-body">
            <h6 class="text-muted mb-2">Overall Performance</h6>
            <div class="d-flex align-items-baseline gap-2">
              <h2 class="fw-bold mb-0">82%</h2>
              <span class="badge bg-success-subtle text-success">⭐ GOOD</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body">
            <h6 class="text-muted mb-2">{{ summaryLabels.card2 }}</h6>
            <h2 class="fw-bold mb-0 text-primary">{{ summaryValues.card2 }}</h2>
            <small class="text-muted">Target: {{ targets.main }}</small>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm border-start border-danger border-4 h-100">
          <div class="card-body">
            <h6 class="text-muted mb-2">{{ summaryLabels.card3 }}</h6>
            <h2 class="fw-bold mb-0 text-danger">{{ summaryValues.card3 }}</h2>
            <small class="text-muted">{{ summaryLabels.card3Sub }}</small>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-8">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white border-0 pt-4 px-4 d-flex justify-content-between align-items-center">
            <h5 class="fw-bold mb-0">Trend Analysis ({{ dataType }})</h5>
            <span class="badge bg-light text-dark border">Granularity: Hour</span>
          </div>
          <div class="card-body p-4 text-center">
            <div class="chart-placeholder bg-light rounded d-flex align-items-end justify-content-center p-3">
               <div v-if="dataType === 'OnOff'" class="w-100 h-100 d-flex flex-column justify-content-center">
                  <div class="bg-success mb-1 w-100" style="height: 40px">ON</div>
                  <div class="bg-danger mb-1 w-100" style="height: 10px">OFF</div>
                  <div class="bg-success w-100" style="height: 40px">ON</div>
               </div>
               <div v-else class="text-muted">
                  [ {{ dataType }} Chart Visualization ]
               </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white border-0 pt-4 px-4">
            <h5 class="fw-bold mb-0">Breakdown</h5>
          </div>
          <div class="card-body p-4">
            <div v-for="item in breakdownData" :key="item.label" class="mb-4">
              <div class="d-flex justify-content-between mb-1">
                <span class="small">{{ item.label }}</span>
                <span class="small fw-bold">{{ item.value }}%</span>
              </div>
              <div class="progress" style="height: 8px;">
                <div :class="['progress-bar', item.color]" :style="{ width: item.value + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 text-end mt-2">
         <button class="btn btn-sm btn-outline-secondary mb-2" @click="exportData">Export to Excel</button>
      </div>
      <div class="col-12">
        <div class="card border-0 shadow-sm overflow-hidden mb-5">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 text-nowrap">
              <thead class="table-light text-muted small">
                <tr>
                  <th class="ps-4">TIMESTAMP</th>
                  <th>VALUE</th>
                  <th>STATUS</th>
                  <th class="text-end pe-4">ACTION</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in tableData" :key="idx">
                  <td class="ps-4 small text-muted">{{ row.time }}</td>
                  <td><code class="fw-bold fs-6">{{ row.value }}</code></td>
                  <td>
                    <span :class="['badge', row.statusClass]">{{ row.status }}</span>
                  </td>
                  <td class="text-end pe-4">
                    <button class="btn btn-sm btn-light border">Details</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Performance',
  // data: เก็บสถานะทั้งหมดของหน้า
  data() {
    return {
      selectedDevice: 'Motor A',
      activePeriod: 'Today',
      periods: ['Today', 'Week', 'Month', 'Custom'],
      dataType: 'Number', // 'OnOff' | 'Number' | 'Level'
      targets: { main: '1,000' },
      tableData: [
        { time: '2026-01-26 10:21:00', value: '1200', status: 'Over Target', statusClass: 'text-warning bg-warning-subtle' },
        { time: '2026-01-26 10:22:00', value: '980', status: 'Normal', statusClass: 'text-success bg-success-subtle' },
        { time: '2026-01-26 10:23:00', value: 'OFF', status: 'Downtime', statusClass: 'text-danger bg-danger-subtle' },
      ]
    }
  },
  
  // computed: คำนวณ UI Logic แยกตาม DataType
  computed: {
    summaryLabels() {
      if (this.dataType === 'OnOff') {
        return { card2: 'Uptime', card3: 'Downtime', card3Sub: '12 Stop counts today' };
      } else if (this.dataType === 'Level') {
        return { card2: 'High Level Ratio', card3: 'Low Level Alert', card3Sub: 'Below threshold 18%' };
      }
      return { card2: 'Average Value', card3: 'Efficiency', card3Sub: 'Based on target 1000' };
    },
    summaryValues() {
      if (this.dataType === 'OnOff') return { card2: '92.3%', card3: '38 min' };
      if (this.dataType === 'Level') return { card2: '65.0%', card3: '10.2%' };
      return { card2: '812', card3: '81.2%' };
    },
    breakdownData() {
      return [
        { label: 'High / Optimal', value: 65, color: 'bg-success' },
        { label: 'Medium / Warning', value: 25, color: 'bg-warning' },
        { label: 'Low / Critical', value: 10, color: 'bg-danger' }
      ];
    }
  },

  // methods: ฟังก์ชันการทำงาน
  methods: {
    setDataType(type) {
      this.dataType = type;
      // ในงานจริงอาจจะเรียก fetchData() ตรงนี้
    },
    fetchData() {
      console.log(`Fetching data for ${this.selectedDevice} in ${this.activePeriod} mode...`);
      // Logic สำหรับเรียก API
    },
    exportData() {
      alert('Exporting data to CSV...');
    }
  },
  
  // lifecycle
  mounted() {
    console.log('Performance Page Mounted');
  }
}
</script>

<style scoped>
.card { border-radius: 0.75rem; }
.progress { border-radius: 1rem; background-color: #f0f0f0; }
.chart-placeholder {
  min-height: 300px;
  border: 2px dashed #e9ecef;
}
.btn-group .btn {
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}
</style>