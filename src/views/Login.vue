<template>
  <div class="auth-wrapper">
    <button
      type="button"
      class="btn-lang-fixed"
      @click="locale.toggle()"
    >
      <i class="fas fa-globe"></i>
      <span>{{ locale.current === 'th' ? 'TH' : 'EN' }}</span>
    </button>

    <div class="auth-content">
      <div class="auth-header">
        <div class="app-logo">
          <div class="logo-inner"></div>
        </div>
        <h2 class="app-title">{{ locale.t('PLC Dashboard') }}</h2>
        <p class="app-subtitle">{{ locale.t('Please sign in to continue') }}</p>
      </div>

      <transition name="fade">
        <div v-if="errorMessage" class="error-banner">
          <i class="fas fa-info-circle"></i>
          <span>{{ errorMessage }}</span>
        </div>
      </transition>

      <form @submit.prevent="onSubmit" class="auth-form" novalidate>
        <div class="form-field">
          <label>{{ locale.t('Email') }}</label>
          <div class="input-control" :class="{ 'error': emailError }">
            <input 
              v-model="email" 
              type="email" 
              :placeholder="locale.t('example@mail.com')"
              :disabled="isLoading"
            />
          </div>
          <span v-if="emailError" class="helper-text">{{ emailError }}</span>
        </div>

        <div class="form-field">
          <label>{{ locale.t('Password') }}</label>
          <div class="input-control" :class="{ 'error': passwordError }">
            <input 
              v-model="password" 
              :type="showPassword ? 'text' : 'password'" 
              :placeholder="locale.t('Enter your password')"
              :disabled="isLoading"
              class="password-input"
            />
            <button 
              type="button" 
              @click="showPassword = !showPassword" 
              class="btn-view"
              tabindex="-1"
            >
              <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
            </button>
          </div>
          <span v-if="passwordError" class="helper-text">{{ passwordError }}</span>
        </div>

        <button type="submit" class="btn-submit" :disabled="isLoading">
          <span v-if="isLoading" class="loader"></span>
          <span>{{ isLoading ? locale.t('Signing in...') : locale.t('Sign In') }}</span>
        </button>
      </form>

      <div class="auth-footer">
        <p>Industrial Control System v2.0</p>
      </div>
    </div>
  </div>
</template>

<script>
const BASE_API = import.meta.env.VITE_API_BASE_URL

export default {
  name: 'Login',
  inject: ['locale'],
  data() {
    return {
      email: '',
      password: '',
      showPassword: false,
      isLoading: false,
      errorMessage: '',
      emailError: '',
      passwordError: '',
    }
  },
  methods: {
    validate() {
      this.emailError = ''
      this.passwordError = ''
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      
      if (!this.email) {
        this.emailError = this.locale.t('Please enter your email')
      } else if (!emailRegex.test(this.email)) {
        this.emailError = this.locale.t('Please enter a valid email address')
      }
      
      if (!this.password) {
        this.passwordError = this.locale.t('Please enter your password')
      } else if (this.password.length < 6) {
        this.passwordError = this.locale.t('Password must be at least 6 characters')
      }
      
      return !this.emailError && !this.passwordError
    },
    
    async onSubmit() {
      this.errorMessage = ''
      if (!this.validate()) return
      this.isLoading = true
      
      try {
        const res = await fetch(`${BASE_API}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.email, password: this.password }),
        })
        const data = await res.json()
        if (res.ok && data.success) {
          const u = data.data.user
          localStorage.setItem('token', data.data.token)
          localStorage.setItem('user', JSON.stringify(u))
          const perms = u.permissions?.tab_permissions || u.tab_permissions || {}
          localStorage.setItem('permissions', JSON.stringify(perms))
          window.location.reload()
        } else {
          this.errorMessage = data.message || this.locale.t('Invalid email or password')
        }
      } catch (err) {
        this.errorMessage = this.locale.t('Connection error. Please try again.')
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap');

.auth-wrapper {
  font-family: 'Prompt', sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
  background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
  background-size: 20px 20px;
  position: relative; /* สำหรับให้ปุ่ม fixed/absolute อ้างอิง */
}

/* ปุ่มแปลภาษามุมบนขวาของจอ */
.btn-lang-fixed {
  position: fixed;
  top: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #ffffff;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  color: #374151;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.btn-lang-fixed:hover {
  border-color: #0062ff;
  color: #0062ff;
  background: #f8faff;
}

.auth-content {
  width: 100%;
  max-width: 400px;
  padding: 40px 20px;
}

.auth-header {
  text-align: center;
  margin-bottom: 40px;
}

.app-logo {
  width: 50px;
  height: 50px;
  background: #0062ff;
  margin: 0 auto 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-10deg);
}

.logo-inner {
  width: 20px;
  height: 20px;
  border: 3px solid white;
  border-radius: 4px;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.app-subtitle {
  font-size: 0.9rem;
  color: #6b7280;
}

.form-field {
  margin-bottom: 20px;
}

.form-field label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.input-control {
  position: relative;
  display: flex;
  align-items: center;
}

.input-control input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.95rem;
  transition: all 0.2s;
  background: #f9fafb;
}

.input-control .password-input {
  padding-right: 45px;
}

.input-control input:focus {
  outline: none;
  border-color: #0062ff;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(0, 98, 255, 0.05);
}

.input-control.error input {
  border-color: #ef4444;
  background: #fff5f5;
}

.btn-view {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
  z-index: 2;
}

.btn-view:hover {
  color: #0062ff;
}

.helper-text {
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 4px;
}

.error-banner {
  background: #fff1f2;
  border: 1px solid #ffe4e6;
  color: #e11d48;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
}

.btn-submit {
  width: 100%;
  padding: 14px;
  background: #1a1a1a;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.btn-submit:hover:not(:disabled) {
  background: #333333;
  transform: translateY(-1px);
}

.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-footer {
  margin-top: 50px;
  text-align: center;
  font-size: 0.75rem;
  color: #9ca3af;
}

.loader {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>