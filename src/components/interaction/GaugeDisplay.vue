<template>
  <div 
    class="gauge-display"
    :class="{ 'is-editable': editable }"
    :style="containerStyle"
    @click="startEditing"
  >
    <div v-if="name" class="gauge-name">{{ name }}</div>
    <canvas ref="gaugeCanvas" :id="canvasId"></canvas>
    <div v-if="!editing && showValue" class="gauge-value" :style="textStyle">
      {{ displayValue }} {{ unit }}
    </div>
    <div v-else-if="editing" class="edit-container">
      <input
        ref="inputField"
        type="number"
        class="edit-input"
        :style="textStyle"
        :value="inputValue"
        @input="onInput"
        @blur="finishEditing"
        @keyup.enter="finishEditing"
        @keyup.escape="cancelEditing"
        @click.stop
        :min="minValue"
        :max="maxValue"
        :step="step"
      />
      <span class="unit-label" :style="textStyle">{{ unit }}</span>
    </div>
  </div>
</template>

<script>
import { RadialGauge } from 'canvas-gauges'

export default {
  name: 'GaugeDisplay',
  props: {
    x_percent: {
      type: Number,
      required: true
    },
    y_percent: {
      type: Number,
      required: true
    },
    value: {
      type: [Number, String],
      default: 0
    },
    unit: {
      type: String,
      default: ''
    },
    decimals: {
      type: Number,
      default: 0
    },
    size: {
      type: Number,
      default: 5
    },
    minValue: {
      type: Number,
      default: 0
    },
    maxValue: {
      type: Number,
      default: 100
    },
    scale: {
      type: Number,
      default: 1
    },
    offset: {
      type: Number,
      default: 0
    },
    bgColor: {
      type: String,
      default: 'rgba(0, 0, 0, 0.8)'
    },
    textColor: {
      type: String,
      default: '#00ff00'
    },
    addressId: {
      type: Number,
      default: null
    },
    alarms: {
      type: Array,
      default: () => []
    },
    showValue: {
      type: Boolean,
      default: true
    },
    editable: {
      type: Boolean,
      default: false
    },
    step: {
      type: Number,
      default: 1
    },
    name: {
      type: String,
      default: ''
    }
  },
  emits: ['update-value'],
  data() {
    return {
      gauge: null,
      editing: false,
      inputValue: 0
    }
  },
  computed: {
    canvasId() {
      return `gauge-${this.addressId || 'default'}`
    },
    containerStyle() {
      return {
        left: `${this.x_percent}%`,
        top: `${this.y_percent}%`,
        width: `clamp(${this.size * 5}vmin, ${this.size * 10}vw, ${this.size * 15}vmax)`,
        background: this.bgColor,
        borderColor: this.textColor
      }
    },
    textStyle() {
      return {
        color: this.textColor,
        textShadow: `0 0 5px ${this.textColor}`
      }
    },
    displayValue() {
      const raw = this.value ?? 0
      const scaled = (raw * this.scale) + this.offset
      return Number(scaled).toFixed(this.decimals)
    },
    highlights() {
      return this.getGaugeHighlights()
    },
    majorTicks() {
      return this.generateTicks(this.minValue, this.maxValue)
    }
  },
  watch: {
    value: {
      immediate: true,
      handler(newVal) {
        if (!this.editing) {
          this.inputValue = newVal
        }
        this.updateGauge(newVal)
      }
    },
    minValue() {
      this.initGauge()
    },
    maxValue() {
      this.initGauge()
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.initGauge()
    })
  },
  beforeUnmount() {
    if (this.gauge) {
      this.gauge.destroy()
      this.gauge = null
    }
  },
  methods: {
    generateTicks(min, max) {
      const ticks = []
      const step = (max - min) / 5
      for (let i = 0; i <= 5; i++) ticks.push((min + (step * i)).toFixed(0))
      return ticks
    },
    getGaugeHighlights() {
      if (!this.alarms || this.alarms.length === 0) return []

      const highlights = []
      const minGauge = this.minValue ?? 0
      const maxGauge = this.maxValue ?? 100

      this.alarms.forEach(al => {
        let color = '#28a745'
        if (al.severity === 'warning' || al.severity === 'Warning') color = '#ffc107'
        if (al.severity === 'critical' || al.severity === 'Error') color = '#dc3545'

        let from = 0
        let to = 0

        if (al.type === 'BTW') {
          from = al.min
          to = al.max
        } else if (al.type === 'MTE' || al.type === 'MT') {
          from = al.min
          to = maxGauge
        } else if (al.type === 'LTE' || al.type === 'LT') {
          from = minGauge
          to = al.min
        }

        highlights.push({ from, to, color })
      })

      return highlights
    },
    getDisplayValue(raw) {
      const scaled = (raw * this.scale) + this.offset
      return Number(scaled).toFixed(this.decimals)
    },
    initGauge() {
      if (!this.$refs.gaugeCanvas) return
      
      if (this.gauge) {
        this.gauge.destroy()
      }
      
      const min = this.minValue
      const max = this.maxValue
      const unitLabel = this.unit || ''
      
      this.gauge = new RadialGauge({
        renderTo: this.$refs.gaugeCanvas,
        width: 200,
        height: 200,
        minValue: min,
        maxValue: max,
        value: parseFloat(this.getDisplayValue(this.value)) || 0,
        units: unitLabel,
        majorTicks: this.generateTicks(min, max),
        colorNumbers: this.textColor || '#00ff00',
        fontNumbersSize: 22,
        fontNumbersWeight: 'bold',
        colorPlate: '#1a1a1a',
        colorBarProgress: this.textColor || '#00ff00',
        colorBar: '#333333',
        borderShadowWidth: 0,
        borders: false,
        highlights: this.highlights,
        highlightsWidth: 10,
        needleType: 'arrow',
        needleWidth: 4,
        needleCircleSize: 7,
        needleCircleOuter: true,
        needleCircleInner: false,
        colorNeedle: this.textColor || '#00ff00',
        colorNeedleEnd: this.textColor || '#00ff00',
        colorNeedleCircleOuter: this.textColor || '#00ff00',
        valueBox: false,
        ticksAngle: 240,
        startAngle: 60,
        animation: true,
        animationDuration: 800,
        animationRule: 'linear',
        strokeTicks: true
      })
      
      this.gauge.draw()
    },
    startEditing() {
      if (!this.editable) return
      
      this.editing = true
      this.inputValue = this.value
      
      this.$nextTick(() => {
        const input = this.$refs.inputField
        if (input) {
          input.focus()
          input.select()
        }
      })
    },
    onInput(event) {
      this.inputValue = parseFloat(event.target.value) || 0
    },
    finishEditing() {
      if (!this.editable) return
      
      this.editing = false
      
      // Emit the new value to parent
      this.$emit('update-value', {
        addressId: this.addressId,
        value: this.inputValue
      })
    },
    cancelEditing() {
      this.editing = false
      this.inputValue = this.value
    },
    updateGauge(newVal) {
      if (!this.gauge) {
        this.initGauge()
        return
      }
      
      const numVal = typeof newVal === 'number' ? newVal : parseFloat(newVal) || 0
      const scaledVal = (numVal * this.scale) + this.offset
      
      this.gauge.value = scaledVal
      this.gauge.update({
        value: scaledVal
      })
    }
  }
}
</script>

