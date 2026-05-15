<template>
 <Login v-if="!isAuthenticated" />
  <div v-else class="container-fluid mt-4">
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3">
      <ul class="nav nav-tabs mb-0">
        <li class="nav-item" v-for="t in visibleTabs" :key="t">
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
        <button class="btn btn-outline-secondary btn-sm" @click="locale.toggle()">
          <i class="fas fa-globe"></i> {{ locale.current === 'th' ? 'TH' : 'EN' }}
        </button>

<!-- Profile Dropdown New Design -->
<div class="position-relative" ref="profileDropdown">
  <button
    class="btn-profile-trigger d-flex align-items-center gap-2"
    :class="{ 'active': dropdownOpen }"
    @click="dropdownOpen = !dropdownOpen"
  >
    <div class="avatar-circle">
      <i class="fas fa-user"></i>
    </div>
    <div class="user-info-brief d-none d-sm-block text-start">
      <div class="user-email text-truncate">{{ currentUser.email }}</div>
      <div class="user-role">{{ locale.current === 'th' ? 'ผู้ดูแลระบบ' : 'Administrator' }}</div>
    </div>
    <i class="fas fa-chevron-down ms-1 arrow-icon"></i>
  </button>

        <!-- Dropdown Menu -->
        <transition name="slide-fade">
          <div v-if="dropdownOpen" class="profile-dropdown-menu shadow-lg">
            <!-- Header Section -->
            <div class="dropdown-header-custom">
              <div class="header-avatar">
                <i class="fas fa-user-circle"></i>
              </div>
              <div class="header-content">
                <p class="h-name">{{ currentUser.email?.split('@')[0] }}</p>
                <p class="h-email text-truncate">{{ currentUser.email }}</p>
              </div>
            </div>

            <div class="dropdown-body-custom py-2">
              <button class="menu-item" @click="showProfile = true; dropdownOpen = false">
                <div class="icon-box bg-light-primary">
                  <i class="fas fa-id-card"></i>
                </div>
                <span>{{ locale.current === 'th' ? 'โปรไฟล์ส่วนตัว' : 'Personal Profile' }}</span>
              </button>

              <button v-if="currentUser.role === 'super_admin'" class="menu-item" @click="showRegisterModal = true; dropdownOpen = false">
                <div class="icon-box bg-light-success">
                  <i class="fas fa-user-plus"></i>
                </div>
                <span>{{ locale.t('Register User') }}</span>
              </button>
            </div>

            <div class="dropdown-footer-custom border-top p-2">
              <button class="btn-logout-custom w-100" @click="logout">
                <i class="fas fa-sign-out-alt"></i>
                {{ locale.current === 'th' ? 'ออกจากระบบ' : 'Logout' }}
              </button>
            </div>
          </div>
        </transition>
      </div>
      </div>
    </div>

    <ProfileModal v-if="showProfile" :user="currentUser" @close="showProfile = false" />
    <RegisterModal v-if="showRegisterModal" @close="showRegisterModal = false" />

    <div class="tab-content">

      <DashboardLayout
        v-if="tab === 'dashboard'"
        :devices="dashboard"
        :dashboard-cards="dashboardCards"
        :user-role="currentUser.role"
        :allowed-room-ids="allowedRoomIds"
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
        :user-role="currentUser.role"
        :allowed-room-ids="allowedRoomIds"
        :can-control-room="canControlRoom"
      />

      <AlarmHistory
        v-if="tab === 'alarmhistory'"
        :devices="dashboard"
        :user-role="currentUser.role"
        :allowed-room-ids="allowedRoomIds"
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
import ProfileModal from "./components/ProfileModal.vue";
import RegisterModal from "./components/RegisterModal.vue";

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "App",
  components: { DashboardLayout, Setting, Oee, Demo, AlarmHistory, Interaction, Login, ProfileModal, RegisterModal },

  inject: ['locale'],

  data() {
    return {
      dropdownOpen: false,
      showProfile: false,
      showRegisterModal: false,
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
    },
    currentUser() {
      try {
        return JSON.parse(localStorage.getItem('user')) || {};
      } catch {
        return {};
      }
    },
    visibleTabs() {
      const role = this.currentUser?.role
      const tabs = [
        { key: 'dashboard',    roles: ['super_admin', 'admin', 'operator', 'viewer'] },
        { key: 'oee',          roles: ['super_admin', 'admin', 'operator', 'viewer'] },
        { key: 'alarmhistory', roles: ['super_admin', 'admin', 'operator', 'viewer'] },
        { key: 'interaction',  roles: ['super_admin', 'admin', 'operator'] },
        { key: 'demo',         roles: ['super_admin', 'admin'] },
        { key: 'setting',      roles: ['super_admin', 'admin'] },
      ]
      return tabs.filter(t => t.roles.includes(role)).map(t => t.key)
    },
    userRooms() {
      return this.currentUser.rooms || []
    },
    hasFullRoomAccess() {
      return ['super_admin', 'admin'].includes(this.currentUser.role)
        || this.userRooms.some(r => r.id === null)
    },
    allowedRoomIds() {
      if (this.hasFullRoomAccess) return null
      return this.userRooms.map(r => r.id)
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
    document.addEventListener('click', this.handleClickOutside);
  },

  beforeUnmount() {
    this.stopPolling();
    this.stopAllAuto();
    document.removeEventListener('click', this.handleClickOutside);
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

    canControlRoom(roomId) {
      if (['super_admin', 'admin'].includes(this.currentUser.role)) return true
      const entry = this.userRooms.find(r => r.id === roomId || r.id === null)
      return entry?.scope === 'control'
    },
    async reloadDevices() {
      await this.loadDevices();
      this.tab = "dashboard";
    },

    handleClickOutside(e) {
      if (this.$refs.profileDropdown && !this.$refs.profileDropdown.contains(e.target)) {
        this.dropdownOpen = false;
      }
    },

    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.reload()
    }
  }
};
</script>

