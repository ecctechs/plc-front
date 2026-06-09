<template>
  <div class="card shadow-sm">
    <div class="card-body p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="fw-bold m-0">
          <i class="bi bi-person-badge text-primary me-2"></i>Device Setting
        </h5>
        <button class="btn btn-primary" @click="$emit('add')">
          <i class="fa-solid fa-plus me-1"></i> {{ locale.t('Add Device') }}
        </button>
      </div>

      <!-- Filters -->
      <div class="row g-3 mb-4">
        <div class="col-md-5">
          <input 
            v-model="filters.deviceName" 
            type="text" 
            class="form-control" 
            :placeholder="locale.t('Search') + ' by Device Name...'"
            @input="applyFilters"
          />
        </div>
        <div class="col-md-4">
          <select v-model="filters.roomName" class="form-select" @change="applyFilters">
            <option value="">{{ locale.t('All Rooms') }}</option>
            <option v-for="room in rooms" :key="room.id" :value="room.name">
              {{ room.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Device Table -->
      <div class="table-responsive rounded-3 border shadow-sm">
        <table class="table table-hover align-middle mb-0">
           <thead class="table-blue">
            <tr>
              <th class="ps-3 py-3">{{ locale.t('Device') }} Name</th>
              <th class="py-3">{{ locale.t('Label') }} Name</th>
              <th class="py-3 text-center">Display Type</th>
              <th class="py-3">{{ locale.t('Address') }}</th>
              <th class="py-3">{{ locale.t('Room') }} Name</th>
              <th class="py-3 text-center">{{ locale.t('Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="device in paginatedDevices" :key="device.id">
              <tr v-for="(addr, index) in device.addresses" :key="addr.id">
                <td :rowspan="device.addresses.length" v-if="index === 0" class="fw-bold ps-3">
                  {{ device.name }}
                </td>
                <td>{{ addr.label }}</td>
                <td class="text-center">
                  <span class="badge" :class="getDisplayTypeClass(addr.data_type)">
                    {{ getDisplayTypeLabel(addr.data_type) }}
                  </span>
                </td>
                <td>{{ addr.plc_address }}</td>
                <td>{{ device.room_name }}</td>
                <td class="text-center">
                  <template v-if="index === 0">
                    <button class="btn btn-sm btn-outline-primary me-1" @click="openEditModal(device)">
                      <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(device)">
                      <i class="fa-solid fa-trash-alt"></i>
                    </button>
                  </template>
                </td>
              </tr>
            </template>
            <tr v-if="paginatedDevices.length === 0">
              <td colspan="6" class="text-center text-muted py-4">
                {{ locale.t('No devices found.') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="d-flex align-items-center mt-3">
        <div class="d-flex align-items-center">
          <span class="text-muted small me-2">{{ locale.t('Show') }}</span>
          <select v-model="itemsPerPage" class="form-select form-select-sm" style="width: auto;" @change="applyFilters">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          <span class="text-muted small ms-2">{{ locale.t('entries') }}</span>
        </div>
        <div class="flex-grow-1 d-flex justify-content-center">
          <nav v-if="totalPages > 1">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" :class="{ disabled: currentPage === 1 }">
                <a class="page-link" href="#" @click.prevent="currentPage--">&laquo;</a>
              </li>
              <li class="page-item" v-for="page in visiblePages" :key="page" :class="{ active: currentPage === page }">
                <a class="page-link" href="#" @click.prevent="currentPage = page">{{ page }}</a>
              </li>
              <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                <a class="page-link" href="#" @click.prevent="currentPage++">&raquo;</a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { showAlert, showConfirm } from "../../utils/swalHelper";

const BASE_API = import.meta.env.VITE_API_BASE_URL;
const authH = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

export default {
  name: "DeviceSetting",
  
  inject: ['locale'],
  
  data() {
    return {
      devices: [],
      rooms: [],
      filters: {
        deviceName: "",
        roomName: ""
      },
      currentPage: 1,
      itemsPerPage: 10
    };
  },
  computed: {
    filteredDevices() {
      let result = this.devices;
      
      if (this.filters.deviceName) {
        const search = this.filters.deviceName.toLowerCase();
        result = result.filter(d => d.name.toLowerCase().includes(search));
      }
      
      if (this.filters.roomName) {
        result = result.filter(d => d.room_name === this.filters.roomName);
      }
      
      return result;
    },
    totalPages() {
      return Math.ceil(this.filteredDevices.length / this.itemsPerPage);
    },
    paginatedDevices() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.filteredDevices.slice(start, end);
    },
    visiblePages() {
      const pages = [];
      const total = this.totalPages;
      const current = this.currentPage;
      
      if (total <= 5) {
        for (let i = 1; i <= total; i++) pages.push(i);
      } else {
        if (current <= 3) {
          pages.push(1, 2, 3, 4, 5);
        } else if (current >= total - 2) {
          for (let i = total - 4; i <= total; i++) pages.push(i);
        } else {
          for (let i = current - 2; i <= current + 2; i++) pages.push(i);
        }
      }
      
      return pages;
    }
  },
  mounted() {
    this.loadData();
  },
  methods: {
    async loadData() {
      await Promise.all([
        this.loadDevices(),
        this.loadRooms()
      ]);
    },
    
    async loadDevices() {
      try {
        const res = await fetch(`${BASE_API}/api/devices?is_active=true`, { headers: authH() });
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        const devices = json.data || json;
        console.log("Loaded devices:", devices);
        this.devices = devices.map(d => ({
          ...d,
          device_type_id: d.device_type?.id || d.device_type_id,
          device_type_obj: d.device_type,
          room_id: d.room?.id || d.room_id,
          room_name: d.room?.name || null,
          addresses: d.addresses ? d.addresses.map(addr => ({
            ...addr,
            numberConfig: addr.number_config ? {
              scale: addr.number_config.scale || 1,
              offset: addr.number_config.offset || 0,
              decimal_places: addr.number_config.decimal_places || 0,
              unit: addr.number_config.unit || "",
              min_value: addr.number_config.min_value || 0,
              max_value: addr.number_config.max_value || 100
            } : { scale: 1, offset: 0, decimal_places: 0, unit: "", min_value: 0, max_value: 100 },
            levels: addr.level_config || [],
            alarms: d.alarms ? d.alarms.filter(a => a.address_id === addr.id).map(alarm => ({
              id: alarm.id,
              name: alarm.name,
              data_type: alarm.data_type,
              condition_type: alarm.condition_type,
              min_value: alarm.min_value,
              max_value: alarm.max_value,
              level_index: alarm.level_index,
              level_label: alarm.level_label,
              duration_sec: alarm.duration_sec,
              severity: alarm.severity,
              is_active: alarm.is_active,
              notify_email: alarm.notify_email || false,
              email_recipients: alarm.email_recipients || []
            })) : []
          })) : []
        }));
      } catch (err) {
        console.error(err);
      }
    },
    
    async loadRooms() {
      try {
        const res = await fetch(`${BASE_API}/api/rooms`, { headers: authH() });
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        this.rooms = json.data || [];
      } catch (err) {
        console.error(err);
      }
    },
    
    applyFilters() {
      this.currentPage = 1;
    },
    
    getDisplayTypeLabel(type) {
      const labels = {
        onoff: "ON/OFF",
        number: "Number",
        number_gauge: "Number Gauge",
        level: "Level"
      };
      return labels[type] || type;
    },
    
    getDisplayTypeClass(type) {
      const classes = {
        onoff: "bg-success",
        number: "bg-primary",
        number_gauge: "bg-info",
        level: "bg-warning"
      };
      return classes[type] || "bg-secondary";
    },
    
    openEditModal(device) {
      this.$emit('edit', device);
    },
    
    async confirmDelete(device) {
      const confirmed = await showConfirm(
        this.locale.current === 'th' ? 'ยืนยันการลบ' : 'Confirm Delete',
        this.locale.current === 'th' ? `คุณต้องการลบ Device "${device.name}" หรือไม่?` : `Delete device "${device.name}"?`,
        this.locale.current === 'th' ? 'ลบ' : 'Delete',
        this.locale.current === 'th' ? 'ยกเลิก' : 'Cancel'
      );
      
      if (confirmed) {
        try {
          const res = await fetch(`${BASE_API}/api/devices/${device.id}`, {
            method: "DELETE",
            headers: authH()
          });
          
          if (!res.ok) throw new Error("Delete failed");
          
          await showAlert(this.locale.current === 'th' ? 'สำเร็จ' : 'Success', this.locale.current === 'th' ? 'ลบ Device สำเร็จ' : 'Device deleted successfully', 'success');
          this.loadDevices();
        } catch (err) {
          console.error(err);
          await showAlert(this.locale.current === 'th' ? 'ข้อผิดพลาด' : 'Error', this.locale.current === 'th' ? 'ไม่สามารถลบ Device ได้' : 'Cannot delete device', 'error');
        }
      }
    }
  }
};
</script>

<style scoped>
</style>
