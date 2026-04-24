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

    <!-- PLC Address Status Card -->
    <div class="card shadow-sm mt-4">
      <div class="card-header">
        <h5 class="mb-0">PLC Address Status</h5>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Output (ON/OFF)</h6>
              <div class="d-flex align-items-center gap-2">
                <div class="fw-bold text-monospace" style="font-size: 1.5rem;">
                  <span v-if="latestPLCLog.plc_onoff_value === 1" class="badge bg-success">ON</span>
                  <span v-else class="badge bg-danger">OFF</span>
                </div>
              </div>
              <small class="text-muted d-block mt-2">{{ plcAddresses.plc_address_output || 'N/A' }}</small>
              <small class="text-muted d-block">Value: {{ latestPLCLog.plc_onoff_value }}</small>
            </div>
          </div>
          <div class="col-md-4">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Active (Running)</h6>
              <div class="d-flex align-items-center gap-2 mb-2">
                <div class="fw-bold text-monospace" style="font-size: 1.5rem;">
                  <span class="badge bg-info">{{ latestPLCLog.plc_active_value }}</span>
                </div>
              </div>
              <p class="mb-2 fw-bold text-primary">Model: {{ getProductNameById(latestPLCLog.plc_active_value) }}</p>
              <small class="text-muted d-block mt-2">{{ plcAddresses.plc_address_active || 'N/A' }}</small>
              <small class="text-muted d-block">Value: {{ latestPLCLog.plc_active_value }}</small>
            </div>
          </div>
          <div class="col-md-4">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Complete (ON/OFF)</h6>
              <div class="d-flex align-items-center gap-2">
                <div class="fw-bold text-monospace" style="font-size: 1.5rem;">
                  <span v-if="latestPLCLog.plc_complete_value === 1" class="badge bg-success">ON</span>
                  <span v-else class="badge bg-danger">OFF</span>
                </div>
              </div>
              <small class="text-muted d-block mt-2">{{ plcAddresses.plc_address_complete || 'N/A' }}</small>
              <small class="text-muted d-block">Value: {{ latestPLCLog.plc_complete_value }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    
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
              <p class="text-muted mb-0">minutes</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Total Output</h6>
              <h5 class="mb-0">{{ totalOutput }}</h5>
              <p class="text-muted mb-0">units</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2 text-primary fw-bold">Performance</h6>
              <h5 class="mb-0 text-primary">{{ ((idealCycleTime * totalOutput) / (elapsed_minutes - downtimeProducts.downtime_minutes)).toFixed(2) }}</h5>
              <p class="text-muted mb-0">%</p>
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
              <div v-if="downtimeProducts.length > 0" style="max-height: 150px; overflow-y: auto;">
                <div v-for="item in downtimeProducts" :key="item.id" class="mb-2 pb-2 border-bottom">
                  <p class="mb-1 fw-bold text-primary">{{ item.product_name || item.name || '-' }}</p>
                  <small class="text-muted d-block">{{ item.start_time || '-' }}</small>
                  <small class="text-muted d-block">{{ item.end_time || '-' }}</small>
                  <span class="badge bg-warning">{{ item.duration || '-' }} min</span>
                </div>
              </div>
              <div v-else>
                <h5 class="mb-0">{{ downtimeProducts.downtime_minutes }}</h5>
                <p class="text-muted mb-0">minutes</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Operating Time</h6>
              <h5 class="mb-0">{{ elapsed_minutes - downtimeProducts.downtime_minutes }}</h5>
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
      downtime: 0,
      plcAddresses: {
        plc_address_output: null,
        plc_address_active: null,
        plc_address_complete: null
      },
      downtimeProducts: [],
      latestPLCLog: {
        plc_onoff_value: null,
        plc_active_value: null,
        plc_complete_value: null,
        created_at: null
      }
    };
  },
    async mounted() {
      await this.loadProducts();
      await this.loadOperatingTime();
      await this.loadProductData();
      await this.loadLatestLog();
      // Refresh all data every 1 second
      setInterval(async () => {
        await this.loadProductData();
        await this.loadOperatingTime();
        await this.loadDowntimeProducts();
      }, 1000);
      // Refresh latest PLC log every 2 seconds
      setInterval(async () => {
        await this.loadLatestLog();
      }, 2000);
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
        
        // Fetch PLC addresses for this product
        this.plcAddresses = {
          plc_address_output: product.plc_address_output || null,
          plc_address_active: product.plc_address_active || null,
          plc_address_complete: product.plc_address_complete || null
        };
        
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
    async loadDowntimeProducts() {
      if (!this.selectedProductId) return;
      try {
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const startTime = `${date}T00:00:00.000Z`;
        const endTime = `${date}T23:59:59.999Z`;
        
        const res = await fetch(
          `${BASE_API}/api/downtime-products/${this.selectedProductId}?start=${startTime}&end=${endTime}`
        );
        if (!res.ok) throw new Error("Failed to load downtime products");
        const data = await res.json();
        this.downtimeProducts = data.data || data;
        console.log("Downtime products:", this.downtimeProducts);
      } catch (err) {
        console.error("Load downtime products error:", err);
      }
    },
    async loadLatestLog() {
      try {
        const res = await fetch(`${BASE_API}/api/products/latest-log`);
        if (!res.ok) throw new Error("Failed to load latest PLC log");
        const data = await res.json();
        if (data.success && data.data) {
          this.latestPLCLog = {
            plc_onoff_value: data.data.plc_onoff_value,
            plc_active_value: data.data.plc_active_value,
            plc_complete_value: data.data.plc_complete_value,
            created_at: data.data.created_at
          };
          console.log("Latest PLC log:", this.latestPLCLog);
        }
      } catch (err) {
        console.error("Load latest PLC log error:", err);
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
    getProductNameById(id) {
      if (!id) return '-';
      const product = this.products.find(p => p.id === id);
      return product ? product.name : '-';
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