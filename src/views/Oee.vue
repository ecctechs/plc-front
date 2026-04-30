<template>
  <div class="container-fluid mt-4 pb-5">
    <!-- Header & Product Selector -->
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
      <div>
        <h2 class="page-title fw-bold text-primary mb-1">
          <i class="bi bi-bar-chart-line-fill me-2"></i>OEE Dashboard
        </h2>
        <p class="text-muted mb-0">Overall Equipment Effectiveness Monitoring</p>
      </div>
      
      <div class="card shadow-sm border-0 bg-white" style="min-width: 300px;">
        <div class="card-body p-3">
          <label class="form-label text-muted small fw-bold mb-1">SELECT PRODUCT</label>
          <select class="form-select form-select-lg" v-model="selectedProductId" @change="loadProductData">
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- MAIN OEE SCORE -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card shadow border-0 bg-primary text-white">
          <div class="card-body text-center py-4">
            <h5 class="text-white-50 text-uppercase fw-bold tracking-wide">Overall Equipment Effectiveness</h5>
            <h1 class="display-1 fw-bold mb-3">{{ oee }}<span class="fs-3">%</span></h1>
            
            <div class="d-inline-flex align-items-center bg-white bg-opacity-10 rounded-pill px-4 py-2">
              <span class="fs-5">OEE = </span>
              <span class="fs-5 ms-2 text-info fw-bold">A</span> 
              <span class="mx-2 text-white-50">×</span> 
              <span class="fs-5 text-warning fw-bold">P</span> 
              <span class="mx-2 text-white-50">×</span> 
              <span class="fs-5 text-success fw-bold">Q</span>
            </div>
            <div class="mt-2 text-white-50 small">
              {{ (availability/100).toFixed(2) }} × {{ (performance/100).toFixed(2) }} × {{ (quality/100).toFixed(2) }} = {{ (oee/100).toFixed(2) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3 PILLARS: A, P, Q -->
    <div class="row g-4 mb-4">
      <!-- Availability -->
      <div class="col-md-4">
        <div class="card shadow-sm border-0 h-100 border-top border-info border-4">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="card-title text-muted fw-bold">Availability</h5>
              <h2 class="text-info fw-bold mb-0">{{ availability }}%</h2>
            </div>
            <hr class="text-muted">
            <div class="calculation-box bg-light rounded p-3">
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-calculator me-1"></i> สูตรคำนวณ:</p>
              <code class="d-block text-dark mb-3 bg-white p-2 rounded border">Operating Time / Planned Time</code>
              
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-123 me-1"></i> แทนค่าจริง:</p>
              <div class="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
                <span class="text-info fw-bold">{{ operatingTime.toFixed(2) }} min</span>
                <span class="text-muted mx-2">÷</span>
                <span class="text-secondary fw-bold">{{ elapsed_minutes }} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance -->
      <div class="col-md-4">
        <div class="card shadow-sm border-0 h-100 border-top border-warning border-4">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="card-title text-muted fw-bold">Performance</h5>
              <h2 class="text-warning fw-bold mb-0">{{ performance }}%</h2>
            </div>
            <hr class="text-muted">
            <div class="calculation-box bg-light rounded p-3">
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-calculator me-1"></i> สูตรคำนวณ:</p>
              <code class="d-block text-dark mb-3 bg-white p-2 rounded border">(Ideal Cycle Time × Total Output) / Operating Time</code>
              
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-123 me-1"></i> แทนค่าจริง:</p>
              <div class="d-flex align-items-center justify-content-between bg-white p-2 rounded border text-center">
                <span>
                  <span class="text-warning fw-bold">({{ idealCycleTime }}</span>
                  <span class="text-muted mx-1">×</span>
                  <span class="text-warning fw-bold">{{ totalOutput }})</span>
                </span>
                <span class="text-muted mx-2">÷</span>
                <span class="text-secondary fw-bold">{{ operatingTime.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quality -->
      <div class="col-md-4">
        <div class="card shadow-sm border-0 h-100 border-top border-success border-4">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="card-title text-muted fw-bold">Quality</h5>
              <h2 class="text-success fw-bold mb-0">{{ quality }}%</h2>
            </div>
            <hr class="text-muted">
            <div class="calculation-box bg-light rounded p-3">
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-calculator me-1"></i> สูตรคำนวณ:</p>
              <code class="d-block text-dark mb-3 bg-white p-2 rounded border">Good Count / Total Output</code>
              
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-123 me-1"></i> แทนค่าจริง:</p>
              <div class="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
                <span class="text-success fw-bold">{{ goodCount }} pcs</span>
                <span class="text-muted mx-2">÷</span>
                <span class="text-secondary fw-bold">{{ totalOutput }} pcs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RAW DATA SOURCES (Time & Output) -->
    <div class="row g-4 mb-4">
      <!-- Time Variables -->
      <div class="col-md-6">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-header bg-white py-3">
            <h5 class="mb-0 fw-bold"><i class="bi bi-clock-history me-2 text-primary"></i>Time Breakdown</h5>
          </div>
          <div class="card-body">
            <div class="row text-center g-3">
              <div class="col-4">
                <div class="p-3 bg-light rounded h-100 border">
                  <h6 class="text-muted small">Planned Time</h6>
                  <h4 class="mb-0">{{ elapsed_minutes }}</h4>
                  <small class="text-muted">mins</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-danger bg-opacity-10 rounded h-100 border border-danger border-opacity-25">
                  <h6 class="text-danger small">Downtime</h6>
                  <h4 class="text-danger mb-0">{{ downtime }}</h4>
                  <small class="text-danger">mins</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-info bg-opacity-10 rounded h-100 border border-info border-opacity-25">
                  <h6 class="text-info small">Operating Time</h6>
                  <h4 class="text-info mb-0">{{ operatingTime.toFixed(2) }}</h4>
                  <small class="text-info">mins</small>
                </div>
              </div>
            </div>

            <!-- Downtime Details List -->
            <div v-if="downtimeProducts.length > 0" class="mt-3 p-3 bg-light rounded border" style="max-height: 150px; overflow-y: auto;">
              <h6 class="text-muted small fw-bold mb-2">Downtime Details:</h6>
              <div v-for="item in downtimeProducts" :key="item.id" class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                <div>
                  <span class="fw-bold text-dark">{{ item.product_name || item.name || '-' }}</span>
                  <br>
                  <small class="text-muted">{{ item.start_time || '-' }} - {{ item.end_time || '-' }}</small>
                </div>
                <span class="badge bg-danger rounded-pill">{{ item.duration || '-' }} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Output Variables -->
      <div class="col-md-6">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-header bg-white py-3">
            <h5 class="mb-0 fw-bold"><i class="bi bi-box-seam me-2 text-primary"></i>Production Output</h5>
          </div>
          <div class="card-body">
            <div class="row text-center g-3 mb-3">
              <div class="col-4">
                <div class="p-3 bg-light rounded h-100 border">
                  <h6 class="text-muted small">Total Output</h6>
                  <h4 class="mb-0">{{ totalOutput }}</h4>
                  <small class="text-muted">pcs</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-danger bg-opacity-10 rounded h-100 border border-danger border-opacity-25">
                  <h6 class="text-danger small">Reject</h6>
                  <h4 class="text-danger mb-0">{{ totalReject }}</h4>
                  <small class="text-danger">pcs</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-success bg-opacity-10 rounded h-100 border border-success border-opacity-25">
                  <h6 class="text-success small">Good Count</h6>
                  <h4 class="text-success mb-0">{{ goodCount }}</h4>
                  <small class="text-success">pcs</small>
                </div>
              </div>
            </div>
            <div class="p-3 bg-light rounded border d-flex justify-content-between align-items-center">
              <span class="text-muted fw-bold">Ideal Cycle Time</span>
              <span class="badge bg-warning text-dark fs-6">{{ idealCycleTime }} minutes / pc</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PLC STATUS -->
    <div class="card shadow-sm border-0">
      <div class="card-header bg-white py-3">
        <h5 class="mb-0 fw-bold text-muted"><i class="bi bi-cpu me-2"></i>PLC Real-time Status</h5>
      </div>
      <div class="card-body">
        <div class="row g-3 text-center">
          <!-- Output Status -->
          <div class="col-md-4">
            <div class="p-3 border rounded">
              <h6 class="text-muted small text-uppercase">Output Signal</h6>
              <div class="my-2">
                <span v-if="latestPLCLog.plc_onoff_value === 1" class="badge bg-success px-4 py-2 fs-5">ON</span>
                <span v-else class="badge bg-danger px-4 py-2 fs-5">OFF</span>
              </div>
              <small class="text-muted d-block font-monospace bg-light p-1 rounded">{{ plcAddresses.plc_address_output || 'Address N/A' }}</small>
            </div>
          </div>
          
          <!-- Active Status -->
          <div class="col-md-4">
            <div class="p-3 border rounded border-info">
              <h6 class="text-info small text-uppercase fw-bold">Active Model</h6>
              <div class="my-2">
                <span class="badge bg-info px-4 py-2 fs-5">{{ latestPLCLog.plc_active_value || '-' }}</span>
              </div>
              <small class="text-dark fw-bold d-block mb-1">{{ getProductNameById(latestPLCLog.plc_active_value) }}</small>
              <small class="text-muted d-block font-monospace bg-light p-1 rounded">{{ plcAddresses.plc_address_active || 'Address N/A' }}</small>
            </div>
          </div>
          
          <!-- Complete Status -->
          <div class="col-md-4">
            <div class="p-3 border rounded">
              <h6 class="text-muted small text-uppercase">Complete Signal</h6>
              <div class="my-2">
                <span v-if="latestPLCLog.plc_complete_value === 1" class="badge bg-success px-4 py-2 fs-5">ON</span>
                <span v-else class="badge bg-danger px-4 py-2 fs-5">OFF</span>
              </div>
              <small class="text-muted d-block font-monospace bg-light p-1 rounded">{{ plcAddresses.plc_address_complete || 'Address N/A' }}</small>
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
      totalReject: 0,
      goodCount: 0,
      operatingTime: 0, // เพิ่มเข้ามาใน Data เพื่อให้ Template เรียกใช้ได้ง่าย
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
        this.totalReject = product.reject_output || 0;
        this.goodCount = Math.max(0, this.totalOutput - this.totalReject);
        
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
      const date = now.toISOString().split('T')[0]; 
      const currentTime = now.toTimeString().slice(0, 5); 
      try {
        const res = await fetch(`${BASE_API}/api/working-time/planned-production?date=${date}&current_time=${currentTime}`);
        if (!res.ok) throw new Error("Failed to load operating time");
        const data = await res.json();
        
        this.elapsed_minutes = data.breakdown.elapsed_minutes || 0;
        
        this.calculateOEE();
      } catch (err) {
        console.error(err);
      }
    },
    async loadDowntimeProducts() {
      if (!this.selectedProductId) return;
      try {
        const now = new Date();
        const date = now.toISOString().split('T')[0]; 
        const startTime = `${date}T00:00:00.000Z`;
        const endTime = `${date}T23:59:59.999Z`;
        
        const res = await fetch(
          `${BASE_API}/api/downtime-products/${this.selectedProductId}?start=${startTime}&end=${endTime}`
        );
        if (!res.ok) throw new Error("Failed to load downtime products");
        const data = await res.json();
        this.downtimeProducts = data.data || data;
        this.downtime = data.downtime_minutes || 0;
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
        }
      } catch (err) {
        console.error("Load latest PLC log error:", err);
      }
    },
    calculateOEE() {
      // 1. Availability Calculation
      if (this.elapsed_minutes <= 0) {
        this.availability = 0;
        this.operatingTime = 0;
      } else {
        this.operatingTime = Math.max(0, this.elapsed_minutes - this.downtime);
        this.availability = ((this.operatingTime / this.elapsed_minutes) * 100).toFixed(2);
      }

      // 2. Performance Calculation
      if (this.operatingTime <= 0 || this.idealCycleTime <= 0) {
        this.performance = 0;
      } else {
        this.performance = (((this.idealCycleTime * this.totalOutput) / this.operatingTime) * 100).toFixed(2);
      }

      // 3. Quality Calculation
      this.goodCount = Math.max(0, this.totalOutput - this.totalReject);
      if (this.totalOutput <= 0) {
        this.quality = 0;
      } else {
        this.quality = ((this.goodCount / this.totalOutput) * 100).toFixed(2);
      }

      // 4. Total OEE Calculation
      this.oee = ((this.availability * this.performance * this.quality) / 10000).toFixed(2);
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
.tracking-wide {
  letter-spacing: 0.15em;
}
.calculation-box {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
}
code {
  font-family: var(--bs-font-monospace);
  font-size: 0.875em;
  color: #d63384;
  word-wrap: break-word;
}
</style>