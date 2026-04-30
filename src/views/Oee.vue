<template>
  <div class="container-fluid mt-4">
    <div>
      <h3 class="page-title">
        <i class="bi bi-bar-chart-line page-title-icon me-2"></i>OEE Dashboard
      </h3>
      <p class="page-title-subtitle mb-4">Overall Equipment Effectiveness Monitoring</p>
    </div>

    <div class="row g-4 mb-4">
      <div class="col-md-3">
        <div class="card bg-primary text-white shadow-sm h-100">
          <div class="card-body text-center">
            <h6 class="card-title text-white-50">OEE</h6>
            <h2 class="mb-0">{{ oee }}%</h2>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card bg-info text-white shadow-sm h-100">
          <div class="card-body text-center">
            <h6 class="card-title text-white-50">Availability</h6>
            <h2 class="mb-0">{{ availability }}%</h2>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card bg-warning text-dark shadow-sm h-100">
          <div class="card-body text-center">
            <h6 class="card-title text-dark-50">Performance</h6>
            <h2 class="mb-0">{{ performance }}%</h2>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card bg-success text-white shadow-sm h-100">
          <div class="card-body text-center">
            <h6 class="card-title text-white-50">Quality</h6>
            <h2 class="mb-0">{{ quality }}%</h2>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
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
          <div class="col-md-3">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Ideal Cycle Time</h6>
              <h5 class="mb-0">{{ idealCycleTime }}</h5>
              <p class="text-muted mb-0">minutes</p>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Total Output</h6>
              <h5 class="mb-0">{{ totalOutput }}</h5>
              <p class="text-muted mb-0">units</p>
              <small class="text-muted d-block mt-1">Reject: {{ totalReject }}</small>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Good Count</h6>
              <h5 class="mb-0">{{ goodCount }}</h5>
              <p class="text-muted mb-0">units</p>
            </div>
          </div>
          <div class="col-md-3">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2 text-primary fw-bold">Performance</h6>
              <h5 class="mb-0 text-primary">{{ performance }}</h5>
              <p class="text-muted mb-0">%</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-sm mt-4">
      <div class="card-header">
        <h5 class="mb-0">Operating Time </h5>
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
                <h5 class="mb-0">{{ downtime }}</h5>
                <p class="text-muted mb-0">minutes</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="p-3 bg-light rounded">
              <h6 class="text-muted mb-2">Operating Time</h6>
              <h5 class="mb-0">{{ Math.max(0, elapsed_minutes - downtime).toFixed(2) }}</h5>
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
      totalReject: 0,
      goodCount: 0,
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
        this.totalReject = product.reject_output || 0;
        this.goodCount = Math.max(0, this.totalOutput - this.totalReject);
        
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
        
        this.elapsed_minutes = data.breakdown.elapsed_minutes || 0;
        // this.downtime = data.downtime_minutes || 0;
        
        // อัปเดตการคำนวณ OEE ทุกครั้งที่ดึงเวลาใหม่
        this.calculateOEE();
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
        this.downtime = data.downtime_minutes
        // console.log("Downtime products loaded:", this.downtimeProducts);  
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
      let currentOperatingTime = 0;
      if (this.elapsed_minutes <= 0) {
        this.availability = 0;
      } else {
        currentOperatingTime = Math.max(0, this.elapsed_minutes - this.downtime);
        // alert(`Current Operating Time: ${currentOperatingTime} minutes (Elapsed: ${this.elapsed_minutes} - Downtime: ${this.downtime})`);
        this.availability = ((currentOperatingTime / this.elapsed_minutes) * 100).toFixed(2);
      }

      // 2. Performance Calculation (ย้ายสูตรจาก Template มาที่นี่)
      if (currentOperatingTime <= 0 || this.idealCycleTime <= 0) {
        this.performance = 0;
      } else {
        // Performance = (Ideal Cycle Time * Total Output) / Operating Time
        // ถ้าค่าเกิน 100% (เช่นทำเร็วกว่ามาตรฐาน) สามารถครอบด้วย Math.min(100, ค่าที่ได้) ได้ แต่ในแง่โรงงานส่วนใหญ่จะปล่อยให้เกินเพื่อดูความจริง
        this.performance = (((this.idealCycleTime * this.totalOutput) / currentOperatingTime) * 100).toFixed(2);
      }

      // 3. Quality Calculation
      // Good Count = Total Output - Reject
      // Quality = (Good Count / Total Output) * 100
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
/* ถ้าต้องการใส่สีสันหรือปรับแต่งเพิ่มเติมสามารถเขียน CSS ตรงนี้ได้ครับ */
</style>