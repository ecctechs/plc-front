<template>
  <div class="card p-4 shadow-sm border-0">
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
      <div>
        <h5 class="mb-1 text-primary fw-bold">
          <i class="bi bi-clock-history me-2"></i>ประวัติการแจ้งเตือน
        </h5>
        <p class="text-muted small mb-0">แสดงประวัติเหตุการณ์ TRIGGER และ RECOVERY จากระบบ PLC ทั้งหมด</p>
      </div>
      
      <div class="d-flex flex-wrap gap-2 align-items-end">
        <div class="filter-group">
          <label class="form-label small fw-bold">จากวันที่</label>
          <input type="date" v-model="filter.startDate" class="form-control form-control-sm">
        </div>
        <div class="filter-group">
          <label class="form-label small fw-bold">ถึงวันที่</label>
          <input type="date" v-model="filter.endDate" class="form-control form-control-sm">
        </div>
        <button @click="fetchHistory" :disabled="loading" class="btn btn-primary btn-sm px-4">
          <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-search me-1"></i> ค้นหา
        </button>
      </div>
    </div>

    <div class="table-responsive rounded-3 border">
      <table class="table table-striped table-hover align-middle mb-0">
        <thead class="table-dark">
          <tr>
            <th class="ps-3">Device Name</th>
            <th>Alarm Name</th>
            <th class="text-center">Condition</th>
            <th class="text-center">Threshold</th>
            <th class="text-center">Actual Value</th> 
            <th class="text-center">Event Type</th>
            <th class="pe-3">Time Stamp</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
            </td>
          </tr>

          <tr v-for="item in history" :key="item.id" v-else-if="history.length > 0">
            <td class="ps-3"><strong>{{ item.device?.name || 'Unknown Device' }}</strong></td>
            <td>{{ item.rule?.name || 'N/A' }}</td>
            <td class="text-center">
              <span class="badge bg-light text-dark border fw-normal">{{ item.rule?.condition_type }}</span>
            </td>
            
            <td class="text-center fw-bold text-primary">
              <span v-if="item.rule?.condition_type === 'EXACT'">= {{ item.rule?.min_value }}</span>
              <span v-else-if="item.rule?.condition_type === 'BTW'">{{ item.rule?.min_value }} - {{ item.rule?.max_value }}</span>
              <span v-else-if="item.rule?.condition_type === 'MT'">&gt; {{ item.rule?.min_value }}</span>
              <span v-else-if="item.rule?.condition_type === 'MTE'">&ge; {{ item.rule?.min_value }}</span>
              <span v-else-if="item.rule?.condition_type === 'LT'">&lt; {{ item.rule?.max_value || item.rule?.min_value }}</span>
              <span v-else-if="item.rule?.condition_type === 'LTE'">&le; {{ item.rule?.max_value || item.rule?.min_value }}</span>
              <span v-else>-</span>
            </td>

            <td class="text-center">
              <a href="#" @click.prevent="openChart(item)" class="text-decoration-none d-inline-block cursor-pointer">
                <span :class="item.event_type === 'TRIGGER' ? 'text-danger fw-bold fs-5' : 'text-success fw-bold fs-5'">
                  {{ item.value }}
                </span>
              </a>
            </td>

            <td class="text-center">
              <span v-if="item.event_type === 'TRIGGER'" class="text-danger fw-bold">
                <i class="bi bi-exclamation-triangle-fill"></i> TRIGGER
              </span>
              <span v-else class="text-success fw-bold">
                <i class="bi bi-check-circle-fill"></i> RECOVERY
              </span>
            </td>

            <td class="pe-3 text-muted small">{{ formatDate(item.created_at) }}</td>
          </tr>

          <tr v-else>
            <td colspan="7" class="text-center py-5 text-muted">
              ไม่พบประวัติการแจ้งเตือนในช่วงวันที่เลือก
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Chart Modal -->
    <div v-if="showChart" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header">
            <h5 class="modal-title">Chart : {{ selectedDevice?.label }}</h5>
            <button class="btn-close" @click="closeChart"></button>
          </div>
          <div class="modal-body text-center">
            <Chart
              v-if="selectedDevice"
              :device="selectedDevice"
              :initial-start="chartStartDate"
              :initial-end="chartEndDate"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Chart from './Chart.vue';
export default {
  components: { Chart },
  props: ['devices'],
  data() {
    return {
      history: [],
      loading: false,
      showChart: false,
      selectedDevice: null,
      chartStartDate: null,
      chartEndDate: null,
      filter: {
        // ตั้งค่าเริ่มต้นเป็นวันที่ปัจจุบัน
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      }
    }
  },
  mounted() {
    // โหลดข้อมูลทั้งหมดทันทีเมื่อหน้าจอเปิดขึ้นมา
    this.fetchHistory();
  },
  methods: {
    openChart(item) {
      const addressId = item.rule?.address_id || item.address_id;

      const foundAddress = this.devices.find(d => {
        const value = d._custom?.value || d;
        return Number(value.address_id) === Number(addressId);
      });

      if (!foundAddress) {
        console.warn('Address ID not found:', addressId);
        return;
      }

      const device = foundAddress._custom?.value || foundAddress;

      // 🔥 คำนวณ 20 จุดก่อน + หลัง
      const eventTime = new Date(item.created_at);
      const windowMs = device.refresh_rate_ms * 20;

      const start = new Date(eventTime.getTime() - windowMs);
      const end = new Date(eventTime.getTime() + windowMs);

      this.selectedDevice = device;

      // ✅ ส่ง start/end ไปด้วย
      this.chartStartDate = start.toISOString().slice(0,16);
      this.chartEndDate = end.toISOString().slice(0,16);

      this.showChart = true;
    },
    closeChart() {
      this.showChart = false;
      this.selectedDevice = null;
    },

    async fetchHistory() {
      this.loading = true;
      const BASE_API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      
      try {
        // ✅ เปลี่ยน URL ไปใช้ Endpoint "all" เพื่อดูภาพรวมทุกเครื่อง
        const url = `${BASE_API}/api/events/all?start=${this.filter.startDate}&end=${this.filter.endDate}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch alarm history');
        
        // รับข้อมูล JSON (Array) ที่เรา Format ไว้ใน Controller
        this.history = await res.json();
      } catch (err) {
        console.error("Fetch history error:", err);
        // สามารถเพิ่มการแจ้งเตือน Error บน UI ได้ที่นี่
      } finally {
        this.loading = false;
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return "-";
      const date = new Date(dateStr);
      return date.toLocaleString('th-TH', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
  }
}
</script>

<style scoped>
.table thead th { font-size: 0.8rem; letter-spacing: 0.5px; }
.text-danger { color: #dc3545 !important; }
.text-success { color: #198754 !important; }
.fs-5 { font-size: 1.1rem !important; }
.filter-group input { min-width: 150px; }
</style>