<template>
  <div class="container-fluid mt-4">
    <ul class="nav nav-tabs mb-3">
      <li class="nav-item" v-for="t in ['dashboard', 'setting', 'demo', 'alarmhistory']" :key="t">
        <button
          class="nav-link text-capitalize"
          :class="{ active: tab === t }"
          @click="tab = t"
        >
          {{ t === 'alarmhistory' ? 'Alarm History' : t }}
        </button>
      </li>
    </ul>

    <div class="tab-content">
      <Dashboard
        v-if="tab === 'dashboard'"
        :addresses="devices"
        :simulate="isSimulate"
      />

      <Setting
        v-if="tab === 'setting'"
        :devices="devices"
        @add-device="reloadDevices"
      />

      <Demo
        v-if="tab === 'demo'"
        :devices="devices"
        :is-simulate="isSimulate"
        :auto-timers="autoTimers"
        @update:is-simulate="isSimulate = $event"
        @update-device="handleDeviceUpdate"
        @toggle-auto="handleToggleAuto"
      />

      <AlarmHistory
        v-if="tab === 'alarmhistory'"
        :devices="devices"
      />
    </div>
  </div>
</template>

<script>
import Dashboard from "./views/Dashboard.vue";
import Setting from "./views/Setting.vue";
import Demo from "./views/Demo.vue";
import AlarmHistory from "./views/AlarmHistory.vue";

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "App",
  components: { Dashboard, Setting, Demo, AlarmHistory },

  data() {
    return {
      tab: "dashboard",
      devices: [],
      isSimulate: false,
      pollTimer: null,
      autoTimers: new Set() // เก็บ ID ของเครื่องที่กำลังรัน Auto
    };
  },

  async mounted() {
    await this.loadDevices();
    this.startPolling();
  },

  beforeUnmount() {
    this.stopPolling();
    this.stopAllAuto();
  },

  watch: {
    isSimulate(val) {
      if (val) {
        this.stopPolling();
      } else {
        this.stopAllAuto(); // ปิดจำลอง = ปิด auto ทั้งหมด
        this.startPolling();
      }
    }
  },

  methods: {
    startPolling() {
      if (!this.pollTimer) {
        this.pollTimer = setInterval(() => this.loadDevices(), 2000);
      }
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },
    async loadDevices() {
      try {
        const res = await fetch(`${BASE_API}/api/devices/addresses`);
        const data = await res.json();
        // ผสมข้อมูลเดิมที่มีอยู่ (ถ้ากำลัง Simulate อยู่)
        this.devices = data.map(d => {
          const existing = this.devices.find(ex => ex.address_id === d.address_id);
          return existing && this.isSimulate ? existing : d;
        });
      } catch (err) {
        console.error("Failed to load devices:", err);
      }
    },

    handleToggleAuto(device) {
      const id = device.address_id;
      if (this.autoTimers.has(id)) {
        this.autoTimers.delete(id);
      } else {
        this.autoTimers.add(id);
        this.runAutoCycle(id);
      }
    },

    runAutoCycle(id) {
      if (!this.autoTimers.has(id) || !this.isSimulate) return;

      const device = this.devices.find(d => d.address_id === id);
      if (!device) return;

      let newValue;
      const min = device.min ?? 0;
      const max = device.max ?? 100;

      if (device.data_type === 'onoff') {
        newValue = Math.random() > 0.5 ? 1 : 0;
      } else {
        newValue = +(min + Math.random() * (max - min)).toFixed(2);
      }

      this.handleDeviceUpdate({ address_id: id, value: newValue });

      // รันต่อไปเรื่อยๆ ทุก 2 วินาที
      setTimeout(() => this.runAutoCycle(id), 2000);
    },

    stopAllAuto() {
      this.autoTimers.clear();
    },

    handleDeviceUpdate(payload) {
      const idx = this.devices.findIndex(d => d.address_id === payload.address_id);
      if (idx !== -1) {
        this.devices.splice(idx, 1, {
          ...this.devices[idx],
          last_value: payload.value,
          is_connected: this.isSimulate ? true : this.devices[idx].is_connected,
          updated_at: new Date().toISOString()
        });
      }
    },

    async reloadDevices() {
      await this.loadDevices();
      this.tab = "dashboard";
    },
  }
};
</script>