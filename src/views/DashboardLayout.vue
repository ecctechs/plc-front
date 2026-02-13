<template>
  <div class="container-fluid mt-4">

    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="fw-bold">Dashboard</h3>
      <div>
        <button class="btn btn-outline-secondary me-2" @click="editMode = !editMode">
          {{ editMode ? 'Exit Edit' : 'Edit Mode' }}
        </button>
        <button v-if="editMode" class="btn btn-primary" @click="showAdd = true">
          + Add Card
        </button>
      </div>
    </div>

    <Dashboard :addresses="devices" 
    :edit-mode="editMode"
    @delete-card="deleteCard"/>

    <AddDashboardCard
      v-if="showAdd"
      @add="onAdd"
      @close="showAdd = false"
    />
  </div>
</template>

<script>
import Dashboard from './DashboardCards.vue';
import AddDashboardCard from './AddDashboardCardModal.vue';
const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  components: { Dashboard, AddDashboardCard },

  props: {
    devices:Array,
  },

  data() {
    return {
      editMode: false,
      showAdd: false
    };
  },

  computed: {
    dashboardAddresses() {
      return this.dashboardCards
        .sort((a, b) => a.order - b.order)
        .map(card =>
          this.addresses.find(a => a.address_id === card.address_id)
        )
        .filter(Boolean);
    }
  },

  methods: {
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
    }
  }
};
</script>
