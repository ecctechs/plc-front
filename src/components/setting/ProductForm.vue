<template>
  <div>
    <div class="modal fade" :class="{ show: showModal }" :style="{ display: showModal ? 'block' : 'none' }" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title modal-title-custom fw-bold">{{ isEdit ? locale.t('Edit Product') : locale.t('Add Product') }}</h5>
            <button type="button" class="btn-close" @click="closeModal()"></button>
          </div>
          <div class="modal-body">
             <div class="row">
               <div class="col-md-12">
                 <div class="mb-3">
                   <label class="form-label fw-bold">{{ locale.t('Model Name') }}</label>
                   <input v-model="form.name" type="text" class="form-control" :placeholder="locale.t('Enter Model Name')" />
                 </div>
                 <div class="mb-3">
                   <label class="form-label fw-bold">{{ locale.t('Image') }}</label>
                   <input type="file" class="form-control" accept="image/*" @change="handleImageUpload" />
                   <div v-if="imagePreview" class="mt-2">
                     <img :src="imagePreview" alt="Preview" class="img-thumbnail" style="max-width: 150px; max-height: 150px;" />
                   </div>
                 </div>
                 <div class="mb-3">
                   <label class="form-label fw-bold">Cycle Time (s)</label>
                   <input v-model="form.cycle_time" type="number" class="form-control" placeholder="e.g., 10" min="0" step="0.1" />
                 </div>
                 <div class="row">
                   <div class="col-md-6 mb-3">
                     <label class="form-label fw-bold">Target OEE (%)</label>
                     <input v-model="form.target_oee" type="number" class="form-control" placeholder="e.g., 85" min="0" max="100" step="0.1" />
                   </div>
                   <div class="col-md-6 mb-3">
                     <label class="form-label fw-bold">Target Output (pcs)</label>
                     <input v-model="form.target_output" type="number" class="form-control" placeholder="e.g., 500" min="0" step="1" />
                   </div>
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
import { showAlert } from "../../utils/swalHelper";

const BASE_API = import.meta.env.VITE_API_BASE_URL;
const authH = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

export default {
  name: "ProductForm",
  
  inject: ['locale'],
  
  props: {
    reloadProducts: {
      type: Function,
      default: null
    }
  },
  
  data() {
    return {
      showModal: false,
      isEdit: false,
      editingId: null,
      loading: false,
      imagePreview: null,
      selectedFile: null,
      form: {
        name: "",
        cycle_time: "",
        target_oee: "",
        target_output: ""
      }
    };
  },
  methods: {
    open(product = null) {
      if (product) {
        this.isEdit = true;
        this.editingId = product.id;
        this.form = {
          name: product.name || "",
          cycle_time: product.cycle_time || "",
          target_oee: product.target_oee ?? "",
          target_output: product.target_output ?? ""
        };
        this.imagePreview = product.image_url || product.image || null;
        this.selectedFile = null;
      } else {
        this.isEdit = false;
        this.editingId = null;
        this.form = {
          name: "",
          cycle_time: "",
          target_oee: "",
          target_output: ""
        };
        this.imagePreview = null;
        this.selectedFile = null;
      }
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
    },
    handleImageUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.imagePreview = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    },
    async save() {
      if (!this.form.name) {
        await showAlert("Error", "Model Name is required", "warning");
        return;
      }

      try {
        this.loading = true;
        const url = this.isEdit 
          ? `${BASE_API}/api/products/${this.editingId}`
          : `${BASE_API}/api/products`;
        const method = this.isEdit ? "PUT" : "POST";

        const formData = new FormData();
        formData.append("name", this.form.name);
        if (this.form.cycle_time !== "") {
          formData.append("cycle_time", this.form.cycle_time);
        }
        if (this.form.target_oee !== "") {
          formData.append("target_oee", this.form.target_oee);
        }
        if (this.form.target_output !== "") {
          formData.append("target_output", this.form.target_output);
        }
        if (this.selectedFile) {
          formData.append("image", this.selectedFile);
        }

        const res = await fetch(url, {
          method,
          headers: authH(),
          body: formData
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Save failed");
        }

        await showAlert("Success", "Product saved successfully", "success");
        this.closeModal();
        if (this.reloadProducts) {
          this.reloadProducts();
        }
        this.$emit('saved');
      } catch (err) {
        console.error(err);
        await showAlert("Error", err.message, "error");
      } finally {
        this.loading = false;
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