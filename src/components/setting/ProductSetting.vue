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

      <!-- Table -->
      <div class="table-responsive rounded-3 border shadow-sm">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-dark">
            <tr>
              <th class="py-3">{{ locale.t('Model Name') }}</th>
              <th class="py-3 text-center">{{ locale.t('Image') }}</th>
              <th class="py-3 text-center">Cycle Time (s)</th>
              <th class="py-3 text-center">PLC Address (ON/OFF)</th>
              <th class="py-3 text-center">PLC Address ({{ locale.t('Running') }})</th>
              <th class="py-3 text-center">{{ locale.t('Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id">
              <td class="fw-bold">
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
                <span v-if="product.plc_address_output" class="badge bg-primary">
                  {{ product.plc_address_output }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="product.plc_address_active" class="badge bg-success">
                  {{ product.plc_address_active }}
                </span>
                <span v-else class="text-muted">-</span>
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
              <td colspan="6" class="text-center text-muted py-4">
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

export default {
  name: "ProductSetting",
  
  inject: ['locale'],
  
  data() {
    return {
      products: []
    };
  },
  mounted() {
    this.loadProducts();
  },
  methods: {
    async loadProducts() {
      try {
        const res = await fetch(`${BASE_API}/api/products`);
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        this.products = json.data || json;
      } catch (err) {
        console.error(err);
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
            method: "DELETE"
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