<template>
  <div class="auth-wrapper">
    <button type="button" class="btn-lang-fixed" @click="locale.toggle()">
      <i class="fas fa-globe"></i>
      <span>{{ locale.current === 'th' ? 'TH' : 'EN' }}</span>
    </button>

    <div class="auth-content">
      <div class="auth-header">
        <div class="app-logo">
          <div class="logo-inner"></div>
        </div>
        <h2 class="app-title">{{ locale.t('PLC Dashboard') }}</h2>
        <p class="app-subtitle">{{ locale.t('Create your account') }}</p>
      </div>

      <transition name="fade">
        <div v-if="errorMessage" class="error-banner">
          <i class="fas fa-info-circle"></i>
          <span>{{ errorMessage }}</span>
        </div>
      </transition>

      <form @submit.prevent="onSubmit" class="auth-form" novalidate>

        <!-- Email -->
        <div class="form-field">
          <label>{{ locale.t('Email') }}</label>
          <div class="input-control" :class="{ error: errors.email }">
            <input
              v-model="form.email"
              type="email"
              placeholder="example@mail.com"
              :disabled="isLoading"
            />
          </div>
          <span v-if="errors.email" class="helper-text">{{ errors.email }}</span>
        </div>

        <!-- Password -->
        <div class="form-field">
          <label>{{ locale.t('Password') }}</label>
          <div class="input-control" :class="{ error: errors.password }">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="locale.t('Enter your password')"
              :disabled="isLoading"
              class="password-input"
            />
            <button type="button" @click="showPassword = !showPassword" class="btn-view" tabindex="-1">
              <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
            </button>
          </div>
          <span v-if="errors.password" class="helper-text">{{ errors.password }}</span>
        </div>

        <!-- Confirm Password -->
        <div class="form-field">
          <label>{{ locale.t('Confirm Password') }}</label>
          <div class="input-control" :class="{ error: errors.confirmPassword }">
            <input
              v-model="form.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              :placeholder="locale.t('Re-enter your password')"
              :disabled="isLoading"
              class="password-input"
            />
            <button type="button" @click="showConfirmPassword = !showConfirmPassword" class="btn-view" tabindex="-1">
              <i class="fas" :class="showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
            </button>
          </div>
          <span v-if="errors.confirmPassword" class="helper-text">{{ errors.confirmPassword }}</span>
        </div>

        <!-- Role -->
        <div class="form-field">
          <label>{{ locale.t('Role') }}</label>
          <div class="input-control" :class="{ error: errors.role }">
            <select v-model="form.role" class="select-input" :disabled="isLoading">
              <option value="">
                {{ locale.current === 'th' ? '-- เลือกบทบาท --' : '-- Select Role --' }}
              </option>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <span v-if="errors.role" class="helper-text">{{ errors.role }}</span>
        </div>

        <!-- Room Access -->
        <div class="form-field">
          <div class="room-label-row">
            <label>{{ locale.t('Room Access') }}</label>
            <button type="button" class="btn-add-room" @click="addRoom" :disabled="isLoading">
              <i class="fas fa-plus"></i> {{ locale.t('Add') }}
            </button>
          </div>
          <p v-if="form.rooms.length === 0" class="no-rooms-hint">
            {{ locale.current === 'th' ? 'ไม่มีการกำหนดสิทธิ์ห้อง' : 'No room permissions set' }}
          </p>
          <div
            v-for="(entry, idx) in form.rooms"
            :key="idx"
            class="room-row"
          >
            <select v-model="entry.room_id" class="select-input" :disabled="isLoading">
              <option :value="null">{{ locale.current === 'th' ? 'ทุกห้อง' : 'All Rooms' }}</option>
              <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
            </select>
            <select v-model="entry.scope" class="select-input" :disabled="isLoading">
              <option value="view">{{ locale.current === 'th' ? 'ดูเท่านั้น' : 'View' }}</option>
              <option value="control">{{ locale.current === 'th' ? 'ควบคุม' : 'Control' }}</option>
            </select>
            <button type="button" class="btn-remove-room" @click="removeRoom(idx)" :disabled="isLoading">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <button type="submit" class="btn-submit" :disabled="isLoading">
          <span v-if="isLoading" class="loader"></span>
          <span>{{ isLoading ? locale.t('Registering...') : locale.t('Register') }}</span>
        </button>
      </form>

      <div class="auth-footer">
        <p>
          {{ locale.current === 'th' ? 'มีบัญชีแล้ว?' : 'Already have an account?' }}
          <button type="button" class="btn-link" @click="$emit('show-login')">
            {{ locale.t('Sign In') }}
          </button>
        </p>
        <p>Industrial Control System v2.0</p>
      </div>
    </div>
  </div>
</template>

