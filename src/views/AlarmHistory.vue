<template>
  <div class="container-fluid mt-4">

    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
      <div>
        <h3 class="mb-1 text-primary fw-bold d-flex align-items-center">
          <i class="bi bi-clock-history me-2"></i>ประวัติการแจ้งเตือน
        </h3>
        <p class="text-muted small mb-0">
          แสดงเหตุการณ์ TRIGGER และ RECOVERY จากระบบ PLC ทั้งหมด
        </p>
      </div>

      <div class="d-flex flex-wrap gap-2 align-items-end justify-content-start justify-content-md-end">
        <div class="filter-group">
          <label class="form-label small fw-bold text-secondary">จากวันที่</label>
          <input type="date" v-model="filter.startDate" class="form-control form-control-sm shadow-sm">
        </div>
        <div class="filter-group">
          <label class="form-label small fw-bold text-secondary">ถึงวันที่</label>
          <input type="date" v-model="filter.endDate" class="form-control form-control-sm shadow-sm">
        </div>
        <button @click="fetchHistory" :disabled="loading" class="btn btn-primary btn-sm px-4 shadow-sm fw-bold">
          <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-search me-1"></i> ค้นหา
        </button>
      </div>
    </div>

    <div class="table-responsive rounded-3 border shadow-sm">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-dark">
          <tr>
            <th class="ps-3 py-3 border-0">Device Name</th>
            <th class="py-3 border-0">Alarm Name</th>
            <th class="py-3 text-center border-0">Condition</th>
            <th class="py-3 text-center border-0">Threshold</th>
            <th class="py-3 text-center border-0">Actual Value</th>
            <th class="py-3 text-center border-0">Event Type</th>
            <th class="py-3 border-0">Time Stamp</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="text-muted mt-2 mb-0">กำลังโหลดข้อมูล...</p>
            </td>
          </tr>

          <tr v-for="item in paginatedHistory" :key="item.id" v-else-if="history.length > 0">
            <td class="ps-3">
              <div class="fw-bold text-dark">{{ item.device?.name || 'Unknown' }}</div>
              <!-- <div class="text-muted extra-small">ID: {{ item.device?.address_id || '-' }}</div> -->
            </td>
            <td>{{ item.rule?.name || 'N/A' }}</td>

            <td class="text-center">
              <span class="badge bg-light text-dark border fw-normal px-2">
                {{ item.rule?.condition_type }}
              </span>
            </td>

            <td class="text-center fw-bold text-primary">
              <span v-if="item.rule?.condition_type === 'EXACT'">= {{ item.rule?.min_value }}</span>
              <span v-else-if="item.rule?.condition_type === 'BTW'">
                {{ item.rule?.min_value }} - {{ item.rule?.max_value }}
              </span>
              <span v-else-if="item.rule?.condition_type === 'MT'">&gt; {{ item.rule?.min_value }}</span>
              <span v-else-if="item.rule?.condition_type === 'MTE'">&ge; {{ item.rule?.min_value }}</span>
              <span v-else-if="item.rule?.condition_type === 'LT'">
                &lt; {{ item.rule?.max_value || item.rule?.min_value }}
              </span>
              <span v-else-if="item.rule?.condition_type === 'LTE'">
                &le; {{ item.rule?.max_value || item.rule?.min_value }}
              </span>
              <span v-else>-</span>
            </td>

            <td class="text-center">
              <a href="#" @click.prevent="openChart(item)" class="chart-link text-decoration-none">
                <div class="d-flex flex-column align-items-center">
                  <span :class="item.event_type === 'TRIGGER' ? 'text-danger fw-bold fs-5' : 'text-success fw-bold fs-5'">
                    {{ item.value }}
                  </span>
                  <small class="view-chart-text text-muted">
                    <i class="bi bi-graph-up"></i> ดูกราฟ
                  </small>
                </div>
              </a>
            </td>

            <td class="text-center">
              <span v-if="item.event_type === 'TRIGGER'" class="badge bg-danger-soft text-danger fw-bold px-3">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> TRIGGER
              </span>
              <span v-else class="badge bg-success-soft text-success fw-bold px-3">
                <i class="bi bi-check-circle-fill me-1"></i> RECOVERY
              </span>
            </td>

            <td class="pe-3 text-muted small">
              {{ formatDate(item.created_at) }}
            </td>
          </tr>

          <tr v-else>
            <td colspan="7" class="text-center py-5">
              <div class="py-4">
                <i class="bi bi-database-exclamation fs-1 text-muted opacity-50"></i>
                <p class="text-muted mt-2">ไม่พบประวัติการแจ้งเตือนในช่วงวันที่เลือก</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="history.length > 0" class="d-flex flex-column flex-md-row justify-content-between align-items-center mt-4 gap-3 px-2">
      <div class="text-muted small">
        แสดง <strong>{{ startIndex + 1 }}</strong> ถึง <strong>{{ Math.min(endIndex, history.length) }}</strong> จากทั้งหมด <strong>{{ history.length }}</strong> รายการ
      </div>
      
      <nav aria-label="Page navigation">
        <ul class="pagination pagination-sm mb-0 custom-pagination">
          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button class="page-link" @click="currentPage = 1"><i class="bi bi-chevron-double-left"></i></button>
          </li>

          <li class="page-item" :class="{ disabled: currentPage === 1 }">
            <button class="page-link" @click="currentPage--"><i class="bi bi-chevron-left"></i></button>
          </li>

          <li v-if="visiblePages[0] > 1" class="page-item disabled">
            <span class="page-link">...</span>
          </li>

          <li v-for="page in visiblePages" :key="page" class="page-item" :class="{ active: currentPage === page }">
            <button class="page-link fw-bold" @click="currentPage = page">{{ page }}</button>
          </li>

          <li v-if="visiblePages[visiblePages.length - 1] < totalPages" class="page-item disabled">
            <span class="page-link">...</span>
          </li>

          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <button class="page-link" @click="currentPage++"><i class="bi bi-chevron-right"></i></button>
          </li>

          <li class="page-item" :class="{ disabled: currentPage === totalPages }">
            <button class="page-link" @click="currentPage = totalPages"><i class="bi bi-chevron-double-right"></i></button>
          </li>
        </ul>
      </nav>
    </div>

    <div v-if="showChart" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header bg-light">
            <h5 class="modal-title fw-bold text-dark">
              <i class="bi bi-graph-up text-primary me-2"></i>กราฟประวัติเหตุการณ์: {{ selectedDevice?.label }}
            </h5>
            <button type="button" class="btn-close" @click="closeChart"></button>
          </div>
          <div class="modal-body p-0">
            <div class="p-4">
              <Chart
                v-if="selectedDevice"
                :device="selectedDevice"
                :initial-start="chartStartDate"
                :initial-end="chartEndDate"
                :alarm-time="selectedAlarmTime" 
              />
            </div>
          </div>
          <div class="modal-footer bg-light border-0">
            <button type="button" class="btn btn-secondary px-4" @click="closeChart">ปิดหน้าต่าง</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import Chart from './Chart.vue'

