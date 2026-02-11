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

      <DashboardLayout
        v-if="tab === 'dashboard'"
        :devices="dashboard"
        :dashboard-cards="dashboardCards"
        @add-card="onAddCard"
      />

      <Setting
        v-if="tab === 'setting'"
        :devices="dashboard"
        @add-device="reloadDevices"
      />

      <Demo
        v-if="tab === 'demo'"
        :devices="dashboard"
        :is-simulate="isSimulate"
        :auto-timers="autoTimers"
        @update:is-simulate="isSimulate = $event"
        @update-device="handleDeviceUpdate"
        @toggle-auto="handleToggleAuto"
      />

      <AlarmHistory
        v-if="tab === 'alarmhistory'"
        :devices="dashboard"
      />
    </div>
  </div>
</template>

<script>
import DashboardLayout from "./views/DashboardLayout.vue";
import Setting from "./views/Setting.vue";
import Demo from "./views/Demo.vue";
import AlarmHistory from "./views/AlarmHistory.vue";

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "App",
  components: { DashboardLayout, Setting, Demo, AlarmHistory },

  data() {
    return {
      tab: "dashboard",
      dashboard: [],
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
        const res = await fetch(`${BASE_API}/api/dashboard/cards`);
        const data = await res.json();

        this.dashboard = data.map(newAddr => {
          // หาข้อมูลเดิมที่อยู่ในเครื่องตอนนี้
          const existing = this.dashboard.find(ex => ex.address_id === newAddr.address_id);

          if (this.isSimulate && existing) {
            return existing; 
          }

          // ⭐ จุดสำคัญ: ถ้ามีข้อมูลเดิม ให้ดึงค่า expand กลับมาใส่ในข้อมูลใหม่ด้วย
          return {
            ...newAddr,
            expand: existing ? existing.expand : false // รักษาค่า expand เดิมไว้
          };
        });
      } catch (err) {
        console.error("Failed to load devices:", err);
      }
    },
    async onAddCard() {
      await this.loadDevices();
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

      const device = this.dashboard.find(d => d.address_id === id);
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
      const idx = this.dashboard.findIndex(d => d.address_id === payload.address_id);
      if (idx !== -1) {
        this.dashboard.splice(idx, 1, {
          ...this.dashboard[idx],
          last_value: payload.value,
          is_connected: this.isSimulate ? true : this.dashboard[idx].is_connected,
          updated_at: new Date().toISOString()
        });
      }
    },

    async reloadDevices() {
      await this.loadDevices();
      await this.loadPopup();
      this.tab = "dashboard";
    },
  }
};
</script>