<template>
  <div class="container-fluid mt-4">
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
      <h3 class="mb-1 text-primary fw-bold d-flex align-items-center">
          <i class="bi bi-clock-history me-2"></i>Interaction Layout
      </h3>
      <button class="btn btn-primary" @click="showAddElementModal = true">
        <i class="bi bi-plus-circle me-1"></i> Add Element
      </button>
    </div>

    <div class="layout-selector">
        <label for="layout-select">Select Layout:</label>
        <select 
          id="layout-select" 
          v-model="selectedLayoutId" 
          @change="onLayoutChange"
        >
          <option value="" disabled>-- Select a layout --</option>
          <option 
            v-for="layout in layouts" 
            :key="layout.id" 
            :value="layout.id"
          >
            {{ layout.name || layout.id }}
          </option>
        </select>
      </div>

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
            :name="element.name"
            :addressId="element.address_id"
            @toggle="(newValue) => handleLampToggle(element, newValue)"
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
            :name="element.name"
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
            :decimals="element.precision"
            :value="getValue(element.address_id)"
            :minValue="getDeviceMinMax(element.address_id).min"
            :maxValue="getDeviceMinMax(element.address_id).max"
            :alarms="getDeviceMinMax(element.address_id).alarms"
            :editable="true"
            :addressId="element.address_id"
            :name="element.name"
            @update-value="handleNumberUpdate"
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
            :name="element.name"
            @click="writePlcValue(element)"
          />

          <LevelProgressBar
            v-else-if="element.element_type === 'level_progress_bar'"
            :x_percent="parseFloat(element.x_percent)"
            :y_percent="parseFloat(element.y_percent)"
            :size="calculateSize(element)"
            :bgColor="element.bg_color"
            :textColor="element.text_color"
            :barColor="element.bar_color"
            :unit="element.unit"
            :decimals="element.precision"
            :value="getValue(element.address_id)"
            :levels="getDeviceLevels(element.address_id)"
            :editable="true"
            :addressId="element.address_id"
            :name="element.name"
            @update-value="handleNumberUpdate"
          />
        </template>
      </div>
    </div>

    <!-- Add Element Modal -->
    <AddElementModal 
      v-if="showAddElementModal" 
      :layoutId="selectedLayoutId"
      @close="showAddElementModal = false"
      @saved="onElementSaved"
    />
  </div>
</template>

<script>
import StatusLamp from '../components/interaction/StatusLamp.vue'
import NumberDisplay from '../components/interaction/NumberDisplay.vue'
import GaugeDisplay from '../components/interaction/GaugeDisplay.vue'
import ControlButton from '../components/interaction/ControlButton.vue'
import LevelProgressBar from '../components/interaction/LevelProgressBar.vue'
import AddElementModal from './AddElementModal.vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export default {
  name: 'Interaction',
  components: {
    StatusLamp,
    NumberDisplay,
    GaugeDisplay,
    ControlButton,
    LevelProgressBar,
    AddElementModal
  },
  emits: ['update-device'],
  props: {
    devices: { type: Array, default: () => [] },
    isSimulate: { type: Boolean, default: false }
  },
  data() {
    return {
      layoutData: null,
      loading: true,
      error: null,
      plcValues: {},
      backgroundImage: null,
      layouts: [],
      selectedLayoutId: 3,
      showAddElementModal: false
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
    async fetchLayouts() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/interaction/layouts`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        this.layouts = await response.json()
      } catch (error) {
        console.error('Failed to fetch layouts:', error)
      }
    },
    onLayoutChange() {
      this.fetchLayoutData()
    },
    onElementSaved() {
      // Close modal and refresh layout data
      this.showAddElementModal = false
      this.fetchLayoutData()
    },
    async fetchLayoutData(layoutId = null) {
      const id = layoutId || this.selectedLayoutId
      if (!id) {
        this.loading = false
        return
      }
      
      try {
        this.loading = true
        this.error = null
        
        const response = await fetch(`${API_BASE_URL}/api/interaction/layouts/${id}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        this.layoutData = await response.json()
        
        // Set background image from API response
        if (this.layoutData.machine_image) {
          this.backgroundImage = this.layoutData.machine_image
        }
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
      if (!addressId || !this.devices) return { min: 0, max: 100, alarms: [] }
      
      const device = this.devices.find(d => d.address_id === addressId)
      if (!device || !device.numberConfig) return { min: 0, max: 100, alarms: [] }
      
      return {
        min: device.numberConfig.min_value ?? 0,
        max: device.numberConfig.max_value ?? 100,
        alarms: device.alarms || []
      }
    },
    getDeviceLevels(addressId) {
      if (!addressId || !this.devices) return []
      
      const device = this.devices.find(d => d.address_id === addressId)
      console.log('Device for levels:', device)
      if (!device) return []
      
      return device.levelConfigs || []
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

      // Simulate mode: Update local value without calling API
      if (this.isSimulate) {
        console.log('[Simulate Mode] Updating local value:', { address_id: element.address_id, value: newValue })
        this.plcValues[element.address_id] = newValue
        this.$emit('update-device', { address_id: element.address_id, value: newValue })
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
      console.log('handleNumberUpdate called:', { addressId, value })
      
      const plcAddress = this.getPlcAddress(addressId)
      console.log('plcAddress:', plcAddress)
      
      if (!plcAddress) {
        console.error('No PLC address found for this element')
        return
      }

      // Simulate mode: Update local value without calling API
      if (this.isSimulate) {
        console.log('[Simulate Mode] Updating local value:', { addressId, value })
        this.plcValues[addressId] = value
        this.$emit('update-device', { address_id: addressId, value: value })
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
    },
    async handleLampToggle(element, newValue) {
      const plcAddress = this.getPlcAddress(element.address_id)
      
      if (!plcAddress) {
        console.error('No PLC address found for this element')
        return
      }

      // Simulate mode: Update local value without calling API
      if (this.isSimulate) {
        console.log('[Simulate Mode] Lamp toggle:', { address_id: element.address_id, value: newValue ? 1 : 0 })
        this.plcValues[element.address_id] = newValue ? 1 : 0
        this.$emit('update-device', { address_id: element.address_id, value: newValue ? 1 : 0 })
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
            value: newValue ? 1 : 0
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log('PLC write successful:', result)

        // Update local value
        this.plcValues[element.address_id] = newValue ? 1 : 0

        // Emit event to update parent
        this.$emit('update-device', { address_id: element.address_id, value: newValue ? 1 : 0 })
      } catch (error) {
        console.error('Failed to write to PLC:', error)
        alert('Failed to write to PLC: ' + error.message)
      }
    }
  },
  mounted() {
    this.fetchLayouts()
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
/* Component-specific styles only */
/* Note: Shared styles are imported from src/assets/shared-styles.css */
</style>
