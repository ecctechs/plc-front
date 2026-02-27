<template>
  <button 
    class="control-button"
    :class="{ 'is-pressed': isPressed }"
    :style="buttonStyle"
    @click="handleClick"
    :disabled="disabled"
  >
    <span class="button-text">{{ label }}</span>
  </button>
</template>

<script>
export default {
  name: 'ControlButton',
  props: {
    x_percent: {
      type: Number,
      required: true
    },
    y_percent: {
      type: Number,
      required: true
    },
    label: {
      type: String,
      default: 'BTN'
    },
    isPressed: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    size: {
      type: Number,
      default: 5
    },
    activeColor: {
      type: String,
      default: null
    },
    inactiveColor: {
      type: String,
      default: null
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
    buttonStyle() {
      const bgColor = this.isPressed 
        ? (this.activeColor || '#22c55e')
        : (this.inactiveColor || '#4a90d9')
      
      return {
        left: `${this.x_percent}%`,
        top: `${this.y_percent}%`,
        fontSize: `clamp(${this.size * 0.3}vmin, ${this.size * 0.8}vw, ${this.size * 1.2}vmax)`,
        padding: `clamp(0.2em, 1vw, 0.5em) clamp(0.5em, 2vw, 1em)`,
        background: bgColor,
        borderColor: this.isPressed ? '#1a7a3e' : '#1e3a5f'
      }
    }
  },
  methods: {
    handleClick() {
      this.$emit('click')
    }
  }
}
</script>

<style scoped>
.control-button {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 10;
  border: 2px solid #1e3a5f;
  border-radius: 6px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.1s ease;
  /* box-shadow: 
    0 4px 0 #1e3a5f,
    0 6px 10px rgba(0, 0, 0, 0.3); */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  min-width: 3em;
}

.control-button:hover:not(:disabled) {
  filter: brightness(1.1);
}

.control-button:active:not(:disabled),
.control-button.is-pressed {
  transform: translate(-50%, -50%) translateY(2px);
  box-shadow: 
    0 2px 0 #1e3a5f,
    0 3px 5px rgba(0, 0, 0, 0.3);
}

.control-button:disabled {
  background: #666 !important;
  border-color: #444;
  color: #999;
  cursor: not-allowed;
  box-shadow: none;
}

.button-text {
  display: block;
  white-space: nowrap;
}
</style>
