<template>
  <div class="container-fluid mt-4">

    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
      <h3 class="mb-1 text-primary fw-bold d-flex align-items-center">
          <i class="bi bi-clock-history me-2"></i>{{ locale.t('Dashboard') }}
      </h3>
      <div>
        <button class="btn btn-outline-secondary me-2" @click="editMode = !editMode">
          {{ editMode ? locale.t('Exit Edit') : locale.t('Edit Mode') }}
        </button>
        <button v-if="editMode" class="btn btn-primary" @click="showAdd = true">
          + {{ locale.t('Add Card') }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <select v-model="filters.room" class="form-select" @change="applyFilters">
          <option value="">{{ locale.t('All Rooms') }}</option>
          <option v-for="room in rooms" :key="room.id" :value="room.name">
            {{ room.name }}
          </option>
        </select>
      </div>
      <div class="col-md-3">
        <select v-model="filters.deviceType" class="form-select" @change="applyFilters">
          <option value="">{{ locale.t('All Device Types') }}</option>
          <option v-for="type in deviceTypes" :key="type.id" :value="type.name">
            {{ type.name }}
          </option>
        </select>
      </div>
    </div>

    <Dashboard :addresses="filteredDevices" 
    :edit-mode="editMode"
    @delete-card="deleteCard"
    @edit-card="handleEditCard"/>

    <AddDashboardCard
      v-if="showAdd || editingCard"
      :current-card-count="filteredDevices.length"
      :editing-card="editingCard"
      @add="onAdd"
      @update="onUpdate"
      @close="closeModal"
    />
  </div>
</template>

<script>
import Dashboard from './DashboardCards.vue';
import AddDashboardCard from './AddDashboardCardModal.vue';
const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  components: { Dashboard, AddDashboardCard },

  inject: ['locale'],

  props: {
    devices:Array,
  },

  data() {
    return {
      editMode: false,
      showAdd: false,
      editingCard: null,
      rooms: [],
      deviceTypes: [],
      filters: {
        room: "",
        deviceType: ""
      }
    };
  },

  computed: {
    sortedAddresses() {
      return [...this.devices].sort((a, b) => (a.position || 0) - (b.position || 0));
    },
    filteredDevices() {
      let result = [...this.devices];
      
      if (this.filters.room) {
        result = result.filter(d => d.device.room_name === this.filters.room);
      }
      
      if (this.filters.deviceType) {
        console.log('Applying device type filter:', this.filters);
        result = result.filter(d => d.device.type === this.filters.deviceType);
      }
      
      return result.sort((a, b) => (a.position || 0) - (b.position || 0));
    },
    dashboardAddresses() {
      return this.dashboardCards
        .sort((a, b) => a.order - b.order)
        .map(card =>
          this.addresses.find(a => a.address_id === card.address_id)
        )
        .filter(Boolean);
    }
  },

  mounted() {
    this.loadFilters();
  },

  methods: {
    async loadFilters() {
      try {
        // Load rooms
        const roomsRes = await fetch(`${BASE_API}/api/rooms`);
        const roomsData = await roomsRes.json();
        this.rooms = roomsData.data || [];
        
        // Load device types
        const typesRes = await fetch(`${BASE_API}/api/device-types`);
        const typesData = await typesRes.json();
        this.deviceTypes = typesData.data || [];
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    },
    applyFilters() {
      // Filters are reactive, computed property will update automatically
    },
    handleEditCard(card) {
      this.editingCard = card;
    },
    closeModal() {
      this.showAdd = false;
      this.editingCard = null;
    },
    async deleteCard(card) {
      // call API
      await fetch(`${BASE_API}/api/dashboard/cards/${card.card_id}`, {
        method: 'DELETE'
      });
      this.$emit('delete-card', card);
    },
    onAdd(payload) {
      this.$emit('add-card', payload);
      this.showAdd = false;
    },
    async onUpdate(payload) {
      try {
        await fetch(`${BASE_API}/api/dashboard/cards/${this.editingCard.card_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedDeviceId: payload.selectedDeviceId,
            selectedAddressId: payload.selectedAddressId,
            selectedDisplayType: payload.selectedDisplayType,
            selectedPosition: payload.selectedPosition
          })
        });
        this.$emit('update-card', payload);
      } catch (err) {
        console.error('Failed to update card:', err);
      }
      this.closeModal();
    }
  }
};
</script>
