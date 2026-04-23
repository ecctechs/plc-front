<template>
  <div class="container-fluid mt-4">
    <div class="oee-header mb-4">
      <h3 class="fw-bold text-primary">
        <i class="bi bi-bar-chart-line me-2"></i>OEE Dashboard
      </h3>
      <p class="text-muted mb-0">Overall Equipment Effectiveness Monitoring</p>
    </div>

    <div class="row g-4">
      <!-- Product Selection -->
      <div class="col-md-4">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title text-primary mb-3">Select Product</h5>
            <select class="form-select" v-model="selectedProductId" @change="loadProductData">
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
        </div>
      </div>


    </div>

    <!-- Performance Details Card -->
    <div class="card shadow-sm mt-4">
      <div class="card-header">
        <h5 class="mb-0">Performance Details</h5>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Ideal Cycle Time</h6>
              <h5 class="mb-0">{{ idealCycleTime }}</h5>
              <p class="text-muted mb-0">seconds/unit</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Total Output</h6>
              <h5 class="mb-0">{{ totalOutput }}</h5>
              <p class="text-muted mb-0">units</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Operating Time Card -->
    <div class="card shadow-sm mt-4">
      <div class="card-header">
        <h5 class="mb-0">Operating Time</h5>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Planned Time</h6>
              <h5 class="mb-0">{{ elapsed_minutes }}</h5>
              <p class="text-muted mb-0">minutes</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Downtime</h6>
              <h5 class="mb-0">{{ downtime }}</h5>
              <p class="text-muted mb-0">minutes</p>
            </div>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script>
const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: "Oee",
  inject: ['locale'],
  data() {
    return {
      products: [],
      selectedProductId: null,
      oee: 0,
      availability: 0,
      performance: 0,
      quality: 0,
      idealCycleTime: 0,
      totalOutput: 0,
      operatingTime: 0,
      elapsed_minutes: 0,
      downtime: 0
    };
  },
    async mounted() {
      await this.loadProducts();
      await this.loadOperatingTime();
      // Refresh operating time every second
      setInterval(async () => {
        await this.loadOperatingTime();
      }, 1000);
    },
  methods: {
    async loadProducts() {
      try {
        const res = await fetch(`${BASE_API}/api/products`);
        if (!res.ok) throw new Error("Failed to load products");
        const json = await res.json();
        this.products = json.data || json;
        if (this.products.length > 0 && !this.selectedProductId) {
          this.selectedProductId = this.products[0].id;
          this.loadProductData();
        }
      } catch (err) {
        console.error(err);
      }
    },
    async loadProductData() {
      if (!this.selectedProductId) return;
      try {
        const res = await fetch(`${BASE_API}/api/products/${this.selectedProductId}`);
        if (!res.ok) throw new Error("Failed to load product data");
        const json = await res.json();
        const product = json.data || json;
        this.idealCycleTime = product.cycle_time || 0;
        this.totalOutput = product.total_output || 0;
        this.operatingTime = 0; // Will be added later
        this.calculateOEE();
      } catch (err) {
        console.error(err);
      }
    },
    async loadOperatingTime() {
      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM
      try {
        const res = await fetch(`${BASE_API}/api/working-time/planned-production?date=${date}&current_time=${currentTime}`);
        if (!res.ok) throw new Error("Failed to load operating time");
        const data = await res.json();
        console.log("Operating time data:", data);
        this.elapsed_minutes = data.breakdown.elapsed_minutes || 0;
        this.downtime = data.downtime_minutes || 0;
      } catch (err) {
        console.error(err);
      }
    },
    calculateOEE() {
      // Basic OEE calculation placeholder
      // OEE = Availability × Performance × Quality
      this.availability = 92.1;
      this.performance = 89.8;
      this.quality = 97.3;
      this.oee = (this.availability * this.performance * this.quality / 10000).toFixed(1);
    },
  }
};
</script>

<style scoped>
.oee-header {
  padding-bottom: 16px;
  border-bottom: 2px solid #e9ecef;
}

.oee-header h3 {
  margin-bottom: 4px;
}
</style>