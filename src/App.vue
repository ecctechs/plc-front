<template>
  <div class="container-fluid mt-4">

    <!-- Tabs -->
    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button
          class="nav-link"
          :class="{ active: tab === 'dashboard' }"
          @click="tab = 'dashboard'"
        >
          Dashboard
        </button>
      </li>

      <li class="nav-item">
        <button
          class="nav-link"
          :class="{ active: tab === 'setting' }"
          @click="tab = 'setting'"
        >
          Setting
        </button>
      </li>

      <li class="nav-item">
        <button
          class="nav-link"
          :class="{ active: tab === 'demo' }"
          @click="tab = 'demo'"
        >
          Demo
        </button>
      </li>
    </ul>

    <!-- Pages -->
    <Dashboard
      v-if="tab === 'dashboard'"
      :devices="devices"
    />

    <Setting
      v-if="tab === 'setting'"
      @add-device="reloadDevices"
    />

    <Demo
      v-if="tab === 'demo'"
      :devices="devices"
    />

  </div>
</template>

<script>
import Dashboard from "./views/Dashboard.vue";
import Setting from "./views/Setting.vue";
import Demo from "./views/Demo.vue";

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "App",

  components: {
    Dashboard,
    Setting,
    Demo,
  },

  data() {
    return {
      tab: "dashboard",
      devices: [],
    };
  },

  async mounted() {
    await this.loadDevices();
  },

  methods: {
    async loadDevices() {
      const res = await fetch(`${BASE_API}/api/devices`);
      const data = await res.json();

      this.devices = data.map(d => ({
        id: d.id,
        name: d.name,
        plc_address: d.plc_address,
        refresh_rate_ms: d.refresh_rate_ms,
        data_display_type: d.data_display_type,

        numberConfig: d.numberConfig ?? {
          decimal_places: 0,
          scale: 1,
          offset: 0,
          min_value: null,
          max_value: null,
          unit: ''
        }
      }));
    },

    async reloadDevices() {
      await this.loadDevices();
      this.tab = "dashboard";
    },
  },
};
</script>
