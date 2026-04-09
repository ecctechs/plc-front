<template>
  <div class="card shadow-sm h-100">
    <div class="card-body p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="fw-bold m-0">
          <i class="bi bi-door-open text-primary me-2"></i>{{ locale.t('Room Setting') }}
        </h5>
        <button class="btn btn-primary" @click="openModal()">
          <i class="fa-solid fa-plus me-1"></i> {{ locale.t('Add Room') }}
        </button>
      </div>

      <!-- Room Table -->
      <div class="table-responsive rounded-3 border shadow-sm">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-dark">
            <tr>
              <th class="ps-3 py-3">{{ locale.t('Room') }} Name</th>
              <th class="py-3 text-center" style="width: 150px;">{{ locale.t('Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="room in rooms" :key="room.id">
              <td class="fw-bold ps-3">{{ room.name }}</td>
              <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" @click="openModal(room)">
                  <i class="fa-solid fa-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(room)">
                  <i class="fa-solid fa-trash-alt"></i>
                </button>
              </td>
            </tr>
            <tr v-if="rooms.length === 0">
              <td colspan="2" class="text-center text-muted py-4">
                {{ locale.t('No rooms found.') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal fade" :class="{ show: showModal }" :style="{ display: showModal ? 'block' : 'none' }" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-md">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header bg-dark text-white">
            <h5 class="modal-title">{{ isEdit ? locale.t('Edit Room') : locale.t('Add Room') }}</h5>
            <button type="button" class="btn-close btn-close-white" @click="closeModal()"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label fw-bold">{{ locale.t('Room') }} Name</label>
              <input v-model="form.name" type="text" class="form-control" placeholder="e.g., Room 1" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal()">{{ locale.t('Cancel') }}</button>
            <button type="button" class="btn btn-primary" @click="save()" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
              {{ isEdit ? locale.t('Update') : locale.t('Create') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script>
import { showAlert, showConfirm } from "../../utils/swalHelper";

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "RoomSetting",
  
  inject: ['locale'],
  
  data() {
    return {
      rooms: [],
      showModal: false,
      isEdit: false,
      loading: false,
      editingId: null,
      form: {
        name: ""
      }
    };
  },
  mounted() {
    this.loadRooms();
  },
  methods: {
    async loadRooms() {
      try {
        const res = await fetch(`${BASE_API}/api/rooms`);
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        this.rooms = json.data || [];
      } catch (err) {
        console.error(err);
        await showAlert("Error", "Cannot load rooms", "error");
      }
    },
    openModal(room = null) {
      if (room) {
        this.isEdit = true;
        this.editingId = room.id;
        this.form = {
          name: room.name || ""
        };
      } else {
        this.isEdit = false;
        this.editingId = null;
        this.form = {
          name: ""
        };
      }
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
    async save() {
      if (!this.form.name) {
        await showAlert("Error", "Room name is required", "warning");
        return;
      }

      try {
        this.loading = true;
        const url = this.isEdit 
          ? `${BASE_API}/api/rooms/${this.editingId}`
          : `${BASE_API}/api/rooms`;
        const method = this.isEdit ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.form)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Save failed");
        }

        await showAlert("Success", "Room saved successfully", "success");
        this.closeModal();
        this.loadRooms();
        this.$emit('room-updated');
      } catch (err) {
        console.error(err);
        await showAlert("Error", err.message, "error");
      } finally {
        this.loading = false;
      }
    },
    async confirmDelete(room) {
      const confirmed = await showConfirm(
        "ยืนยันการลบ",
        `คุณต้องการลบ Room "${room.name}" หรือไม่?`,
        "ลบ"
      );
      
      if (confirmed) {
        try {
          const res = await fetch(`${BASE_API}/api/rooms/${room.id}`, {
            method: "DELETE"
          });
          
         if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Delete failed");
        }
          
          await showAlert("Success", "Room deleted successfully", "success");
          this.loadRooms();
          this.$emit('room-updated');
        } catch (err) {
          console.error(err);
          await showAlert("Error",  err.message, "error");
        }
      }
    }
  }
};
</script>

<style scoped>
.modal.show {
  display: block !important;
}
</style>
