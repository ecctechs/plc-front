<template>
  <div 
    class="status-lamp"
    :class="{ 'is-on': isOn }"
    :style="lampStyle"
  >
    <div class="lamp-body">
      <div class="lamp-light" :style="lightStyle"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatusLamp',
  props: {
    x_percent: {
      type: Number,
      required: true
    },
    y_percent: {
      type: Number,
      required: true
    },
    isOn: {
      type: Boolean,
      default: false
    },
    size: {
      type: Number,
      default: 3
    },
    bgColor: {
      type: String,
      default: '#22c55e'
    },
    inactiveColor: {
      type: String,
      default: '#6b7280'
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
    lampStyle() {
      return {
        left: `${this.x_percent}%`,
        top: `${this.y_percent}%`,
        width: `clamp(${this.size * 0.5}vmin, ${this.size}vw, ${this.size * 2}vmax)`,
        height: `clamp(${this.size * 0.5}vmin, ${this.size}vw, ${this.size * 2}vmax)`
      }
    },
    lightStyle() {
      const color = this.isOn ? (this.bgColor || '#22c55e') : (this.inactiveColor || '#6b7280')
      return {
        background: color,
        boxShadow: this.isOn 
          ? `0 0 10px ${color}, 0 0 20px ${color}, 0 0 30px ${color}`
          : 'none'
      }
    }
  }
}
</script>

<style scoped>
.status-lamp {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.lamp-body {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #333;
  padding: 10%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.lamp-light {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  transition: all 0.3s ease;
}
</style>
