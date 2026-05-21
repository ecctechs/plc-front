<template>
  <div class="container-fluid mt-4">

    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
      <div>
        <h3 class="page-title">
          <i class="bi bi-clock-history page-title-icon me-2"></i>{{ locale.t('Alarm History') }}
        </h3>
        <p class="page-title-subtitle mb-0">
          {{ locale.t('Show TRIGGER and RECOVERY events from PLC system') }}
        </p>
      </div>

      <div class="d-flex flex-wrap gap-2 align-items-end justify-content-start justify-content-md-end">
        <div class="filter-group">
          <label class="form-label small fw-bold text-secondary">{{ locale.t('Device') }} Name</label>
          <input type="text" v-model="filter.deviceName" :placeholder="locale.t('Search') + ' ' + locale.t('Device') + ' Name'" class="form-control form-control-sm shadow-sm">
        </div>
        <div class="filter-group">
          <label class="form-label small fw-bold text-secondary">{{ locale.t('Room') }} Name</label>
          <select v-model="filter.room" class="form-select form-select-sm shadow-sm">
            <option value="">{{ locale.t('All Rooms') }}</option>
            <option v-for="room in rooms" :key="room.id" :value="room.name">
              {{ room.name }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label class="form-label small fw-bold text-secondary">{{ locale.t('From date') }}</label>
          <input type="date" v-model="filter.startDate" class="form-control form-control-sm shadow-sm">
        </div>
        <div class="filter-group">
          <label class="form-label small fw-bold text-secondary">{{ locale.t('To date') }}</label>
          <input type="date" v-model="filter.endDate" class="form-control form-control-sm shadow-sm">
        </div>
        <button @click="fetchHistory" :disabled="loading" class="btn btn-primary btn-sm px-4 shadow-sm fw-bold">
          <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-search me-1"></i> {{ locale.t('Search') }}
        </button>
        <button v-if="canExport" @click="exportCSV" class="btn btn-success btn-sm px-4 shadow-sm fw-bold">
          <i class="bi bi-download me-1"></i> {{ locale.t('Export') }}
        </button>
      </div>
    </div>

    <!-- Section 1: Summary Cards -->
    <div v-if="history.length > 0">
      <div class="section-label mb-3">
        <i class="bi bi-speedometer2 me-2"></i>{{ locale.t('Overview') }}
      </div>
      <div class="row g-3 mb-5">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm rounded-3 h-100 stat-card stat-danger">
            <div class="card-body text-center py-4">
              <div class="stat-icon mb-2"><i class="bi bi-clock-history"></i></div>
              <div class="fs-2 fw-bold text-danger">{{ (downtimeSummary.total_downtime_sec / 60).toFixed(2) }}</div>
              <div class="text-muted small mt-1">{{ locale.t('Total Downtime') }} ({{ locale.t('min') }})</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm rounded-3 h-100 stat-card stat-warning">
            <div class="card-body text-center py-4">
              <div class="stat-icon mb-2"><i class="bi bi-exclamation-triangle"></i></div>
              <div class="fs-2 fw-bold text-warning">{{ downtimeSummary.total_alarms }}</div>
              <div class="text-muted small mt-1">{{ locale.t('Total Alarms') }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm rounded-3 h-100 stat-card stat-info">
            <div class="card-body text-center py-4">
              <div class="stat-icon mb-2"><i class="bi bi-arrow-repeat"></i></div>
              <div class="fs-2 fw-bold text-info">{{ downtimeSummary.avg_mttr }}</div>
              <div class="text-muted small mt-1">{{ locale.t('Avg MTTR (min)') }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm rounded-3 h-100 stat-card stat-primary">
            <div class="card-body text-center py-4">
              <div class="stat-icon mb-2"><i class="bi bi-cpu"></i></div>
              <div class="fs-2 fw-bold text-primary">{{ downtimeSummary.affected_devices }}</div>
              <div class="text-muted small mt-1">{{ locale.t('Affected Devices') }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Top 5 + Chart -->
    <div v-if="top5.length > 0">
      <div class="section-label mb-3">
        <i class="bi bi-bar-chart-line me-2"></i>{{ locale.t('Analysis') }}
      </div>
      <div class="row g-4 mb-5">
        <div class="col-12 col-lg-4">
          <div class="card border-0 shadow-sm rounded-3 h-100">
            <div class="card-header bg-white fw-bold py-3 border-bottom-0">
              <i class="bi bi-trophy-fill text-warning me-2"></i>{{ locale.t('Top 5 Most Problematic Devices') }}
            </div>
            <div class="card-body p-0">
              <div
                v-for="(item, idx) in top5"
                :key="idx"
                class="d-flex align-items-center px-4 py-3"
                :class="{ 'border-bottom': idx < top5.length - 1 }"
              >
                <span class="rank-badge me-3"
                  :class="idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other'"
                >{{ idx + 1 }}</span>
                <div class="flex-grow-1">
                  <div class="fw-bold text-dark small">{{ item.device_name }}</div>
                  <div class="text-muted" style="font-size:0.75rem">{{ item.room_name || '-' }}</div>
                </div>
                <div class="text-end">
                  <div class="fw-bold text-danger small">{{ formatDuration(item.total_sec) }}</div>
                  <div class="text-muted" style="font-size:0.75rem">{{ item.count }} {{ locale.t('times') }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-8">
          <AlarmHistoryChart />
        </div>
      </div>
    </div>
    <div v-else class="mb-5">
      <div class="section-label mb-3">
        <i class="bi bi-bar-chart-line me-2"></i>{{ locale.t('Analysis') }}
      </div>
      <AlarmHistoryChart />
    </div>

    <!-- Section 3: Alarm Table -->
    <div class="section-label mb-3">
      <i class="bi bi-table me-2"></i>{{ locale.t('Alarm Log') }}
    </div>
    <div class="table-responsive rounded-3 border shadow-sm">
      <table class="table table-hover align-middle mb-0">
         <thead class="table-blue">
          <tr>
            <th class="ps-3 py-3 border-0">{{ locale.t('Device') }} Name</th>
            <th class="py-3 border-0">{{ locale.t('Alarm') }} Name</th>
            <th class="py-3 text-center border-0">{{ locale.t('Room') }} Name</th>
            <th class="py-3 text-center border-0">{{ locale.t('Threshold') }}</th>
            <th class="py-3 text-center border-0">{{ locale.t('Actual Value') }}</th>
            <th class="py-3 text-center border-0">{{ locale.t('Event Type') }}</th>
            <th class="py-3 text-center border-0">{{ locale.t('Duration (min)') }}</th>
            <th class="py-3 border-0">{{ locale.t('Time Stamp') }}</th>
          </tr>
        </thead>
        <tbody>
            <tr v-if="loading">
              <td colspan="8" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="text-muted mt-2 mb-0">{{ locale.t('Loading...') }}</p>
            </td>
          </tr>

          <tr v-for="item in paginatedHistory" :key="item.id" v-else-if="filteredHistory.length > 0">
            <td class="ps-3">
              <div class="fw-bold text-dark">{{ item.device?.name || 'Unknown' }}</div>
            </td>
            <td>{{ item.rule?.name || 'N/A' }}</td>

            <td class="text-center">
              <span class="badge bg-light text-dark border fw-normal px-2">
                {{ item.device.room?.name || '-' }}
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
                    <i class="bi bi-graph-up"></i> {{ locale.t('View Chart') }}
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

            <td class="text-center">
              <span v-if="item.event_type === 'TRIGGER' && item.duration_sec != null"
                    class="badge bg-warning text-dark">
                {{ formatDuration(item.duration_sec) }}
              </span>
              <span v-else class="text-muted">—</span>
            </td>
            <td class="pe-3 text-muted small">
              {{ formatDate(item.created_at) }}
            </td>
          </tr>

<tr v-else>
              <td colspan="8" class="text-center py-5">
              <div class="py-4">
                <i class="bi bi-database-exclamation fs-1 text-muted opacity-50"></i>
                <p class="text-muted mt-2">{{ locale.t('No alarm history found in selected date range') }}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="filteredHistory.length > 0" class="d-flex flex-column flex-md-row justify-content-between align-items-center mt-4 gap-3 px-2">
      <div class="text-muted small">
        {{ locale.t('Showing') }} <strong>{{ startIndex + 1 }}</strong> {{ locale.t('to') }} <strong>{{ Math.min(endIndex, filteredHistory.length) }}</strong> {{ locale.t('of') }} <strong>{{ filteredHistory.length }}</strong> {{ locale.t('entries') }}
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

    <div v-if="showChart" class="modal fade show d-block modal-backdrop-custom" tabindex="-1">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title modal-title-custom fw-bold">
              <i class="bi bi-graph-up modal-icon-custom me-2"></i>กราฟประวัติเหตุการณ์: {{ selectedDevice?.label }}
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
                :event-type="selectedEventType"
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
import AlarmHistoryChart from '../components/chart/AlarmHistoryChart.vue'

export default {
  components: { Chart, AlarmHistoryChart },
  
  inject: ['locale'],
  
  props: {
    devices: { type: Array, default: () => [] },
    userRole: { type: String, default: '' },
    allowedRoomIds: { type: Array, default: null },
    canExport: { type: Boolean, default: false },
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
      selectedEventType: null,
      currentPage: 1,
      itemsPerPage: 20,
      rooms: [],
      downtimeSummary: {
        total_downtime_sec: 0,
        total_alarms: 0,
        avg_mttr: 0,
        affected_devices: 0
      },
      top5: [],
      filter: {
        deviceName: "",
        room: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      }
    }
  },

  computed: {
   filteredHistory() {
      let result = this.history;

      if (this.allowedRoomIds !== null) {
        result = result.filter(item => {
          const roomId = item.device?.room?.id
          return roomId != null && this.allowedRoomIds.includes(roomId)
        });
      }

      if (this.filter.deviceName) {
        const search = this.filter.deviceName.toLowerCase();
        result = result.filter(item => {
          const deviceName = item.device?.name || '';
          return deviceName.toLowerCase().includes(search);
        });
      }

      if (this.filter.room) {
        result = result.filter(item => {
          const currentRoomName = item.device?.room?.name || item.device?.room_name;
          return currentRoomName === this.filter.room;
        });
      }

      return result;
    },
    totalPages() {
      return Math.ceil(this.filteredHistory.length / this.itemsPerPage) || 1;
    },
    startIndex() {
      return (this.currentPage - 1) * this.itemsPerPage;
    },
    endIndex() {
      return this.startIndex + this.itemsPerPage;
    },
    paginatedHistory() {
      return this.filteredHistory.slice(this.startIndex, this.endIndex);
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
    this.loadRooms()
  },

  methods: {
    async fetchHistory() {
      this.loading = true;
      this.currentPage = 1;
      const BASE_API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

      try {
        const url = `${BASE_API}/api/events/all?start=${this.filter.startDate}&end=${this.filter.endDate}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        if (!res.ok) throw new Error('API Error');
        this.history = await res.json();
        this.fetchDowntimeSummary();
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
      this.selectedEventType = item.event_type;
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
    },

    fetchDowntimeSummary() {
      const now        = new Date()
      const triggers   = this.history.filter(e => e.event_type === 'TRIGGER')
      const recoveries = this.history.filter(e => e.event_type === 'RECOVER')

      // group by alarm_rule_id (ตรงกับ backend) ถ้าไม่มีให้ fallback address_id
      const getKey = e => e.alarm_rule_id ?? e.address_id

      const pairs = triggers.map(trg => {
        const rec = recoveries
          .filter(r =>
            getKey(r) === getKey(trg) &&
            new Date(r.created_at) > new Date(trg.created_at)
          )
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0]

        const triggerTime = new Date(trg.created_at)
        const endMs = rec ? new Date(rec.created_at) : now  // unresolved → นับถึง now
        const diffMs = endMs - triggerTime

        return {
          address_id:   trg.address_id,
          device_name:  trg.device?.name,
          room_name:    trg.device?.room?.name,
          trigger_at:   trg.created_at,
          resolved:     !!rec,
          duration_sec: Math.floor(diffMs / 1000),
          duration_min: (diffMs / 60000).toFixed(1)
        }
      })

      this.downtimeSummary = {
        total_downtime_sec: pairs.reduce((s, p) => s + (p.duration_sec || 0), 0),
        total_alarms:       triggers.length,
        avg_mttr:           (() => {
                              const res = pairs.filter(p => p.resolved)
                              return res.length
                                ? (res.reduce((s, p) => s + parseFloat(p.duration_min), 0) / res.length).toFixed(1)
                                : 0
                            })(),
        affected_devices:   new Set(triggers.map(t => t.address_id)).size,
      }

      const byDevice = {}
      pairs.forEach(p => {
        if (!byDevice[p.address_id]) {
          byDevice[p.address_id] = { device_name: p.device_name, room_name: p.room_name, total_sec: 0, count: 0 }
        }
        byDevice[p.address_id].total_sec += (p.duration_sec || 0)
        byDevice[p.address_id].count++
      })
      this.top5 = Object.values(byDevice)
        .sort((a, b) => b.total_sec - a.total_sec)
        .slice(0, 5)

      this.history = this.history.map(item => {
        if (item.event_type !== 'TRIGGER') return item
        const pair = pairs.find(p =>
          p.address_id === item.address_id &&
          p.trigger_at === item.created_at
        )
        return { ...item, duration_min: pair?.duration_min || null, duration_sec: pair?.duration_sec ?? null }
      })
    },

    formatDuration(sec) {
      if (sec == null) return '—'
      if (sec < 60) return `${sec} วิ`
      const m = Math.floor(sec / 60)
      const s = sec % 60
      return s > 0 ? `${m} นาที ${s} วิ` : `${m} นาที`
    },

    exportCSV() {
      const headers = ['Device Name', 'Alarm Name', 'Room', 'Event Type', 'Value', 'Duration (min)', 'Timestamp']
      const rows = this.filteredHistory.map(item => [
        item.device?.name || '',
        item.rule?.name || '',
        item.device?.room?.name || '',
        item.event_type || '',
        item.value ?? '',
        item.duration_min ?? '',
        this.formatDate(item.created_at)
      ])
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `alarm-history-${this.filter.startDate}-${this.filter.endDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },

    async loadRooms() {
      const BASE_API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      try {
        const res = await fetch(`${BASE_API}/api/rooms`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const data = await res.json();
        const allRooms = data.data || [];
        this.rooms = this.allowedRoomIds !== null
          ? allRooms.filter(r => this.allowedRoomIds.includes(r.id))
          : allRooms;
      } catch (err) {
        console.error("Load rooms error:", err);
      }
    }
  }
}
</script>

<style scoped>
.section-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 4px;
}
.section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
  margin-left: 8px;
}

.stat-card {
  border-top: 3px solid transparent !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.08) !important;
}
.stat-danger  { border-top-color: #ef4444 !important; }
.stat-warning { border-top-color: #f59e0b !important; }
.stat-info    { border-top-color: #0ea5e9 !important; }
.stat-primary { border-top-color: #3b82f6 !important; }

.stat-icon {
  font-size: 1.25rem;
  opacity: 0.35;
}

.rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.rank-1    { background: #fef2f2; color: #ef4444; border: 2px solid #ef4444; }
.rank-2    { background: #fffbeb; color: #d97706; border: 2px solid #f59e0b; }
.rank-3    { background: #f0f9ff; color: #0284c7; border: 2px solid #0ea5e9; }
.rank-other { background: #f8fafc; color: #64748b; border: 2px solid #cbd5e1; }
</style>