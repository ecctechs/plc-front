<template>
  <div class="card p-3 shadow-sm">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0 text-primary"><i class="bi bi-clock-history"></i> ประวัติการแจ้งเตือน</h5>
      
      <div class="d-flex gap-2 align-items-end">
        <div class="filter-group">
          <label class="form-label small fw-bold">จากวันที่</label>
          <input type="date" v-model="filter.startDate" class="form-control form-control-sm">
        </div>
        <div class="filter-group">
          <label class="form-label small fw-bold">ถึงวันที่</label>
          <input type="date" v-model="filter.endDate" class="form-control form-control-sm">
        </div>
        <button @click="fetchHistory" class="btn btn-primary btn-sm px-3">
          <i class="bi bi-search"></i> ค้นหา
        </button>
      </div>
    </div>

    <div class="table-responsive">
      <table class="table table-striped table-hover align-middle">
        <thead class="table-dark">
          <tr>
            <th>Device Name</th>
            <th>Rule Name</th>
            <th>Condition Type</th>
            <th>Value</th>
            <th>Threshold Value</th> <th>Event Type</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in history" :key="item.id">
            <td><strong>{{ item.device?.name }}</strong></td>
            <td>{{ item.rule?.name }}</td>
            <td>
              <span class="badge bg-light text-dark border">{{ item.rule?.condition_type }}</span>
            </td>
             <td>
              <span>{{ item.value }}</span>
            </td>
            <td>
              <div v-if="item.rule?.condition_type === 'BETWEEN'">
                {{ item.rule?.min_value }} - {{ item.rule?.max_value }}
              </div>
              <div v-else-if="item.rule?.condition_type === 'MTE'">
                &ge; {{ item.rule?.min_value }}
              </div>
              <div v-else-if="item.rule?.condition_type === 'LTE'">
                &le; {{ item.rule?.max_value }}
              </div>
              <div v-else>
                Min: {{ item.rule?.min_value }} | Max: {{ item.rule?.max_value }}
              </div>
            </td>
            <td>
              <span :class="item.event_type === 'TRIGGER' ? 'badge bg-danger' : 'badge bg-success'">
                {{ item.event_type }}
              </span>
            </td>
            <td>{{ formatDate(item.created_at) }}</td>
          </tr>
          <tr v-if="history.length === 0">
            <td colspan="6" class="text-center py-5 text-muted">
              ไม่พบข้อมูลประวัติในช่วงวันที่เลือก
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  props: ['devices'],
  data() {
    return {
      history: [],
      filter: {
        // ตั้งค่า default เป็นวันที่ปัจจุบัน
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      }
    }
  },
  mounted() {
    if (this.devices && this.devices.length > 0) {
      this.fetchHistory();
    }
  },
  methods: {
    async fetchHistory() {
      if (!this.devices || this.devices.length === 0) return;
      
      // ดึง ID จาก device ตัวแรก หรือตัวที่ระบุ
      const deviceId = this.devices[0].id; 
      const BASE_API = import.meta.env.VITE_API_BASE_URL;
      
      try {
        const url = `${BASE_API}/api/devices/${deviceId}/alarms/events?start=${this.filter.startDate}&end=${this.filter.endDate}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response was not ok');
        this.history = await res.json();
      } catch (err) {
        console.error("Fetch error:", err);
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return "-";
      const date = new Date(dateStr);
      return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  }
}
</script>

<style scoped>
.badge { font-weight: 500; }
.table thead th { font-weight: 600; text-transform: uppercase; font-size: 0.85rem; }
</style>