<style scoped>
.gauge-display {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 10;
  border: 2px solid #00ff00;
  border-radius: 8px;
  padding: 0.5em;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
}

.gauge-display.is-editable {
  cursor: pointer;
}

.gauge-display.is-editable:hover {
  border-color: #ffff00;
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
}

.gauge-display canvas {
  width: 100% !important;
  height: auto !important;
}

.gauge-value {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 1.2em;
  margin-top: 0.2em;
}

.gauge-name {
  font-family: 'Courier New', monospace;
  font-size: 0.7em;
  color: #fff;
  margin-bottom: 0.2em;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
}

.edit-container {
  display: flex;
  align-items: center;
  gap: 0.3em;
}

.edit-input {
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid #00ff00;
  border-radius: 4px;
  padding: 0.2em 0.4em;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 1em;
  width: 4em;
  text-align: center;
  color: #00ff00;
  text-shadow: 0 0 5px #00ff00;
}

.edit-input:focus {
  outline: none;
  border-color: #ffff00;
  box-shadow: 0 0 5px rgba(255, 255, 0, 0.5);
}

.edit-input::-webkit-outer-spin-button,
.edit-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.edit-input[type=number] {
  -moz-appearance: textfield;
}

.unit-label {
  font-family: 'Courier New', monospace;
  font-size: 0.8em;
}
</style>
