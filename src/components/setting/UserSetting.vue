<template>
  <div class="card shadow-sm">
    <div class="card-body p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="fw-bold m-0">
          <i class="bi bi-person-plus text-primary me-2"></i>
          {{ locale.t('Register User') }}
        </h5>
      </div>

      <!-- Error banner -->
      <transition name="fade">
        <div v-if="errorMessage" class="alert-error mb-3">
          <i class="fas fa-info-circle me-2"></i>{{ errorMessage }}
        </div>
      </transition>

      <form @submit.prevent="onSubmit" novalidate>
        <div class="row g-3">

          <!-- Email -->
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">{{ locale.t('Email') }}</label>
            <input
              v-model="form.email"
              type="email"
              class="form-control"
              :class="{ 'is-invalid': errors.email }"
              placeholder="example@mail.com"
              :disabled="isLoading"
            />
            <div v-if="errors.email" class="invalid-feedback">{{ errors.email }}</div>
          </div>

          <!-- Role -->
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">{{ locale.t('Role') }}</label>
            <select
              v-model="form.role"
              class="form-select"
              :class="{ 'is-invalid': errors.role }"
              :disabled="isLoading"
            >
              <option value="">
                {{ locale.current === 'th' ? '-- เลือกบทบาท --' : '-- Select Role --' }}
              </option>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
            <div v-if="errors.role" class="invalid-feedback">{{ errors.role }}</div>
          </div>

          <!-- Password -->
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">{{ locale.t('Password') }}</label>
            <div class="input-group">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control"
                :class="{ 'is-invalid': errors.password }"
                :placeholder="locale.t('Enter your password')"
                :disabled="isLoading"
              />
              <button type="button" class="btn btn-outline-secondary" @click="showPassword = !showPassword" tabindex="-1">
                <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
              <div v-if="errors.password" class="invalid-feedback">{{ errors.password }}</div>
            </div>
          </div>

          <!-- Confirm Password -->
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">{{ locale.t('Confirm Password') }}</label>
            <div class="input-group">
              <input
                v-model="form.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                class="form-control"
                :class="{ 'is-invalid': errors.confirmPassword }"
                :placeholder="locale.t('Re-enter your password')"
                :disabled="isLoading"
              />
              <button type="button" class="btn btn-outline-secondary" @click="showConfirmPassword = !showConfirmPassword" tabindex="-1">
                <i class="fas" :class="showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
              <div v-if="errors.confirmPassword" class="invalid-feedback">{{ errors.confirmPassword }}</div>
            </div>
          </div>

          <!-- Room Access -->
          <div class="col-12">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label fw-semibold mb-0">{{ locale.t('Room Access') }}</label>
              <button type="button" class="btn btn-sm btn-outline-primary" @click="addRoom" :disabled="isLoading">
                <i class="fa-solid fa-plus me-1"></i>{{ locale.t('Add') }}
              </button>
            </div>

            <p v-if="form.rooms.length === 0" class="text-muted small mb-0">
              {{ locale.current === 'th' ? 'ไม่มีการกำหนดสิทธิ์ห้อง' : 'No room permissions set' }}
            </p>

            <div
              v-for="(entry, idx) in form.rooms"
              :key="idx"
              class="d-flex gap-2 mb-2 align-items-center"
            >
              <select v-model="entry.room_id" class="form-select" :disabled="isLoading">
                <option :value="null">{{ locale.current === 'th' ? 'ทุกห้อง' : 'All Rooms' }}</option>
                <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
              </select>
              <select v-model="entry.scope" class="form-select" :disabled="isLoading">
                <option value="view">{{ locale.current === 'th' ? 'ดูเท่านั้น' : 'View' }}</option>
                <option value="control">{{ locale.current === 'th' ? 'ควบคุม' : 'Control' }}</option>
              </select>
              <button
                type="button"
                class="btn btn-outline-danger btn-sm flex-shrink-0"
                @click="removeRoom(idx)"
                :disabled="isLoading"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <!-- Submit -->
          <div class="col-12 d-flex justify-content-end">
            <button type="submit" class="btn btn-primary px-4" :disabled="isLoading">
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
              {{ isLoading ? locale.t('Registering...') : locale.t('Register User') }}
            </button>
          </div>

        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { showAlert } from '../../utils/swalHelper';

const BASE_API = import.meta.env.VITE_API_BASE_URL;

export default {
  name: 'UserSetting',

  inject: ['locale'],

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

    resetForm() {
      this.form = { email: '', password: '', confirmPassword: '', role: '', rooms: [] };
      this.showPassword = false;
      this.showConfirmPassword = false;
      this.errors = { email: '', password: '', confirmPassword: '', role: '' };
      this.errorMessage = '';
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
            this.locale.current === 'th' ? 'สร้างผู้ใช้สำเร็จ!' : 'User Created!',
            this.locale.current === 'th'
              ? `สร้างบัญชี ${this.form.email} เรียบร้อยแล้ว`
              : `Account ${this.form.email} has been created`,
            'success'
          );
          this.resetForm();
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
.alert-error {
  background: #fff1f2;
  border: 1px solid #ffe4e6;
  color: #e11d48;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>
