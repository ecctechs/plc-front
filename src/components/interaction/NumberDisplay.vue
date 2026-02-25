<template>
  <div 
    class="number-display"
    :style="displayStyle"
  >
    <div class="display-content">
      <span class="display-value" :style="textStyle">{{ displayValue }}</span>
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
    deviceId: {
      type: Number,
      default: null
    },
    addressId: {
      type: Number,
      default: null
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
        borderColor: this.textColor
      }
    },
    textStyle() {
      return {
        color: this.textColor,
        textShadow: `0 0 5px ${this.textColor}`
      }
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
}

.display-content {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.2em;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  white-space: nowrap;
}

.display-value {
  font-size: 1em;
}

.display-unit {
  font-size: 0.6em;
  opacity: 0.8;
}
</style>
