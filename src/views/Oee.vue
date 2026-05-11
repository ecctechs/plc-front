<template>
  <div class="container-fluid mt-4 pb-5">
    <!-- Header & Product Selector -->
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
      <div>
        <h2 class="page-title fw-bold text-primary mb-1">
          <i class="bi bi-bar-chart-line-fill me-2"></i>{{ locale.t('OEE Dashboard') }}
        </h2>
        <p class="text-muted mb-0">{{ locale.t('Overall Equipment Effectiveness Monitoring') }}</p>
      </div>
      
      <div class="card shadow-sm border-0 bg-white" style="min-width: 300px;">
        <div class="card-body p-3">
          <label class="form-label text-muted small fw-bold mb-1">{{ locale.t('SELECT PRODUCT') }}</label>
          <select class="form-select form-select-lg" v-model="selectedProductId" @change="loadProductData">
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- MAIN OEE SCORE -->
<div class="row mb-4">
    <div class="col-12">
      <div class="card border-0 oee-card bg-white">
        <div class="card-body text-center py-5">
          <!-- หัวข้อ -->
          <h6 class="text-uppercase fw-bold oee-subtitle mb-3">
            {{ locale.t('Overall Equipment Effectiveness') }}
          </h6>
          
          <!-- ตัวเลขหลัก OEE -->
          <h1 class="display-1 fw-bolder oee-value mb-4">
            {{ oee }}<span class="fs-3 text-muted ms-1">%</span>
          </h1>
          
          <!-- สูตรคำนวณแบบ Pill -->
          <div class="d-inline-flex align-items-center formula-pill px-4 py-2 mb-2">
            <span class="fs-6 text-muted fw-medium">{{ locale.t('OEE = ') }}</span>
            <span class="fs-5 ms-3 text-theme-blue fw-bold">A</span> 
            <span class="mx-2 text-muted fw-light">×</span> 
            <span class="fs-5 text-theme-orange fw-bold">P</span> 
            <span class="mx-2 text-muted fw-light">×</span> 
            <span class="fs-5 text-theme-green fw-bold">Q</span>
          </div>
          
          <!-- รายละเอียดตัวเลข -->
          <div class="mt-2 text-muted small fw-medium">
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
              <h5 class="card-title text-muted fw-bold">{{ locale.t('Availability') }}</h5>
              <h2 class="text-info fw-bold mb-0">{{ availability }}%</h2>
            </div>
            <hr class="text-muted">
            <div class="calculation-box bg-light rounded p-3">
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-calculator me-1"></i> {{ locale.t('Calculation Formula:') }}</p>
              <code class="d-block text-dark mb-3 bg-white p-2 rounded border">{{ locale.t('Operating Time / Planned Time') }}</code>
              
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-123 me-1"></i> {{ locale.t('Actual Values:') }}</p>
              <div class="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
                <span class="text-info fw-bold">{{ operatingTime.toFixed(2) }} {{ locale.t('min') }}</span>
                <span class="text-muted mx-2">{{ locale.t('÷') }}</span>
                <span class="text-secondary fw-bold">{{ elapsed_minutes }} {{ locale.t('min') }}</span>
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
              <h5 class="card-title text-muted fw-bold">{{ locale.t('Performance') }}</h5>
              <h2 class="text-warning fw-bold mb-0">{{ performance }}%</h2>
            </div>
            <hr class="text-muted">
            <div class="calculation-box bg-light rounded p-3">
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-calculator me-1"></i> {{ locale.t('Calculation Formula:') }}</p>
              <code class="d-block text-dark mb-3 bg-white p-2 rounded border">{{ locale.t('(Ideal Cycle Time × Total Output) / Operating Time') }}</code>
              
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-123 me-1"></i> {{ locale.t('Actual Values:') }}</p>
              <div class="d-flex align-items-center justify-content-between bg-white p-2 rounded border text-center">
                <span>
                  <span class="text-warning fw-bold">({{ idealCycleTime }}</span>
                  <span class="text-muted mx-1">{{ locale.t('×') }}</span>
                  <span class="text-warning fw-bold">{{ totalOutput }})</span>
                </span>
                <span class="text-muted mx-2">{{ locale.t('÷') }}</span>
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
              <h5 class="card-title text-muted fw-bold">{{ locale.t('Quality') }}</h5>
              <h2 class="text-success fw-bold mb-0">{{ quality }}%</h2>
            </div>
            <hr class="text-muted">
            <div class="calculation-box bg-light rounded p-3">
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-calculator me-1"></i> {{ locale.t('Calculation Formula:') }}</p>
              <code class="d-block text-dark mb-3 bg-white p-2 rounded border">{{ locale.t('Good Count / Total Output') }}</code>
              
              <p class="text-muted small mb-1 fw-bold"><i class="bi bi-123 me-1"></i> {{ locale.t('Actual Values:') }}</p>
              <div class="d-flex align-items-center justify-content-between bg-white p-2 rounded border">
                <span class="text-success fw-bold">{{ goodCount }} {{ locale.t('pcs') }}</span>
                <span class="text-muted mx-2">{{ locale.t('÷') }}</span>
                <span class="text-secondary fw-bold">{{ totalOutput }} {{ locale.t('pcs') }}</span>
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
            <h5 class="mb-0 fw-bold"><i class="bi bi-clock-history me-2 text-primary"></i>{{ locale.t('Time Breakdown') }}</h5>
          </div>
          <div class="card-body">
            <div class="row text-center g-3">
              <div class="col-4">
                <div class="p-3 bg-light rounded h-100 border">
                  <h6 class="text-muted small">{{ locale.t('Planned Time') }}</h6>
                  <h4 class="mb-0">{{ elapsed_minutes }}</h4>
                  <small class="text-muted">{{ locale.t('mins') }}</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-danger bg-opacity-10 rounded h-100 border border-danger border-opacity-25">
                  <h6 class="text-danger small">{{ locale.t('Downtime') }}</h6>
                  <h4 class="text-danger mb-0">{{ downtime }}</h4>
                  <small class="text-danger">{{ locale.t('mins') }}</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-info bg-opacity-10 rounded h-100 border border-info border-opacity-25">
                  <h6 class="text-info small">{{ locale.t('Operating Time') }}</h6>
                  <h4 class="text-info mb-0">{{ operatingTime.toFixed(2) }}</h4>
                  <small class="text-info">{{ locale.t('mins') }}</small>
                </div>
              </div>
            </div>

            <!-- Downtime Details List -->
            <div v-if="downtimeProducts.length > 0" class="mt-3 p-3 bg-light rounded border" style="max-height: 150px; overflow-y: auto;">
              <h6 class="text-muted small fw-bold mb-2">{{ locale.t('Downtime Details:') }}</h6>
              <div v-for="item in downtimeProducts" :key="item.id" class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                <div>
                  <span class="fw-bold text-dark">{{ item.product_name || item.name || '-' }}</span>
                  <br>
                  <small class="text-muted">{{ item.start_time || '-' }} - {{ item.end_time || '-' }}</small>
                </div>
                <span class="badge bg-danger rounded-pill">{{ item.duration || '-' }} {{ locale.t('min') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Output Variables -->
      <div class="col-md-6">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-header bg-white py-3">
            <h5 class="mb-0 fw-bold"><i class="bi bi-box-seam me-2 text-primary"></i>{{ locale.t('Production Output') }}</h5>
          </div>
          <div class="card-body">
            <div class="row text-center g-3 mb-3">
              <div class="col-4">
                <div class="p-3 bg-light rounded h-100 border">
                  <h6 class="text-muted small">{{ locale.t('Total Output') }}</h6>
                  <h4 class="mb-0">{{ totalOutput }}</h4>
                  <small class="text-muted">{{ locale.t('pcs') }}</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-danger bg-opacity-10 rounded h-100 border border-danger border-opacity-25">
                  <h6 class="text-danger small">{{ locale.t('Reject') }}</h6>
                  <h4 class="text-danger mb-0">{{ totalReject }}</h4>
                  <small class="text-danger">{{ locale.t('pcs') }}</small>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-success bg-opacity-10 rounded h-100 border border-success border-opacity-25">
                  <h6 class="text-success small">{{ locale.t('Good Count') }}</h6>
                  <h4 class="text-success mb-0">{{ goodCount }}</h4>
                  <small class="text-success">{{ locale.t('pcs') }}</small>
                </div>
              </div>
            </div>
            <div class="p-3 bg-light rounded border d-flex justify-content-between align-items-center">
              <span class="text-muted fw-bold">{{ locale.t('Ideal Cycle Time') }}</span>
              <span class="badge bg-warning text-dark fs-6">{{ idealCycleTime }} {{ locale.t('minutes / pc') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

     <!-- PLC STATUS -->
     <div class="card shadow-sm border-0">
       <div class="card-header bg-white py-3">
         <h5 class="mb-0 fw-bold text-muted"><i class="bi bi-cpu me-2"></i>{{ locale.t('PLC Real-time Status') }}</h5>
       </div>
       <div class="card-body">
         <div class="row g-3 text-center">
           <!-- Output Status -->
           <div class="col-md-3">
             <div class="p-3 border rounded">
               <h6 class="text-muted small text-uppercase">{{ locale.t('Output Signal') }}</h6>
               <div class="my-2">
<span v-if="latestPLCLog.plc_onoff_value === 1" class="badge bg-success px-4 py-2 fs-5">{{ locale.t('ON') }}</span>
                  <span v-else class="badge bg-danger px-4 py-2 fs-5">{{ locale.t('OFF') }}</span>
               </div>
               <small class="text-muted d-block font-monospace bg-light p-1 rounded">{{ plcAddresses.plc_address_output || locale.t('Address N/A') }}</small>
             </div>
           </div>
           
           <!-- Active Status -->
           <div class="col-md-3">
             <div class="p-3 border rounded border-info">
               <h6 class="text-info small text-uppercase fw-bold">{{ locale.t('Active Model') }}</h6>
               <div class="my-2">
                 <span class="badge bg-info px-4 py-2 fs-5">{{ latestPLCLog.plc_active_value || '-' }}</span>
               </div>
               <small class="text-dark fw-bold d-block mb-1">{{ getProductNameById(latestPLCLog.plc_active_value) }}</small>
               <small class="text-muted d-block font-monospace bg-light p-1 rounded">{{ plcAddresses.plc_address_active || locale.t('Address N/A') }}</small>
             </div>
           </div>
           
           <!-- Complete Status -->
           <div class="col-md-3">
             <div class="p-3 border rounded">
               <h6 class="text-muted small text-uppercase">{{ locale.t('Complete Signal') }}</h6>
               <div class="my-2">
<span v-if="latestPLCLog.plc_complete_value === 1" class="badge bg-success px-4 py-2 fs-5">{{ locale.t('ON') }}</span>
                  <span v-else class="badge bg-danger px-4 py-2 fs-5">{{ locale.t('OFF') }}</span>
               </div>
               <small class="text-muted d-block font-monospace bg-light p-1 rounded">{{ plcAddresses.plc_address_complete || locale.t('Address N/A') }}</small>
             </div>
           </div>

           <!-- Reject Status -->
<div class="col-md-3">
              <div class="p-3 border rounded border-danger">
                <h6 class="text-danger small text-uppercase fw-bold">{{ locale.t('Reject Signal') }}</h6>
                <div class="my-2">
                  <span v-if="latestPLCLog.plc_reject_value === 1" class="badge bg-success px-4 py-2 fs-5">{{ locale.t('ON') }}</span>
                  <span v-else class="badge bg-danger px-4 py-2 fs-5">{{ locale.t('OFF') }}</span>
                </div>
                <small class="text-muted d-block font-monospace bg-light p-1 rounded">{{ plcAddresses.plc_address_reject || locale.t('Address N/A') }}</small>
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
         plc_address_complete: null,
         plc_address_reject: null
       },
       downtimeProducts: [],
       latestPLCLog: {
         plc_onoff_value: null,
         plc_active_value: null,
         plc_complete_value: null,
         plc_reject_value: null,
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
           plc_address_complete: product.plc_address_complete || null,
           plc_address_reject: product.plc_address_reject || null
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
             plc_reject_value: data.data.plc_reject_value,
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

/* การ์ดหลัก - พื้นขาว ขอบมน และเงาอมฟ้าอ่อนๆ */
.oee-card {
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.08) !important;
  transition: transform 0.3s ease;
}

/* หัวข้อ - สีเทาอมฟ้า ให้ดูซอฟต์ ไม่แย่งความสนใจ */
.oee-subtitle {
  color: #64748b; 
  letter-spacing: 1.5px;
  font-size: 0.85rem;
}

/* ตัวเลข OEE - สีน้ำเงินเข้ม (Navy) ให้ตัดกับพื้นขาวชัดเจน */
.oee-value {
  color: #1e3a8a; 
  letter-spacing: -2px;
}

/* กล่องสูตร (Pill) - พื้นหลังสีเทาอ่อนมากๆ เส้นขอบบางๆ */
.formula-pill {
  background-color: #f8fafc; 
  border: 1px solid #e2e8f0;
  border-radius: 50px;
}

/* ปรับสีตัวอักษร A P Q ให้เป็นโทนพาสเทลที่ดูพรีเมียมขึ้น */
.text-theme-blue { color: #3b82f6; }   /* ฟ้า */
.text-theme-orange { color: #f59e0b; } /* ส้ม/เหลืองเข้ม */
.text-theme-green { color: #10b981; }  /* เขียวมิ้นต์ */
</style>