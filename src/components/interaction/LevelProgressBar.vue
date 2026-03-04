<template>
  <div 
    class="level-progress-bar"
    :class="{ 'is-editable': editable }"
    :style="containerStyle"
    @click="startEditing"
  >
    <!-- Progress Bar Track -->
    <div class="progress-track" :style="trackStyle">
      <!-- Progress Fill - fills up to current level -->
      <div class="progress-fill" :style="fillStyle"></div>
      
      <!-- Level Markers/Segments -->
      <div 
        v-for="(level, index) in sortedLevels" 
        :key="index"
        class="level-segment"
        :style="getSegmentStyle(level, index)"
      >
        <div 
          v-if="currentLevelIndex >= index" 
          class="segment-fill"
          :style="getSegmentFillStyle(level, index)"
        ></div>
      </div>
      
      <!-- Level Labels -->
      <div 
        v-for="(level, index) in sortedLevels" 
        :key="'label-' + index"
        class="level-label-container"
        :style="getLabelStyle(index)"
      >
        <span class="level-label" :style="labelStyle">{{ level.label }}</span>
      </div>
    </div>

    <!-- Current Value Display -->
    <div v-if="showValue && !editing" class="value-display" :style="textStyle">
      <span class="current-value">{{ displayValue }}</span>
      <span v-if="unit" class="unit">{{ unit }}</span>
    </div>

    <!-- Edit Mode -->
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
        :min="overallMin"
        :max="overallMax"
        :step="step"
      />
      <span v-if="unit" class="unit-label" :style="textStyle">{{ unit }}</span>
    </div>

    <!-- Current Level Indicator -->
    <div v-if="currentLevelLabel" class="current-level" :style="textStyle">
      {{ currentLevelLabel }}
    </div>

    <!-- Name Label -->
    <div v-if="name" class="bar-name">{{ name }}</div>
  </div>
</template>

