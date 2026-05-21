<template>
  <div class="card shadow-sm h-100">
    <div class="card-body p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="fw-bold m-0">
          <i class="bi bi-ui-chips text-primary me-2"></i>{{ locale.t('Type Setting') }}
        </h5>
        <button class="btn btn-primary" @click="openModal()">
          <i class="fa-solid fa-plus me-1"></i> {{ locale.t('Add Type') }}
        </button>
      </div>

      <!-- Table -->
      <div class="table-responsive rounded-3 border shadow-sm">
        <table class="table table-hover align-middle mb-0">
           <thead class="table-blue">
            <tr>
              <th class="ps-3 py-3" style="width: 25%">{{ locale.t('Device Type') }}</th>
              <th class="py-3 text-center" style="width: 15%">ON/OFF</th>
              <th class="py-3 text-center" style="width: 15%">Number</th>
              <th class="py-3 text-center" style="width: 18%">Number Gauge</th>
              <th class="py-3 text-center" style="width: 15%">Level</th>
              <th class="py-3 text-center" style="width: 12%">{{ locale.t('Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="type in deviceTypes" :key="type.id">
              <td class="fw-bold ps-3">
                {{ type.name }}
              </td>
              <td class="text-center">
                <span v-if="type.display_types && type.display_types.includes('onoff')" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="type.display_types && type.display_types.includes('number')" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="type.display_types && type.display_types.includes('number_gauge')" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="type.display_types && type.display_types.includes('level')" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" @click="openModal(type)" :title="locale.t('Edit')">
                  <i class="fa-solid fa-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(type)" :title="locale.t('Delete')">
                  <i class="fa-solid fa-trash-alt"></i>
                </button>
              </td>
            </tr>
            <tr v-if="deviceTypes.length === 0">
              <td colspan="6" class="text-center text-muted py-4">
                <i class="fa-solid fa-box-open d-block mb-2" style="font-size: 2rem;"></i>
                {{ locale.t('No Device Types found.') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal fade" :class="{ show: showModal }" :style="{ display: showModal ? 'block' : 'none' }" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title modal-title-custom fw-bold">{{ isEdit ? locale.t('Edit Device Type') : locale.t('Add Device Type') }}</h5>
            <button type="button" class="btn-close" @click="closeModal()"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label fw-bold">{{ locale.t('Name') }}</label>
              <input v-model="form.name" type="text" class="form-control" placeholder="e.g., Heater" />
            </div>
            <div class="mb-3">
              <label class="form-label fw-bold">{{ locale.t('Description') }}</label>
              <textarea v-model="form.description" class="form-control" rows="2" placeholder="Optional description"></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label fw-bold">{{ locale.t('Display Types') }}</label>
              <div class="d-flex flex-wrap gap-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" value="onoff" v-model="form.display_types" />
                  <label class="form-check-label">ON/OFF</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" value="number" v-model="form.display_types" />
                  <label class="form-check-label">Number</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" value="number_gauge" v-model="form.display_types" />
                  <label class="form-check-label">Number Gauge</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" value="level" v-model="form.display_types" />
                  <label class="form-check-label">Level</label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer modal-footer-custom">
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
const authH = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

export default {
  name: "TypeSetting",
  
  inject: ['locale'],
  
  data() {
    return {
      deviceTypes: [],
      showModal: false,
      isEdit: false,
      loading: false,
      editingId: null,
      form: {
        name: "",
        description: "",
        display_types: []
      }
    };
  },
  mounted() {
    this.loadDeviceTypes();
  },
  methods: {
    async loadDeviceTypes() {
      try {
        const res = await fetch(`${BASE_API}/api/device-types`, { headers: authH() });
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        this.deviceTypes = json.data || []  ;
      } catch (err) {
        console.error(err);
        await showAlert("Error", "Cannot load device types", "error");
      }
    },
    openModal(type = null) {
      if (type) {
        this.isEdit = true;
        this.editingId = type.id;
        this.form = {
          name: type.name || "",
          description: type.description || "",
          display_types: type.display_types ? [...type.display_types] : []
        };
      } else {
        this.isEdit = false;
        this.editingId = null;
        this.form = {
          name: "",
          description: "",
          display_types: []
        };
      }
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
    async save() {
      if (!this.form.name) {
        await showAlert("Error", "Name is required", "warning");
        return;
      }
      if (this.form.display_types.length === 0) {
        await showAlert("Error", "Please select at least one Display Type", "warning");
        return;
      }

      try {
        this.loading = true;
        const url = this.isEdit 
          ? `${BASE_API}/api/device-types/${this.editingId}`
          : `${BASE_API}/api/device-types`;
        const method = this.isEdit ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...authH() },
          body: JSON.stringify(this.form)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Save failed");
        }

        await showAlert("Success", "Device Type saved successfully", "success");
        this.closeModal();
        this.loadDeviceTypes();
      } catch (err) {
        console.error(err);
        await showAlert("Error", err.message, "error");
      } finally {
        this.loading = false;
      }
    },
    async confirmDelete(type) {
      const confirmed = await showConfirm(
        "ยืนยันการลบ",
        `คุณต้องการลบ Device Type "${type.name}" หรือไม่?`,
        "ลบ"
      );
      
      if (confirmed) {
        try {
          const res = await fetch(`${BASE_API}/api/device-types/${type.id}`, {
            method: "DELETE",
            headers: authH()
          });
          
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Delete failed");
        }
          
          await showAlert("Success", "Device Type deleted successfully", "success");
          this.loadDeviceTypes();
        } catch (err) {
          console.error(err);
          await showAlert("Error", err.message, "error");
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
