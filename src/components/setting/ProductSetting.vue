<template>
   <div class="card shadow-sm">
     <div class="card-body p-4">
       <div class="d-flex justify-content-between align-items-center mb-4">
         <h5 class="fw-bold m-0">
           <i class="bi bi-box-seam text-primary me-2"></i>{{ locale.t('Product Setting') }}
         </h5>
         <button class="btn btn-primary" @click="$emit('add')">
           <i class="fa-solid fa-plus me-1"></i> {{ locale.t('Add Product') }}
         </button>
       </div>

       <!-- PLC Address Card -->
       <div class="card mb-4 border-warning shadow-sm">
         <div class="card-header bg-warning text-white">
           <h6 class="mb-0 fw-bold">
             <i class="bi bi-cpu me-2"></i>{{ locale.t('PLC Address Configuration') }}
           </h6>
         </div>
         <div class="card-body">
           <div class="row g-3">
             <div class="col-md-3">
               <div class="mb-3 mb-md-0">
                 <label class="form-label fw-bold text-primary">
                   {{ locale.t('PLC Address (ON/OFF)') }}
                 </label>
                 <input 
                   type="text" 
                   class="form-control form-control-lg" 
                   v-model="plcAddresses.plc_address_output"
                   :placeholder="locale.t('e.g. D100, DB100.DBD0')"
                 >
                 <small class="text-muted">{{ locale.t('Address for product ON/OFF signal') }}</small>
               </div>
             </div>
             <div class="col-md-3">
               <div class="mb-3 mb-md-0">
                 <label class="form-label fw-bold text-success">
                   {{ locale.t('PLC Address (Running)') }}
                 </label>
                 <input 
                   type="text" 
                   class="form-control form-control-lg" 
                   v-model="plcAddresses.plc_address_active"
                   :placeholder="locale.t('e.g. M10, DB100.DBX0.0')"
                 >
                 <small class="text-muted">{{ locale.t('Address for product running status') }}</small>
               </div>
             </div>
              <div class="col-md-3">
               <div class="mb-3 mb-md-0">
                 <label class="form-label fw-bold text-warning">
                   {{ locale.t('PLC Address (Complete)') }}
                 </label>
                 <input 
                   type="text" 
                   class="form-control form-control-lg" 
                   v-model="plcAddresses.plc_address_complete"
                   :placeholder="locale.t('e.g. M10, DB100.DBX0.0')"
                 >
                 <small class="text-muted">{{ locale.t('Address for product complete status') }}</small>
               </div>
             </div>
              <div class="col-md-3">
               <div class="mb-3 mb-md-0">
                 <label class="form-label fw-bold text-danger">
                   {{ locale.t('PLC Address (Reject)') }}
                 </label>
                 <input 
                   type="text" 
                   class="form-control form-control-lg" 
                   v-model="plcAddresses.plc_address_reject"
                   :placeholder="locale.t('e.g. M10, DB100.DBX0.0')"
                 >
                 <small class="text-muted">{{ locale.t('Address for product reject signal') }}</small>
                 
               </div>
             </div>
           </div>
           <div class="mt-3 text-end">
             <button 
               class="btn btn-success" 
               :disabled="savingPlc" 
               @click="savePlcAddresses"
             >
               <span v-if="savingPlc" class="spinner-border spinner-border-sm me-2"></span>
               <i v-else class="bi bi-check-circle me-2"></i>
               {{ savingPlc ? locale.t('Saving...') : locale.t('Save PLC Addresses') }}
             </button>
           </div>
         </div>
       </div>

       <!-- Table -->
      <div class="table-responsive rounded-3 border shadow-sm">
        <table class="table table-hover align-middle mb-0">
           <thead class="table-blue">
            <tr>
              <th class="ps-3 py-3">{{ locale.t('Model Name') }}</th>
              <th class="py-3 text-center">{{ locale.t('Image') }}</th>
              <th class="py-3 text-center">Cycle Time (s)</th>
              <th class="py-3 text-center">{{ locale.t('Actions') }}</th>
            </tr>
          </thead>
          <tbody>
             <tr v-for="product in products" :key="product.id">
               <td class="fw-bold ps-3">
                 {{ product.name }}
               </td>
     
               <td class="text-center">
                 <div class="product-image-wrapper">
                   <img 
                     v-if="product.image_path || product.image_path" 
                     :src="product.image_path || product.image_path" 
                     :alt="product.name"
                     class="product-image"
                   />
                   <span v-else class="text-muted">-</span>
                 </div>
               </td>
               <td class="text-center">
                 {{ product.cycle_time }}
               </td>
               <td class="text-center">
                 <button class="btn btn-sm btn-outline-primary me-1" @click="openEditModal(product)">
                   <i class="fa-solid fa-pencil"></i>
                 </button>
                 <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(product)">
                   <i class="fa-solid fa-trash-alt"></i>
                 </button>
               </td>
             </tr>
             <tr v-if="products.length === 0">
               <td colspan="4" class="text-center text-muted py-4">
                 <i class="fa-solid fa-box-open d-block mb-2" style="font-size: 2rem;"></i>
                 {{ locale.t('No products found.') }}
               </td>
             </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { showAlert, showConfirm } from "../../utils/swalHelper";

