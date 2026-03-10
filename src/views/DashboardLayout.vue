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

    <Dashboard :addresses="sortedAddresses" 
    :edit-mode="editMode"
    @delete-card="deleteCard"
    @edit-card="handleEditCard"/>

    <AddDashboardCard
      v-if="showAdd || editingCard"
      :current-card-count="sortedAddresses.length"
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

  props: {
    devices:Array,
  },

  data() {
    return {
      editMode: false,
      showAdd: false,
      editingCard: null
    };
  },

  computed: {
    sortedAddresses() {
      return [...this.devices].sort((a, b) => (a.position || 0) - (b.position || 0));
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

  methods: {
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
