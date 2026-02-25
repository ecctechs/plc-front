<template>
  <div class="interaction-page">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="image-container">
      <div 
        class="machine-background"
        :style="containerStyle"
      >
        <!-- Dynamic Elements -->
        <template v-for="element in visibleElements" :key="element.id">
          <StatusLamp 
            v-if="element.element_type === 'status_lamp'"
            :x_percent="parseFloat(element.x_percent)"
            :y_percent="parseFloat(element.y_percent)"
            :size="calculateSize(element)"
            :bgColor="element.bg_color"
            :inactiveColor="element.inactive_color"
            :deviceId="element.device_id"
            :addressId="element.address_id"
          />
          
          <NumberDisplay 
            v-else-if="element.element_type === 'number_display'"
            :x_percent="parseFloat(element.x_percent)"
            :y_percent="parseFloat(element.y_percent)"
            :size="calculateSize(element)"
            :bgColor="element.bg_color"
            :textColor="element.text_color"
            :unit="element.unit"
            :decimals="element.precision"
            :deviceId="element.device_id"
            :addressId="element.address_id"
          />
          
          <ControlButton 
            v-else-if="element.element_type === 'control_button'"
            :x_percent="parseFloat(element.x_percent)"
            :y_percent="parseFloat(element.y_percent)"
            :size="calculateSize(element)"
            :label="element.button_label"
            :activeColor="element.active_color"
            :inactiveColor="element.inactive_color"
            :deviceId="element.device_id"
            :addressId="element.address_id"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import StatusLamp from '../components/interaction/StatusLamp.vue'
import NumberDisplay from '../components/interaction/NumberDisplay.vue'
import ControlButton from '../components/interaction/ControlButton.vue'
import tpmLine from '../img/tpm_line.png'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export default {
  name: 'Interaction',
  components: {
    StatusLamp,
    NumberDisplay,
    ControlButton
  },
  data() {
    return {
      layoutData: null,
      loading: true,
      error: null,
      plcValues: {},
      backgroundImage: tpmLine,
    }
  },
  computed: {
    containerStyle() {
      if (!this.layoutData) return {}

      return {
        aspectRatio: `${this.layoutData.aspect_ratio_width} / ${this.layoutData.aspect_ratio_height}`,
        backgroundImage: `url(${this.backgroundImage})`
      }
    },
    visibleElements() {
      if (!this.layoutData || !this.layoutData.elements) return []
      return this.layoutData.elements.filter(el => el.is_visible)
    }
  },
  methods: {
    calculateSize(element) {
      // Calculate responsive size based on element size_width
      // Using vmin to keep consistent across all screen sizes
      const baseSize = element.size_width || 50
      return baseSize / 10 // Convert pixel size to responsive unit
    },
    async fetchLayoutData() {
      try {
        this.loading = true
        this.error = null
        
        const response = await fetch(`${API_BASE_URL}/api/interaction/layouts/1`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        this.layoutData = await response.json()
        
        // Fetch PLC values for all devices
        // await this.fetchPlcValues()
      } catch (error) {
        console.error('Failed to fetch layout data:', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    async fetchPlcValues() {
      if (!this.layoutData || !this.layoutData.elements) return
      
      // Group addresses by device
      const deviceAddresses = {}
      this.layoutData.elements.forEach(el => {
        if (el.device_id && el.address_id) {
          if (!deviceAddresses[el.device_id]) {
            deviceAddresses[el.device_id] = []
          }
          deviceAddresses[el.device_id].push(el.address_id)
        }
      })
      
      // Fetch values for each device
      for (const [deviceId, addressIds] of Object.entries(deviceAddresses)) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/plc/${deviceId}/read?addresses=${addressIds.join(',')}`
          )
          if (response.ok) {
            const data = await response.json()
            this.plcValues = { ...this.plcValues, ...data.values }
          }
        } catch (error) {
          console.error(`Failed to fetch PLC values for device ${deviceId}:`, error)
        }
      }
    }
  },
  mounted() {
    this.fetchLayoutData()
    
    // // Poll for PLC values every 1 second
    // this.pollingInterval = setInterval(() => {
    //   this.fetchPlcValues()
    // }, 1000)
  },
  beforeUnmount() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
    }
  }
}
</script>

<style scoped>
.interaction-page {
  width: 100%;
  height: calc(100vh - 140px);
  padding: 0;
  margin: 0;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.machine-background {
  position: relative;
  width: 100%;
  max-width: 1200px;
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.loading,
.error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.5rem;
  color: #666;
}

.error {
  color: #e74c3c;
}
</style>
