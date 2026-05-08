<template>
 <Login v-if="!isAuthenticated" />
  <div v-else class="container-fluid mt-4">
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3">
      <ul class="nav nav-tabs mb-0">
        <li class="nav-item" v-for="t in ['dashboard', 'setting', 'oee', 'demo', 'alarmhistory' , 'interaction']" :key="t">
          <button
            class="nav-link text-capitalize"
            :class="{ active: tab === t }"
            @click="tab = t"
          >
            {{ locale.t(tabLabels[t]) }}
          </button>
        </li>
      </ul>

      <div class="d-flex align-items-center gap-2">
        <button
          class="btn btn-outline-secondary btn-sm"
          @click="locale.toggle()"
        >
          <i class="fas fa-globe"></i> {{ locale.current === 'th' ? 'TH' : 'EN' }}
        </button>
        
        <button
          class="btn btn-outline-danger btn-sm"
          @click="logout"
          title="Logout"
        >
          <i class="fas fa-right-from-bracket"></i>
        </button>
      </div>
    </div>

    <div class="tab-content">

      <DashboardLayout
        v-if="tab === 'dashboard'"
        :devices="dashboard"
        :dashboard-cards="dashboardCards"
        @add-card="onAddCard"
        @delete-card="onDeleteCard"
      />

       <Setting
         v-if="tab === 'setting'"
         :devices="dashboard"
         @add-device="reloadDevices"
       />

       <Oee
         v-if="tab === 'oee'"
       />

       <Demo
        v-if="tab === 'demo'"
        :devices="dashboard"
        :is-simulate="isSimulate"
        :is-run-all-random="isRunAllRandom"
        :auto-timers="autoTimers"
        @update:is-simulate="isSimulate = $event"
        @update-device="handleDeviceUpdate"
        @toggle-auto="handleToggleAuto"
        @toggle-run-all-random="toggleRunAllRandom"
      />

      <Interaction
        v-if="tab === 'interaction'"
        :devices="dashboard"
        :is-simulate="isSimulate"
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
import Oee from "./views/Oee.vue";
import Demo from "./views/Demo.vue";
import AlarmHistory from "./views/AlarmHistory.vue";
import Interaction from "./views/Interaction.vue";
import Login from "./views/Login.vue";

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "App",
  components: { DashboardLayout, Setting, Oee, Demo, AlarmHistory, Interaction, Login },

  inject: ['locale'],

  data() {
    return {
      tab: "dashboard",
      tabLabels: {
        dashboard: 'Dashboard',
        setting: 'Setting',
        oee: 'OEE',
        demo: 'Demo',
        alarmhistory: 'Alarm History',
        interaction: 'Interaction'
      },
      dashboard: [],
      dashboardCards: [],
      isSimulate: false,
      isRunAllRandom: false,
      pollTimer: null,
      autoTimers: new Set()
    };
  },

  computed: {
    isAuthenticated() {
      return !!localStorage.getItem('token')
    }
  },

  created() {
   if (!localStorage.getItem('token')) {
     localStorage.removeItem('token')
     localStorage.removeItem('user')
   }
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
        this.isRunAllRandom = false;
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

          return newAddr;
        });
      } catch (err) {
        console.error("Failed to load devices:", err);
      }
    },
    async onAddCard() {
      await this.loadDevices();
    },
    async onDeleteCard() {
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

    toggleRunAllRandom() {
      this.isRunAllRandom = !this.isRunAllRandom;
      if (this.isRunAllRandom) {
        this.runAllRandomCycle();
      }
    },

    runAllRandomCycle() {
      if (!this.isRunAllRandom || !this.isSimulate) return;

      this.dashboard.forEach(device => {
        let newValue;
        const min = device.min ?? 0;
        const max = device.max ?? 100;

        if (device.data_type === 'onoff') {
          newValue = Math.random() > 0.5 ? 1 : 0;
        } else {
          newValue = +(min + Math.random() * (max - min)).toFixed(2);
        }

        this.handleDeviceUpdate({ address_id: device.address_id, value: newValue });
      });

      setTimeout(() => this.runAllRandomCycle(), 2000);
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
      this.tab = "dashboard";
    },

    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.reload()
    }
  }
};
</script>