<script>
export default {
  name: 'LevelProgressBar',
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
    levels: {
      type: Array,
      default: () => []
    },
    bgColor: {
      type: String,
      default: 'rgba(0, 0, 0, 0.8)'
    },
    textColor: {
      type: String,
      default: '#00ff00'
    },
    barColor: {
      type: String,
      default: '#00ff00'
    },
    barHeight: {
      type: Number,
      default: 20
    },
    addressId: {
      type: Number,
      default: null
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
      editing: false,
      inputValue: 0
    }
  },
  computed: {
    containerStyle() {
      return {
        left: `${this.x_percent}%`,
        top: `${this.y_percent}%`,
        width: `clamp(${this.size * 5}vmin, ${this.size * 10}vw, ${this.size * 20}vmax)`,
        background: this.bgColor,
        borderColor: this.textColor
      }
    },
    trackStyle() {
      return {
        height: `${this.barHeight}px`,
        backgroundColor: '#333333',
        borderColor: this.textColor
      }
    },
    fillStyle() {
      const percentage = this.currentLevelPosition
      return {
        width: `${percentage}%`,
        backgroundColor: this.barColor,
        boxShadow: `0 0 10px ${this.barColor}`
      }
    },
    labelStyle() {
      return {
        color: this.textColor,
        textShadow: `0 0 3px ${this.textColor}`
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
      return Number(raw).toFixed(this.decimals)
    },
    sortedLevels() {
      if (!this.levels || this.levels.length === 0) return []
      
      // Filter only criteria levels and sort by min_value
      const criterias = this.levels
        .filter(l => l.mode === 'criteria')
        .sort((a, b) => (a.min_value ?? -Infinity) - (b.min_value ?? -Infinity))
      
      return criterias
    },
    overallMin() {
      if (!this.sortedLevels.length) return 0
      const first = this.sortedLevels[0]
      return first.min_value ?? 0
    },
    overallMax() {
      if (!this.sortedLevels.length) return 100
      // Find the last level with max_value
      const lastWithMax = [...this.sortedLevels]
        .reverse()
        .find(l => l.max_value !== null && l.max_value !== undefined)
      
      if (lastWithMax && lastWithMax.max_value !== null) {
        return lastWithMax.max_value
      }
      
      const last = this.sortedLevels[this.sortedLevels.length - 1]
      return last?.min_value ? last.min_value + 100 : 100
    },
    // Find which level range the current value falls into
    currentLevelIndex() {
      const val = Number(this.value) ?? 0
      
      for (let i = 0; i < this.sortedLevels.length; i++) {
        const level = this.sortedLevels[i]
        
        if (level.condition_type === 'BTW') {
          // Between: check if value is between min and max
          const minOk = level.include_min ? val >= level.min_value : val > level.min_value
          const maxOk = level.include_max ? val <= level.max_value : val < level.max_value
          if (minOk && maxOk) return i
        } else if (['MT', 'MTE'].includes(level.condition_type)) {
          // Greater than: >= min_value
          const ok = level.condition_type === 'MTE' ? val >= level.min_value : val > level.min_value
          if (ok) return i
        } else if (['LT', 'LTE'].includes(level.condition_type)) {
          // Less than: <= min_value
          const ok = level.condition_type === 'LTE' ? val <= level.min_value : val < level.min_value
          if (ok) return i
        } else if (level.condition_type === 'EQ') {
          // Equal: exact value
          if (val === level.min_value) return i
        }
      }
      
      return -1 // Not in any level range
    },
    currentLevelLabel() {
      if (this.currentLevelIndex >= 0 && this.currentLevelIndex < this.sortedLevels.length) {
        return this.sortedLevels[this.currentLevelIndex].label
      }
      return ''
    },
    // Calculate the percentage position based on current level
    currentLevelPosition() {
      const levels = this.sortedLevels
      const currentIdx = this.currentLevelIndex
      
      if (currentIdx < 0) return 0 // Not in any range
      
      // Calculate position based on which level index we're at
      // Each level gets equal portion (100% / total levels)
      const segmentSize = 100 / levels.length
      const position = (currentIdx + 1) * segmentSize
      
      return Math.min(100, position)
    }
  },
  watch: {
    value: {
      immediate: true,
      handler(newVal) {
        if (!this.editing) {
          this.inputValue = newVal
        }
      }
    }
  },
  methods: {
    getSegmentStyle(level, index) {
      const segmentSize = 100 / this.sortedLevels.length
      return {
        left: `${index * segmentSize}%`,
        width: `${segmentSize}%`
      }
    },
    getSegmentFillStyle(level, index) {
      // Different colors for each level segment
      const colors = ['#28a745', '#17a2b8', '#ffc107', '#fd7e14', '#dc3545', '#6f42c1']
      const color = colors[index % colors.length]
      
      if (this.currentLevelIndex >= index) {
        return {
          backgroundColor: color,
          opacity: 0.7
        }
      }
      return {}
    },
    getLabelStyle(index) {
      const segmentSize = 100 / this.sortedLevels.length
      return {
        left: `${index * segmentSize + segmentSize / 2}%`
      }
    },
    startEditing() {
      console.log('startEditing called', { editable: this.editable, value: this.value })
      if (!this.editable) return
      
      this.editing = true
      this.inputValue = this.value
      console.log('editing set to true, inputValue:', this.inputValue)
      
      // Use two $nextTick to ensure DOM is fully rendered
      this.$nextTick(() => {
        this.$nextTick(() => {
          console.log('After double nextTick, refs:', this.$refs)
          const input = this.$refs.inputField
          console.log('input ref:', input)
          if (input) {
            input.focus()
            input.select()
          }
        })
      })
    },
    onInput(event) {
      this.inputValue = parseFloat(event.target.value) || 0
    },
    finishEditing() {
      console.log('finishEditing called', { editable: this.editable, inputValue: this.inputValue })
      if (!this.editing || !this.editable) return
      
      this.editing = false
      
      console.log('emitting update-value:', { addressId: this.addressId, value: this.inputValue })
      this.$emit('update-value', {
        addressId: this.addressId,
        value: this.inputValue
      })
      
    },
    cancelEditing() {
      this.editing = false
      this.inputValue = this.value
    }
  }
}
</script>

<style scoped>
.level-progress-bar {
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

.level-progress-bar.is-editable {
  cursor: pointer;
}

.level-progress-bar.is-editable:hover {
  border-color: #ffff00;
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
}

.progress-track {
  position: relative;
  width: 100%;
  border-radius: 4px;
  overflow: visible;
  border: 1px solid;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 4px;
}

.level-segment {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  border-right: 1px dashed rgba(255, 255, 255, 0.3);
}

.level-segment:last-child {
  border-right: none;
}

.segment-fill {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.level-label-container {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: none;
  transform: translateX(-50%);
}

.level-label {
  font-family: 'Courier New', monospace;
  font-size: 0.55em;
  white-space: nowrap;
  position: absolute;
  bottom: -20px;
}

.value-display {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 1em;
  margin-top: 0.8em;
  display: flex;
  align-items: center;
  gap: 0.3em;
}

.current-value {
  font-size: 1.2em;
}

.unit {
  font-size: 0.8em;
  opacity: 0.8;
}

.current-level {
  font-family: 'Courier New', monospace;
  font-size: 0.7em;
  margin-top: 0.3em;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 3px;
}

.bar-name {
  font-family: 'Courier New', monospace;
  font-size: 0.7em;
  color: #fff;
  margin-top: 0.3em;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
}

.edit-container {
  display: flex;
  align-items: center;
  gap: 0.3em;
  margin-top: 0.5em;
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