const BASE_API = import.meta.env.VITE_API_BASE_URL;
const authH = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

export default {
  name: "ProductSetting",
  
  inject: ['locale'],
  
  data() {
    return {
      products: [],
      plcAddresses: {
         plc_address_output: "",
         plc_address_active: "",
         plc_address_complete: "",
         plc_address_reject: ""
       },
      savingPlc: false
    };
  },
  mounted() {
    this.loadProducts();
    this.loadPlcAddresses();
  },
  methods: {
    async loadProducts() {
      try {
        const res = await fetch(`${BASE_API}/api/products`, { headers: authH() });
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        this.products = json.data || json;
      } catch (err) {
        console.error(err);
      }
    },

    async loadPlcAddresses() {
      try {
        const res = await fetch(`${BASE_API}/api/products/plc-addresses`, { headers: authH() });
        if (!res.ok) throw new Error("Failed to load PLC addresses");
        const json = await res.json();
        if (json.success) {
          this.plcAddresses = {
            plc_address_output: json.plc_address_output || "",
            plc_address_active: json.plc_address_active || "",
            plc_address_complete: json.plc_address_complete || "",
            plc_address_reject: json.plc_address_reject || ""
          };
        }
      } catch (err) {
        console.error("Load PLC addresses error:", err);
      }
    },

    async savePlcAddresses() {
      try {
        this.savingPlc = true;
        const res = await fetch(`${BASE_API}/api/products/plc-addresses`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authH() },
          body: JSON.stringify(this.plcAddresses)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Save failed");
        }

        const json = await res.json();
        await showAlert("Success", json.message || "PLC addresses saved successfully", "success");
      } catch (err) {
        console.error(err);
        await showAlert("Error", err.message, "error");
      } finally {
        this.savingPlc = false;
      }
    },
    
    openEditModal(product) {
      this.$emit('edit', product);
    },
    
    async confirmDelete(product) {
      const confirmed = await showConfirm(
        "ยืนยันการลบ",
        `คุณต้องการลบ Product "${product.name}" หรือไม่?`,
        "ลบ"
      );
      
      if (confirmed) {
        try {
          const res = await fetch(`${BASE_API}/api/products/${product.id}`, {
            method: "DELETE",
            headers: authH()
          });
          
          if (!res.ok) throw new Error("Delete failed");
          
          await showAlert("Success", "Product deleted successfully", "success");
          this.loadProducts();
        } catch (err) {
          console.error(err);
          await showAlert("Error", "Cannot delete product", "error");
        }
      }
    }
  }
};
</script>

<style scoped>
.product-image-wrapper {
  width: 60px;
  height: 60px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>