export default {
  components: { Chart },
  props: {
    devices: { type: Array, default: () => [] }
  },
  data() {
    return {
      history: [],
      loading: false,
      showChart: false,
      selectedDevice: null,
      chartStartDate: null,
      chartEndDate: null,
      selectedAlarmTime: null,
      currentPage: 1,
      itemsPerPage: 20,
      filter: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      }
    }
  },

  computed: {
    totalPages() {
      return Math.ceil(this.history.length / this.itemsPerPage) || 1;
    },
    startIndex() {
      return (this.currentPage - 1) * this.itemsPerPage;
    },
    endIndex() {
      return this.startIndex + this.itemsPerPage;
    },
    paginatedHistory() {
      return this.history.slice(this.startIndex, this.endIndex);
    },
    visiblePages() {
      const range = 2; // Show 2 pages before and after current
      let start = Math.max(1, this.currentPage - range);
      let end = Math.min(this.totalPages, this.currentPage + range);
      
      // Adjust if at start or end of the list
      if (this.currentPage <= range) {
        end = Math.min(this.totalPages, range * 2 + 1);
      } else if (this.currentPage > this.totalPages - range) {
        start = Math.max(1, this.totalPages - range * 2);
      }

      const pages = [];
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    }
  },

  mounted() {
    this.fetchHistory()
  },

  methods: {
    async fetchHistory() {
      this.loading = true;
      this.currentPage = 1;
      const BASE_API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

      try {
        const url = `${BASE_API}/api/events/all?start=${this.filter.startDate}&end=${this.filter.endDate}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('API Error');
        this.history = await res.json();
      } catch (err) {
        console.error("Fetch history error:", err);
      } finally {
        this.loading = false;
      }
    },

    openChart(item) {
      const addressId = item.rule?.address_id || item.address_id;
      const foundAddress = this.devices.find(d => {
        const val = d._custom?.value || d;
        return Number(val.address_id) === Number(addressId);
      });

      if (!foundAddress) {
        alert("ไม่พบข้อมูล Device ในระบบปัจจุบัน");
        return;
      }

      const device = foundAddress._custom?.value || foundAddress;
      const eventTime = new Date(item.created_at);
      const offsetMs = Number(device.refresh_rate_ms || 1000) * 20;

      this.selectedDevice = device;
      this.chartStartDate = this.formatLocalDateTime(new Date(eventTime.getTime() - offsetMs));
      this.chartEndDate   = this.formatLocalDateTime(new Date(eventTime.getTime() + offsetMs));
      this.selectedAlarmTime = item.created_at;
      this.showChart = true;
    },

    formatLocalDateTime(date) {
      const pad = (n) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    },

    closeChart() {
      this.showChart = false;
      this.selectedDevice = null;
    },

    formatDate(dateStr) {
      if (!dateStr) return "-";
      return new Date(dateStr).toLocaleString('th-TH', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
  }
}
</script>

<style scoped>
/* Component-specific styles only */
/* Note: Shared styles are imported from src/assets/shared-styles.css */
</style>