<script>
import { showAlert } from '../utils/swalHelper';

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: 'Register',

  inject: ['locale'],

  emits: ['show-login'],

  data() {
    return {
      form: {
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
        rooms: []
      },
      showPassword: false,
      showConfirmPassword: false,
      isLoading: false,
      errorMessage: '',
      errors: {
        email: '',
        password: '',
        confirmPassword: '',
        role: ''
      },
      rooms: []
    };
  },

  async mounted() {
    try {
      const res = await fetch(`${BASE_API}/api/rooms`);
      const data = await res.json();
      this.rooms = data.data || data || [];
    } catch {
      this.rooms = [];
    }
  },

  methods: {
    addRoom() {
      this.form.rooms.push({ room_id: null, scope: 'view' });
    },

    removeRoom(index) {
      this.form.rooms.splice(index, 1);
    },

    validate() {
      this.errors = { email: '', password: '', confirmPassword: '', role: '' };
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isTh = this.locale.current === 'th';

      if (!this.form.email) {
        this.errors.email = this.locale.t('Please enter your email');
      } else if (!emailRegex.test(this.form.email)) {
        this.errors.email = this.locale.t('Please enter a valid email address');
      }

      if (!this.form.password) {
        this.errors.password = this.locale.t('Please enter your password');
      } else if (this.form.password.length < 6) {
        this.errors.password = this.locale.t('Password must be at least 6 characters');
      }

      if (!this.form.confirmPassword) {
        this.errors.confirmPassword = isTh ? 'กรุณายืนยันรหัสผ่าน' : 'Please confirm your password';
      } else if (this.form.password !== this.form.confirmPassword) {
        this.errors.confirmPassword = this.locale.t('Passwords do not match');
      }

      if (!this.form.role) {
        this.errors.role = this.locale.t('Please select a role');
      }

      return !Object.values(this.errors).some(Boolean);
    },

    async onSubmit() {
      this.errorMessage = '';
      if (!this.validate()) return;

      this.isLoading = true;
      try {
        const res = await fetch(`${BASE_API}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.form.email,
            password: this.form.password,
            role: this.form.role,
            rooms: this.form.rooms
          })
        });

        const data = await res.json();

        if (res.ok) {
          await showAlert(
            this.locale.current === 'th' ? 'ลงทะเบียนสำเร็จ!' : 'Registration Successful!',
            this.locale.current === 'th'
              ? `สร้างบัญชี ${this.form.email} เรียบร้อยแล้ว`
              : `Account ${this.form.email} has been created`,
            'success'
          );
          this.$emit('show-login');
        } else {
          this.errorMessage = data.message || (this.locale.current === 'th' ? 'ลงทะเบียนไม่สำเร็จ' : 'Registration failed');
        }
      } catch {
        this.errorMessage = this.locale.t('Connection error. Please try again.');
      } finally {
        this.isLoading = false;
      }
    }
  }
};
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
  position: relative;
}

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
.btn-lang-fixed:hover { border-color: #0062ff; color: #0062ff; background: #f8faff; }

.auth-content {
  width: 100%;
  max-width: 460px;
  padding: 40px 20px;
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
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

.app-title { font-size: 1.5rem; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; }
.app-subtitle { font-size: 0.9rem; color: #6b7280; }

.form-field { margin-bottom: 18px; }

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

.input-control input,
.select-input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.9rem;
  transition: all 0.2s;
  background: #f9fafb;
  font-family: 'Prompt', sans-serif;
  color: #1a1a1a;
  appearance: auto;
}

.input-control .password-input { padding-right: 45px; }

.input-control input:focus,
.select-input:focus {
  outline: none;
  border-color: #0062ff;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(0, 98, 255, 0.05);
}

.input-control.error input,
.input-control.error .select-input {
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
.btn-view:hover { color: #0062ff; }

.helper-text { font-size: 0.75rem; color: #ef4444; margin-top: 4px; display: block; }

.error-banner {
  background: #fff1f2;
  border: 1px solid #ffe4e6;
  color: #e11d48;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
}

/* Room Access */
.room-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.room-label-row label { margin-bottom: 0; }

.btn-add-room {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: 0.8rem;
  font-weight: 500;
  background: #f0f7ff;
  border: 1.5px solid #0062ff;
  color: #0062ff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Prompt', sans-serif;
}
.btn-add-room:hover:not(:disabled) { background: #0062ff; color: #fff; }
.btn-add-room:disabled { opacity: 0.5; cursor: not-allowed; }

.no-rooms-hint {
  font-size: 0.8rem;
  color: #9ca3af;
  margin: 4px 0 0;
}

.room-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.room-row .select-input { flex: 1; }

.btn-remove-room {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff1f2;
  border: 1.5px solid #fecdd3;
  color: #e11d48;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.8rem;
}
.btn-remove-room:hover:not(:disabled) { background: #e11d48; color: #fff; border-color: #e11d48; }
.btn-remove-room:disabled { opacity: 0.5; cursor: not-allowed; }

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
  margin-top: 8px;
  font-family: 'Prompt', sans-serif;
}
.btn-submit:hover:not(:disabled) { background: #333333; transform: translateY(-1px); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

.auth-footer {
  margin-top: 32px;
  text-align: center;
  font-size: 0.8rem;
  color: #9ca3af;
}
.auth-footer p { margin-bottom: 4px; }

.btn-link {
  background: none;
  border: none;
  color: #0062ff;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  font-family: 'Prompt', sans-serif;
}
.btn-link:hover { color: #0047cc; }

.loader {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>
