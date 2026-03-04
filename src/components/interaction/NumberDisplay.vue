<template>
  <div 
    class="number-display"
    :class="{ 'is-editable': editable }"
    :style="displayStyle"
    @click="startEditing"
  >
    <div v-if="!editing" class="display-content">
      <span v-if="name" class="display-name">{{ name }}</span>
      <span class="display-value" :style="textStyle">{{ displayValue }}</span>
      <span v-if="unit" class="display-unit" :style="textStyle">{{ unit }}</span>
    </div>
    <div v-else class="edit-content">
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
        :min="minValue"
        :max="maxValue"
        :step="step"
      />
      <span v-if="unit" class="display-unit" :style="textStyle">{{ unit }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NumberDisplay',
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
      default: 4
    },
    bgColor: {
      type: String,
      default: 'rgba(0, 0, 0, 0.8)'
    },
    textColor: {
      type: String,
      default: '#00ff00'
    },
    editable: {
      type: Boolean,
      default: false
    },
    minValue: {
      type: Number,
      default: 0
    },
    maxValue: {
      type: Number,
      default: 9999
    },
    step: {
      type: Number,
      default: 1
    },
    deviceId: {
      type: Number,
      default: null
    },
    addressId: {
      type: Number,
      default: null
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
    displayValue() {
      if (typeof this.value === 'number') {
        return this.value.toFixed(this.decimals)
      }
      return this.value
    },
    displayStyle() {
      return {
        left: `${this.x_percent}%`,
        top: `${this.y_percent}%`,
        fontSize: `clamp(${this.size * 0.4}vmin, ${this.size * 0.8}vw, ${this.size * 1.5}vmax)`,
        minFontSize: '0.8rem',
        maxFontSize: '3rem',
        background: this.bgColor ? this.bgColor : 'rgba(0, 0, 0, 0.8)',
        borderColor: this.textColor,
        cursor: this.editable ? 'pointer' : 'default'
      }
    },
    textStyle() {
      return {
        color: this.textColor,
        textShadow: `0 0 5px ${this.textColor}`,
        fontSize: 'inherit'
      }
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
    }
  }
}
</script>

<style scoped>
.number-display {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 10;
  border: 2px solid #00ff00;
  border-radius: 12px;
  padding: 0.4em 0.6em;
  min-width: 3em;
  text-align: center;
  transition: all 0.3s ease;
  background: rgba(0, 0, 0, 0.85);
  box-shadow: 
    0 0 15px rgba(0, 255, 0, 0.15),
    inset 0 0 20px rgba(0, 0, 0, 0.3);
}

.number-display.is-editable {
  cursor: pointer;
}

.number-display.is-editable:hover {
  border-color: #ffff00;
  box-shadow: 
    0 0 20px rgba(255, 255, 0, 0.4),
    inset 0 0 20px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%) scale(1.02);
}

.display-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1em;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  white-space: nowrap;
}

.display-name {
  font-size: clamp(0.4rem, 1.2vmin, 0.6rem);
  color: #fff;
  opacity: 0.9;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-content {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.2em;
}

.display-value {
  font-size: 1em;
}

.display-unit {
  font-size: 0.6em;
  opacity: 0.8;
}

.edit-input {
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 1em;
  width: 4em;
  text-align: center;
  color: inherit;
  text-shadow: inherit;
}

.edit-input:focus {
  outline: none;
}

.edit-input::-webkit-outer-spin-button,
.edit-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.edit-input[type=number] {
  -moz-appearance: textfield;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .number-display {
    padding: 0.3em 0.4em;
    border-radius: 8px;
  }
}

@media (min-width: 1200px) {
  .number-display {
    padding: 0.5em 0.8em;
  }
}

@media (min-width: 1600px) {
  .number-display {
    padding: 0.6em 1em;
  }
}
</style>
