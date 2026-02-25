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
            :isOn="getValue(element.address_id) !== 0"
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
            :value="getValue(element.address_id)"
            :editable="true"
            :addressId="element.address_id"
            @update-value="handleNumberUpdate"
          />
          
          <GaugeDisplay
            v-else-if="element.element_type === 'gauge_display'"
            :x_percent="parseFloat(element.x_percent)"
            :y_percent="parseFloat(element.y_percent)"
            :size="calculateSize(element)"
            :bgColor="element.bg_color"
            :textColor="element.text_color"
            :unit="element.unit"
            :decimals="getDeviceMinMax(element.address_id).decimal_places"
            :value="getValue(element.address_id)"
            :minValue="getDeviceMinMax(element.address_id).min"
            :maxValue="getDeviceMinMax(element.address_id).max"
            :alarms="getDeviceMinMax(element.address_id).alarms"
            :scale="getDeviceMinMax(element.address_id).scale"
            :offset="getDeviceMinMax(element.address_id).offset"
            :addressId="element.address_id"
          />
          
          <ControlButton 
            v-else-if="element.element_type === 'control_button'"
            :x_percent="parseFloat(element.x_percent)"
            :y_percent="parseFloat(element.y_percent)"
            :size="calculateSize(element)"
            :label="getButtonLabel(element)"
            :activeColor="element.active_color"
            :inactiveColor="element.inactive_color"
            :isPressed="getValue(element.address_id) !== 0"
            @click="writePlcValue(element)"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import StatusLamp from '../components/interaction/StatusLamp.vue'
import NumberDisplay from '../components/interaction/NumberDisplay.vue'
import GaugeDisplay from '../components/interaction/GaugeDisplay.vue'
import ControlButton from '../components/interaction/ControlButton.vue'
import tpmLine from '../img/tpm_line.png'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export default {
  name: 'Interaction',
  components: {
    StatusLamp,
    NumberDisplay,
    GaugeDisplay,
    ControlButton
  },
  props: {
    devices: { type: Array, default: () => [] }
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
  watch: {
    devices: {
      deep: true,
      handler(newVal) {
        this.updatePlcValuesFromDevices(newVal)
      }
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
    getButtonLabel(element) {
      const value = this.getValue(element.address_id)
      return value === 0 ? 'START' : 'STOP'
    },
    calculateSize(element) {
      const baseSize = element.size_width || 50
      return baseSize / 10
    },
    getValue(addressId) {
      if (!addressId) return 0
      return this.plcValues[addressId] ?? 0
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
      } catch (error) {
        console.error('Failed to fetch layout data:', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },
    updatePlcValuesFromDevices(devices) {
      if (!devices || devices.length === 0) return
      
      const values = {}
      devices.forEach(device => {
        if (device.address_id) {
          values[device.address_id] = device.last_value
        }
      })
      this.plcValues = values
      console.log('Updated PLC values:', this.plcValues)
    },
    getPlcAddress(addressId) {
      if (!addressId || !this.devices) return null
      
      const device = this.devices.find(d => d.address_id === addressId)
      return device ? device.plc_address : null
    },
    getDeviceMinMax(addressId) {
      if (!addressId || !this.devices) return { min: 0, max: 100, alarms: [], scale: 1, offset: 0, decimal_places: 0 }
      
      const device = this.devices.find(d => d.address_id === addressId)
      if (!device || !device.numberConfig) return { min: 0, max: 100, alarms: [], scale: 1, offset: 0, decimal_places: 0 }
      
      return {
        min: device.numberConfig.min_value ?? 0,
        max: device.numberConfig.max_value ?? 100,
        alarms: device.alarms || [],
        scale: device.numberConfig.scale ?? 1,
        offset: device.numberConfig.offset ?? 0,
        decimal_places: device.numberConfig.decimal_places ?? 0
      }
    },
    async writePlcValue(element) {
      if (!element || !element.address_id) {
        console.error('No address_id defined for this element')
        return
      }

      const plcAddress = this.getPlcAddress(element.address_id)
      if (!plcAddress) {
        console.error('No PLC address found for this element')
        return
      }

      // Toggle the value (0 -> 1 or 1 -> 0)
      const currentValue = this.getValue(element.address_id)
      const newValue = currentValue === 0 ? 1 : 0

      try {
        const response = await fetch(`${API_BASE_URL}/api/plc/write`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            address: plcAddress,
            value: newValue
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log('PLC write successful:', result)

        // Update local value
        this.plcValues[element.address_id] = newValue

        // Emit event to update parent
        this.$emit('update-device', { address_id: element.address_id, value: newValue })
      } catch (error) {
        console.error('Failed to write to PLC:', error)
        alert('Failed to write to PLC: ' + error.message)
      }
    },
    async handleNumberUpdate({ addressId, value }) {
      const plcAddress = this.getPlcAddress(addressId)
      
      if (!plcAddress) {
        console.error('No PLC address found for this element')
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/plc/write`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            address: plcAddress,
            value: value
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log('PLC write successful:', result)

        // Update local value
        this.plcValues[addressId] = value

        // Emit event to update parent
        this.$emit('update-device', { address_id: addressId, value: value })
      } catch (error) {
        console.error('Failed to write to PLC:', error)
        alert('Failed to write to PLC: ' + error.message)
      }
    }
  },
  mounted() {
    this.fetchLayoutData()
    this.updatePlcValuesFromDevices(this.devices)
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