<style scoped>
/* Profile Trigger Button */
.btn-profile-trigger {
  background: white;
  border: 1px solid #e0e6ed;
  padding: 6px 12px;
  border-radius: 50px; /* ทรงแคปซูล */
  transition: all 0.3s ease;
  cursor: pointer;
}

.btn-profile-trigger:hover, .btn-profile-trigger.active {
  background: #f8faff;
  border-color: #0d6efd;
  box-shadow: 0 4px 12px rgba(13, 110, 253, 0.1);
}

.avatar-circle {
  width: 28px;
  height: 28px;
  background: #0d6efd;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}

.user-info-brief .user-email {
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  max-width: 130px;
  line-height: 1.2;
}

.user-info-brief .user-role {
  font-size: 0.7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.arrow-icon {
  font-size: 0.7rem;
  color: #94a3b8;
  transition: transform 0.3s ease;
}

.btn-profile-trigger.active .arrow-icon {
  transform: rotate(180deg);
}

/* Dropdown Menu Container */
.profile-dropdown-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 260px;
  background: white;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.05);
  overflow: hidden;
  z-index: 1100;
}

/* Header Section */
.dropdown-header-custom {
  background: linear-gradient(135deg, #0d6efd 0%, #0052cc 100%);
  padding: 20px 16px;
  color: white;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-avatar {
  font-size: 2.5rem;
  opacity: 0.9;
}

.header-content {
  overflow: hidden;
}

.h-name {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.2;
}

.h-email {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Menu Items */
.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border: none;
  background: none;
  color: #475569;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  text-align: left;
}

.menu-item:hover {
  background: #f1f5f9;
  color: #0d6efd;
}

.icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.bg-light-primary { background: #e0e7ff; color: #4338ca; }
.bg-light-success { background: #dcfce7; color: #15803d; }

/* Logout Button */
.btn-logout-custom {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #fee2e2;
  background: #fff;
  color: #dc2626;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-logout-custom:hover {
  background: #fef2f2;
  border-color: #fecaca;
}

/* Animation */
.slide-fade-enter-active { transition: all 0.3s ease-out; }
.slide-fade-leave-active { transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>