<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <transition name="modal-pop">
      <div class="register-card">
        <!-- Close Button -->
        <button class="btn-close-top" @click="$emit('close')" :disabled="isLoading">
          <i class="fas fa-times"></i>
        </button>

        <div class="card-header-minimal">
          <div class="icon-circle">
            <i class="fas fa-user-plus"></i>
          </div>
          <h3 class="title">{{ locale.t('Register User') }}</h3>
          <p class="subtitle">{{ locale.current === 'th' ? 'สร้างบัญชีผู้ใช้งานใหม่ในระบบ' : 'Create a new system user account' }}</p>
        </div>

        <div class="card-body-custom">
          <!-- Error Banner -->
          <transition name="fade">
            <div v-if="errorMessage" class="error-banner">
              <i class="fas fa-exclamation-circle"></i>
              <span>{{ errorMessage }}</span>
            </div>
          </transition>

          <form @submit.prevent="onSubmit" novalidate>
            <div class="form-grid">
              
              <!-- Email -->
              <div class="field-full">
                <label>{{ locale.t('Email') }}</label>
                <div class="input-wrapper" :class="{ 'has-error': errors.email }">
                  <i class="fas fa-envelope input-icon"></i>
                  <input v-model="form.email" type="email" placeholder="example@mail.com" :disabled="isLoading" />
                </div>
                <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
              </div>

              <!-- Role -->
              <div class="field-full">
                <label>{{ locale.t('Role') }}</label>
                <div class="input-wrapper" :class="{ 'has-error': errors.role }">
                  <i class="fas fa-user-shield input-icon"></i>
                  <select v-model="form.role" :disabled="isLoading">
                    <option value="">{{ locale.current === 'th' ? '-- เลือกบทบาท --' : '-- Select Role --' }}</option>
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <span v-if="errors.role" class="error-text">{{ errors.role }}</span>
              </div>

              <!-- Password -->
              <div class="field-half">
                <label>{{ locale.t('Password') }}</label>
                <div class="input-wrapper" :class="{ 'has-error': errors.password }">
                  <input v-model="form.password" :type="showPassword ? 'text' : 'password'" :disabled="isLoading" />
                  <button type="button" class="btn-eye" @click="showPassword = !showPassword">
                    <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                  </button>
                </div>
                <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
              </div>

              <!-- Confirm Password -->
              <div class="field-half">
                <label>{{ locale.t('Confirm Password') }}</label>
                <div class="input-wrapper" :class="{ 'has-error': errors.confirmPassword }">
                  <input v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" :disabled="isLoading" />
                  <button type="button" class="btn-eye" @click="showConfirmPassword = !showConfirmPassword">
                    <i class="fas" :class="showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                  </button>
                </div>
                <span v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</span>
              </div>

              <!-- Room Access Section -->
              <div class="field-full access-section">
                <div class="access-header">
                  <label>{{ locale.t('Room Access') }}</label>
                  <button type="button" class="btn-add-room" @click="addRoom" :disabled="isLoading">
                    <i class="fas fa-plus-circle me-1"></i> {{ locale.t('Add') }}
                  </button>
                </div>
                
                <div v-if="form.rooms.length === 0" class="empty-state">
                  {{ locale.current === 'th' ? 'ไม่ได้กำหนดสิทธิ์ห้อง' : 'No room permissions' }}
                </div>

                <div v-for="(entry, idx) in form.rooms" :key="idx" class="room-row">
                  <select v-model="entry.room_id" class="select-sm" :disabled="isLoading">
                    <option :value="null">{{ locale.current === 'th' ? 'ทุกห้อง' : 'All Rooms' }}</option>
                    <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
                  </select>
                  <select v-model="entry.scope" class="select-sm" :disabled="isLoading">
                    <option value="view">{{ locale.current === 'th' ? 'ดูเท่านั้น' : 'View' }}</option>
                    <option value="control">{{ locale.current === 'th' ? 'ควบคุม' : 'Control' }}</option>
                  </select>
                  <button type="button" class="btn-remove" @click="removeRoom(idx)" :disabled="isLoading">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div class="card-footer-custom">
          <button class="btn-cancel" @click="$emit('close')" :disabled="isLoading">
            {{ locale.t('Cancel') }}
          </button>
          <button class="btn-submit-main" @click="onSubmit" :disabled="isLoading">
            <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
            {{ isLoading ? locale.t('Registering...') : locale.t('Register User') }}
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { showAlert } from '../utils/swalHelper';

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: 'RegisterModal',
  inject: ['locale'],
  emits: ['close'],

  data() {
    return {
      form: { email: '', password: '', confirmPassword: '', role: '', rooms: [] },
      showPassword: false,
      showConfirmPassword: false,
      isLoading: false,
      errorMessage: '',
      errors: { email: '', password: '', confirmPassword: '', role: '' },
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

      // 1. ดึง token จาก localStorage มาเก็บในตัวแปร
      const token = localStorage.getItem('token');

      this.isLoading = true;
      try {
        const res = await fetch(`${BASE_API}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' , 'Authorization': `Bearer ${token}` },
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
            this.locale.current === 'th' ? 'สร้างผู้ใช้สำเร็จ!' : 'User Created!',
            this.locale.current === 'th'
              ? `สร้างบัญชี ${this.form.email} เรียบร้อยแล้ว`
              : `Account ${this.form.email} has been created`,
            'success'
          );
          this.$emit('close');
        } else {
          this.errorMessage = data.message || (this.locale.current === 'th' ? 'สร้างผู้ใช้ไม่สำเร็จ' : 'Failed to create user');
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

.modal-overlay {
  font-family: 'Prompt', sans-serif;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.register-card {
  background: #ffffff;
  width: 100%;
  max-width: 500px;
  border-radius: 24px;
  position: relative;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Header */
.card-header-minimal {
  padding: 32px 32px 10px;
  text-align: center;
}

.icon-circle {
  width: 56px;
  height: 56px;
  background: #eff6ff;
  color: #0062ff;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin: 0 auto 16px;
  transform: rotate(-5deg);
}

.title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 0.85rem;
  color: #6b7280;
}

/* Body & Form */
.card-body-custom {
  padding: 20px 32px;
  max-height: 70vh;
  overflow-y: auto;
}

.form-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.field-full { width: 100%; }
.field-half { width: calc(50% - 8px); }

label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input, .input-wrapper select {
  width: 100%;
  padding: 12px 16px;
  padding-left: 40px;
  background: #f9fafb;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  font-size: 0.95rem;
  transition: all 0.2s;
  outline: none;
}

.input-wrapper select { padding-left: 40px; appearance: none; }

.input-wrapper input:focus, .input-wrapper select:focus {
  border-color: #0062ff;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(0, 98, 255, 0.05);
}

.input-icon {
  position: absolute;
  left: 14px;
  color: #9ca3af;
  font-size: 0.9rem;
}

.btn-eye {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
}

/* Room Access Section */
.access-section {
  background: #f8fafc;
  padding: 16px;
  border-radius: 16px;
  margin-top: 8px;
}

.access-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.btn-add-room {
  background: none;
  border: none;
  color: #0062ff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.room-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.select-sm {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.85rem;
  background: white;
}

.btn-remove {
  background: #fee2e2;
  color: #ef4444;
  border: none;
  width: 32px;
  border-radius: 8px;
  cursor: pointer;
}

/* Buttons */
.card-footer-custom {
  padding: 24px 32px 32px;
  display: flex;
  gap: 12px;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  background: #f3f4f6;
  color: #4b5563;
  border: none;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
}

.btn-submit-main {
  flex: 2;
  padding: 12px;
  background: #1a1a1a;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-submit-main:hover {
  background: #333333;
}

/* Utilities */
.error-banner {
  background: #fff1f2;
  color: #e11d48;
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 20px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.has-error input { border-color: #ef4444; }
.error-text { font-size: 0.75rem; color: #ef4444; margin-top: 4px; display: block; }

.btn-close-top {
  position: absolute;
  top: 20px;
  right: 20px;
  background: #f3f4f6;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
}

/* Animations */
.modal-pop-enter-active { animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pop {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>