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
        fontSize: `clamp(${this.size * 0.5}vmin, ${this.size}vw, ${this.size * 2}vmax)`,
        background: this.bgColor,
        borderColor: this.textColor,
        cursor: this.editable ? 'pointer' : 'default'
      }
    },
    textStyle() {
      return {
        color: this.textColor,
        textShadow: `0 0 5px ${this.textColor}`
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
  border-radius: 4px;
  padding: 0.3em 0.5em;
  min-width: 3em;
  text-align: center;
  transition: all 0.2s ease;
}

.number-display.is-editable:hover {
  border-color: #ffff00;
  box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
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
  font-size: 0.5em;
  color: #fff;
  opacity: 0.9;
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
}

.edit-input::-webkit-outer-spin-button,
.edit-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.edit-input[type=number] {
  -moz-appearance: textfield;
}
</style>
