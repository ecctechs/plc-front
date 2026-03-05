<template>
  <div 
    class="status-lamp"
    :class="{ 'is-on': isOn, 'is-clicking': isClicking }"
    :style="lampStyle"
    @click="toggleLamp"
  >
    <div class="lamp-outer">
      <div class="lamp-body">
        <div class="lamp-light" :style="lightStyle"></div>
      </div>
      <div v-if="isOn" class="lamp-glow"></div>
      <div v-if="isClicking" class="lamp-ripple"></div>
    </div>
    <div v-if="name" class="lamp-name">{{ name }}</div>
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
    },
    name: {
      type: String,
      default: ''
    },
    addressId: {
      type: Number,
      default: null
    }
  },
  emits: ['toggle'],
  data() {
    return {
      isClicking: false
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
          ? `0 0 15px ${color}, 0 0 30px ${color}, 0 0 45px ${color}`
          : 'none'
      }
    }
  },
  methods: {
    toggleLamp() {
      this.isClicking = true
      this.$emit('toggle', !this.isOn)
      setTimeout(() => {
        this.isClicking = false
      }, 300)
    }
  }
}
</script>

<style scoped>
.status-lamp {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 10;
  cursor: pointer;
  user-select: none;
}

.lamp-outer {
  position: relative;
  width: 100%;
  height: 100%;
}

.lamp-body {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #222;
  padding: 10%;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.5),
    inset 0 2px 4px rgba(0, 0, 0, 0.5);
  transition: transform 0.15s ease;
}

.status-lamp.is-clicking .lamp-body {
  transform: scale(0.92);
}

.lamp-light {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.lamp-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
}

.lamp-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  animation: ripple 0.3s ease-out;
}

@keyframes ripple {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
}

.status-lamp.is-on .lamp-body {
  background: #1a1a1a;
  box-shadow: 
    0 0 15px rgba(0, 0, 0, 0.5),
    inset 0 0 10px rgba(255, 255, 255, 0.1);
}

.lamp-name {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.3em;
  font-size: 0.45em;
  color: #fff;
  white-space: nowrap;
  text-shadow: 
    0 0 3px rgba(0, 0, 0, 0.8),
    0 1px 2px rgba(0, 0, 0, 0.8);
  font-weight: 500;
  letter-spacing: 0.5px;
}
</style>
