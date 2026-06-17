<template>
  <div class="us-overlay" @click.self="$emit('close')">
    <transition name="us-pop" appear>
      <div class="us-card">
        <!-- Header -->
        <div class="us-card-header">
          <div class="header-left">
            <div class="us-icon-wrap"><i class="fas fa-users-cog"></i></div>
            <div>
              <h3 class="us-title">{{ locale.current === 'th' ? 'จัดการผู้ใช้' : 'User Management' }}</h3>
              <p class="us-subtitle">{{ locale.current === 'th' ? 'ดูรายการ แก้ไข และเพิ่มผู้ใช้ในระบบ' : 'View, edit and add users in the system' }}</p>
            </div>
          </div>
          <button class="btn-close-minimal" @click="$emit('close')"><i class="fas fa-times"></i></button>
        </div>

        <!-- Tab Bar -->
        <div class="us-tab-bar">
          <button class="us-tab" :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">
            <i class="fas fa-list me-2"></i>{{ locale.current === 'th' ? 'รายการผู้ใช้' : 'User List' }}
          </button>
          <button class="us-tab" :class="{ active: activeTab === 'add' }" @click="switchToAdd">
            <i class="fas fa-user-plus me-2"></i>{{ locale.current === 'th' ? 'เพิ่มผู้ใช้ใหม่' : 'Add New User' }}
          </button>
        </div>

        <!-- ── TAB: USER LIST ── -->
        <div v-show="activeTab === 'list'" class="us-card-body">
          <div class="table-responsive rounded-3 border">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-blue">
                <tr>
                  <th class="ps-3 py-3">{{ locale.t('Email') }}</th>
                  <th class="py-3">{{ locale.t('Role') }}</th>
                  <th class="py-3 text-center">{{ locale.current === 'th' ? 'ห้อง' : 'Rooms' }}</th>
                  <th class="py-3 text-center">{{ locale.current === 'th' ? 'สถานะ' : 'Status' }}</th>
                  <th class="py-3 text-center" style="min-width:120px; white-space:nowrap">{{ locale.t('Actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingList">
                  <td colspan="5" class="text-center text-muted py-4">
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    {{ locale.current === 'th' ? 'กำลังโหลด...' : 'Loading...' }}
                  </td>
                </tr>
                <tr v-else-if="users.length === 0">
                  <td colspan="5" class="text-center text-muted py-5">
                    <i class="fas fa-users d-block mb-2" style="font-size:2rem"></i>
                    {{ locale.current === 'th' ? 'ยังไม่มีผู้ใช้' : 'No users found.' }}
                  </td>
                </tr>
                <tr v-for="user in users" :key="user.id">
                  <td class="ps-3">
                    <div class="d-flex align-items-center gap-2">
                      <div class="user-avatar">{{ user.email?.[0]?.toUpperCase() }}</div>
                      <span class="fw-semibold small">{{ user.email }}</span>
                    </div>
                  </td>
                  <td><span class="role-badge">{{ user.role || '—' }}</span></td>
                  <td class="text-center">
                    <span class="text-muted small">
                      {{ user.roomAssignments?.length
                          ? (user.roomAssignments.some(r => r.room_id === null)
                              ? (locale.current === 'th' ? 'ทุกห้อง' : 'All')
                              : user.roomAssignments.length + (locale.current === 'th' ? ' ห้อง' : ' room(s)'))
                          : '—' }}
                    </span>
                  </td>
                  <td class="text-center">
                    <span :class="user.is_active ? 'status-active' : 'status-inactive'">
                      {{ user.is_active ? (locale.current === 'th' ? 'ใช้งาน' : 'Active') : (locale.current === 'th' ? 'ปิดใช้' : 'Inactive') }}
                    </span>
                  </td>
                  <td class="text-center" style="white-space:nowrap">
                    <button class="btn btn-sm btn-outline-primary me-1" @click="openEdit(user)" :title="locale.t('Edit')">
                      <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn btn-sm me-1"
                      :class="user.is_active ? 'btn-outline-warning' : 'btn-outline-success'"
                      @click="toggleActive(user)"
                      :title="user.is_active ? (locale.current === 'th' ? 'ปิดใช้งาน' : 'Disable') : (locale.current === 'th' ? 'เปิดใช้งาน' : 'Enable')">
                      <i class="fas" :class="user.is_active ? 'fa-ban' : 'fa-check-circle'"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" @click="openReset(user)"
                      :title="locale.current === 'th' ? 'รีเซ็ตรหัสผ่าน' : 'Reset Password'">
                      <i class="fas fa-key"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── TAB: ADD USER ── -->
        <div v-show="activeTab === 'add'" class="us-card-body">
          <transition name="fade">
            <div v-if="addError" class="err-banner">
              <i class="fas fa-exclamation-circle me-2"></i>{{ addError }}
            </div>
          </transition>

          <div class="add-form-grid">
            <div class="add-field full">
              <label>{{ locale.t('Email') }}</label>
              <div class="add-input-wrap" :class="{ error: errors.email }">
                <i class="fas fa-envelope icon-prefix"></i>
                <input v-model="form.email" type="email" :disabled="saving" placeholder="example@mail.com" />
              </div>
              <span v-if="errors.email" class="err-text">{{ errors.email }}</span>
            </div>

            <div class="add-field full">
              <label>{{ locale.t('Role') }}</label>
              <div class="add-input-wrap" :class="{ error: errors.role }">
                <i class="fas fa-shield-alt icon-prefix"></i>
                <select v-model="form.role" @change="onRoleChange" :disabled="saving || loadingRoles">
                  <option value="">{{ locale.current === 'th' ? '-- เลือกบทบาท --' : '-- Select Role --' }}</option>
                  <option v-if="loadingRoles" disabled>{{ locale.current === 'th' ? 'กำลังโหลด...' : 'Loading...' }}</option>
                  <option v-for="r in roles" :key="r.id" :value="r.name">{{ r.name }}</option>
                </select>
              </div>
              <span v-if="errors.role" class="err-text">{{ errors.role }}</span>
            </div>

            <div class="add-field full">
              <div class="status-toggle-row">
                <span class="toggle-label">{{ locale.current === 'th' ? 'สถานะบัญชี' : 'Account Status' }}</span>
                <div class="form-check form-switch mb-0">
                  <input class="form-check-input" type="checkbox" id="addActiveSwitch" v-model="form.is_active" :disabled="saving" />
                  <label class="form-check-label" for="addActiveSwitch">
                    <span :class="form.is_active ? 'text-success fw-semibold' : 'text-muted'">
                      {{ form.is_active ? (locale.current === 'th' ? 'ใช้งาน' : 'Active') : (locale.current === 'th' ? 'ปิดใช้' : 'Inactive') }}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div class="add-field half">
              <label>{{ locale.t('Password') }}</label>
              <div class="add-input-wrap" :class="{ error: errors.password }">
                <input v-model="form.password" :type="showPw ? 'text' : 'password'" :disabled="saving"
                  :placeholder="locale.current === 'th' ? 'อย่างน้อย 6 ตัวอักษร' : 'Min 6 characters'" />
                <button type="button" class="eye-btn" @click="showPw = !showPw">
                  <i class="fas" :class="showPw ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
              <span v-if="errors.password" class="err-text">{{ errors.password }}</span>
            </div>

            <div class="add-field half">
              <label>{{ locale.t('Confirm Password') }}</label>
              <div class="add-input-wrap" :class="{ error: errors.confirmPassword }">
                <input v-model="form.confirmPassword" :type="showConfirmPw ? 'text' : 'password'" :disabled="saving" />
                <button type="button" class="eye-btn" @click="showConfirmPw = !showConfirmPw">
                  <i class="fas" :class="showConfirmPw ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
              <span v-if="errors.confirmPassword" class="err-text">{{ errors.confirmPassword }}</span>
            </div>

            <div class="add-field full">
              <div class="room-section">
                <div class="room-header">
                  <label class="mb-0">{{ locale.t('Room Access') }}</label>
                  <button type="button" class="btn-add-room" @click="form.rooms.push({ room_id: null, scope: 'view' })" :disabled="saving">
                    <i class="fas fa-plus-circle me-1"></i>{{ locale.t('Add') }}
                  </button>
                </div>
                <p v-if="form.rooms.length === 0" class="room-empty">{{ locale.current === 'th' ? 'ไม่ได้กำหนดสิทธิ์ห้อง' : 'No room permissions set' }}</p>
                <div v-for="(entry, idx) in form.rooms" :key="idx" class="room-row">
                  <select v-model="entry.room_id" class="room-select" :disabled="saving">
                    <option :value="null">{{ locale.current === 'th' ? 'ทุกห้อง' : 'All Rooms' }}</option>
                    <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
                  </select>
                  <select v-model="entry.scope" class="room-select" :disabled="saving">
                    <option value="view">{{ locale.current === 'th' ? 'ดูเท่านั้น' : 'View' }}</option>
                    <option value="control">{{ locale.current === 'th' ? 'ควบคุม' : 'Control' }}</option>
                    <option value="manage">{{ locale.current === 'th' ? 'จัดการ' : 'Manage' }}</option>
                  </select>
                  <button type="button" class="btn-remove-room" @click="form.rooms.splice(idx, 1)" :disabled="saving">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="add-footer">
            <button class="btn-cancel-add" @click="resetAddForm" :disabled="saving">{{ locale.current === 'th' ? 'ล้างฟอร์ม' : 'Clear' }}</button>
            <button class="btn-submit-add" @click="submitAdd" :disabled="saving">
              <span v-if="saving" class="mini-spinner"></span>
              {{ saving ? (locale.current === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (locale.current === 'th' ? 'สร้างบัญชี' : 'Create Account') }}
            </button>
          </div>
        </div>

      </div>
    </transition>

    <!-- ── EDIT MODAL ── -->
    <div v-if="showEditModal" class="inner-backdrop" @click.self="showEditModal = false">
      <div class="inner-modal">
        <div class="inner-modal-header">
          <h6 class="fw-bold mb-0"><i class="fas fa-user-edit me-2 text-primary"></i>{{ locale.current === 'th' ? 'แก้ไขผู้ใช้' : 'Edit User' }}</h6>
          <button class="btn-close-minimal" @click="showEditModal = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="inner-modal-body">
          <div class="mb-3">
            <label class="form-label fw-semibold small">{{ locale.t('Email') }}</label>
            <input :value="editForm.email" class="form-control form-control-sm bg-light" readonly />
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold small">{{ locale.t('Role') }}</label>
            <select v-model="editForm.role" @change="onEditRoleChange" class="form-select form-select-sm">
              <option value="">{{ locale.current === 'th' ? '-- เลือกบทบาท --' : '-- Select --' }}</option>
              <option v-for="r in roles" :key="r.id" :value="r.name">{{ r.name }}</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold small">{{ locale.current === 'th' ? 'เชื่อมกับพนักงาน' : 'Link to Employee' }}</label>
            <select v-model="editForm.employee_id" class="form-select form-select-sm">
              <option :value="null">{{ locale.current === 'th' ? 'ไม่เชื่อม' : 'None' }}</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                {{ emp.employee_id }} — {{ emp.first_name }} {{ emp.last_name }}
              </option>
            </select>
          </div>
          <div class="mb-3">
            <div class="d-flex align-items-center justify-content-between p-3 rounded-3 bg-light">
              <label class="form-label fw-semibold mb-0 small">{{ locale.current === 'th' ? 'สถานะบัญชี' : 'Account Status' }}</label>
              <div class="form-check form-switch mb-0">
                <input class="form-check-input" type="checkbox" id="editActiveSwitch" v-model="editForm.is_active" />
                <label class="form-check-label small" for="editActiveSwitch">
                  <span :class="editForm.is_active ? 'text-success fw-semibold' : 'text-muted'">
                    {{ editForm.is_active ? (locale.current === 'th' ? 'ใช้งาน' : 'Active') : (locale.current === 'th' ? 'ปิดใช้' : 'Inactive') }}
                  </span>
                </label>
              </div>
            </div>
          </div>
          <div class="mb-2">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label fw-semibold mb-0 small">{{ locale.t('Room Access') }}</label>
              <button type="button" class="btn btn-sm btn-outline-primary" @click="editForm.rooms.push({ room_id: null, scope: 'view' })">
                <i class="fas fa-plus me-1"></i>{{ locale.t('Add') }}
              </button>
            </div>
            <p v-if="editForm.rooms.length === 0" class="text-muted small mb-0">{{ locale.current === 'th' ? 'ไม่มีการกำหนดสิทธิ์ห้อง' : 'No room permissions' }}</p>
            <div v-for="(entry, idx) in editForm.rooms" :key="idx" class="d-flex gap-2 mb-2">
              <select v-model="entry.room_id" class="form-select form-select-sm">
                <option :value="null">{{ locale.current === 'th' ? 'ทุกห้อง' : 'All Rooms' }}</option>
                <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
              </select>
              <select v-model="entry.scope" class="form-select form-select-sm">
                <option value="view">{{ locale.current === 'th' ? 'ดูเท่านั้น' : 'View' }}</option>
                <option value="control">{{ locale.current === 'th' ? 'ควบคุม' : 'Control' }}</option>
                <option value="manage">{{ locale.current === 'th' ? 'จัดการ' : 'Manage' }}</option>
              </select>
              <button type="button" class="btn btn-outline-danger btn-sm flex-shrink-0" @click="editForm.rooms.splice(idx, 1)">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="inner-modal-footer">
          <button class="btn btn-sm btn-secondary" @click="showEditModal = false">{{ locale.t('Cancel') }}</button>
          <button class="btn btn-sm btn-primary" @click="saveEdit" :disabled="savingEdit">
            <span v-if="savingEdit" class="spinner-border spinner-border-sm me-1"></span>{{ locale.t('Update') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── RESET PASSWORD MODAL ── -->
    <div v-if="showResetModal" class="inner-backdrop" @click.self="showResetModal = false">
      <div class="inner-modal" style="max-width:400px">
        <div class="inner-modal-header">
          <h6 class="fw-bold mb-0"><i class="fas fa-key me-2 text-warning"></i>{{ locale.current === 'th' ? 'รีเซ็ตรหัสผ่าน' : 'Reset Password' }}</h6>
          <button class="btn-close-minimal" @click="showResetModal = false"><i class="fas fa-times"></i></button>
        </div>
        <div class="inner-modal-body">
          <p class="text-muted small mb-3">{{ resetTarget?.email }}</p>
          <div class="mb-3">
            <label class="form-label fw-semibold small">{{ locale.current === 'th' ? 'รหัสผ่านใหม่' : 'New Password' }}</label>
            <input v-model="resetPw" type="password" class="form-control form-control-sm" placeholder="Min 6 characters" />
          </div>
          <div class="mb-1">
            <label class="form-label fw-semibold small">{{ locale.t('Confirm Password') }}</label>
            <input v-model="resetConfirm" type="password" class="form-control form-control-sm" />
          </div>
        </div>
        <div class="inner-modal-footer">
          <button class="btn btn-sm btn-secondary" @click="showResetModal = false">{{ locale.t('Cancel') }}</button>
          <button class="btn btn-sm btn-warning text-white" @click="confirmReset" :disabled="savingReset">
            <span v-if="savingReset" class="spinner-border spinner-border-sm me-1"></span>
            {{ locale.current === 'th' ? 'รีเซ็ต' : 'Reset' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { showAlert, showConfirm } from '../utils/swalHelper';

const BASE_API = import.meta.env.VITE_API_BASE_URL;
const JSON_H = { 'Content-Type': 'application/json' };

function authHeader() {
  return { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
}

function blankForm() {
  return { email: '', password: '', confirmPassword: '', role: '', role_id: null, is_active: true, rooms: [] };
}

export default {
  name: 'UserSettingModal',
  inject: ['locale'],
  emits: ['close'],

  data() {
    return {
      activeTab: 'list',
      // list
      users: [],
      loadingList: false,
      // shared
      rooms: [],
      roles: [],
      employees: [],
      loadingRoles: false,
      // edit
      showEditModal: false,
      savingEdit: false,
      editingId: null,
      editForm: { email: '', role: '', is_active: true, rooms: [] },
      // reset
      showResetModal: false,
      savingReset: false,
      resetTarget: null,
      resetPw: '',
      resetConfirm: '',
      // add
      form: blankForm(),
      errors: { email: '', password: '', confirmPassword: '', role: '' },
      addError: '',
      saving: false,
      showPw: false,
      showConfirmPw: false
    };
  },

  mounted() {
    this.loadAll();
  },

  methods: {
    async loadAll() {
      this.loadingList = true;
      this.loadingRoles = true;
      try {
        const [uRes, rRes, roRes, empRes] = await Promise.all([
          fetch(`${BASE_API}/api/settings/users`, { headers: authHeader() }),
          fetch(`${BASE_API}/api/rooms`,           { headers: authHeader() }),
          fetch(`${BASE_API}/api/settings/roles`,  { headers: authHeader() }),
          fetch(`${BASE_API}/api/employees`,       { headers: authHeader() })
        ]);
        this.users     = (await uRes.json()).data  || [];
        this.rooms     = (await rRes.json()).data  || [];
        this.roles     = ((await roRes.json()).data || []).filter(r => r.is_active);
        this.employees = (await empRes.json()).data || [];
      } catch (err) {
        console.error(err);
        await showAlert('Error', this.locale.current === 'th' ? 'โหลดข้อมูลไม่สำเร็จ' : 'Cannot load data', 'error');
      } finally {
        this.loadingList = false;
        this.loadingRoles = false;
      }
    },

    // ── Edit ──
    openEdit(user) {
      this.editingId = user.id;
      const foundRole = this.roles.find(r => r.name === user.role);
      this.editForm = {
        email:       user.email,
        role:        user.role || '',
        role_id:     foundRole ? foundRole.id : (user.role_id || null),
        is_active:   user.is_active !== false,
        employee_id: user.employee_id ?? null,
        rooms:       user.roomAssignments ? user.roomAssignments.map(r => ({ room_id: r.room_id, scope: r.scope })) : []
      };
      this.showEditModal = true;
    },

    onEditRoleChange() {
      const found = this.roles.find(r => r.name === this.editForm.role);
      this.editForm.role_id = found ? found.id : null;
    },

    async saveEdit() {
      this.savingEdit = true;
      try {
        const res = await fetch(`${BASE_API}/api/settings/users/${this.editingId}`, {
          method: 'PUT',
          headers: { ...JSON_H, ...authHeader() },
          body: JSON.stringify({
            role:        this.editForm.role,
            role_id:     this.editForm.role_id,
            is_active:   this.editForm.is_active,
            employee_id: this.editForm.employee_id || null,
            rooms:       this.editForm.rooms
          })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Update failed'); }
        await showAlert('', this.locale.current === 'th' ? 'อัปเดตผู้ใช้สำเร็จ' : 'User updated', 'success');
        this.showEditModal = false;
        this.loadAll();
      } catch (err) {
        await showAlert('Error', err.message, 'error');
      } finally {
        this.savingEdit = false;
      }
    },

    async toggleActive(user) {
      const action = user.is_active
        ? (this.locale.current === 'th' ? 'ปิดใช้งาน' : 'disable')
        : (this.locale.current === 'th' ? 'เปิดใช้งาน' : 'enable');
      const ok = await showConfirm(
        this.locale.current === 'th' ? 'ยืนยัน' : 'Confirm',
        this.locale.current === 'th' ? `${action}บัญชี "${user.email}"?` : `${action} "${user.email}"?`,
        action,
        this.locale.current === 'th' ? 'ยกเลิก' : 'Cancel'
      );
      if (!ok) return;
      try {
        const res = await fetch(`${BASE_API}/api/settings/users/${user.id}`, {
          method: 'PUT',
          headers: { ...JSON_H, ...authHeader() },
          body: JSON.stringify({ is_active: !user.is_active })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed'); }
        await showAlert('', this.locale.current === 'th' ? 'อัปเดตสำเร็จ' : 'Updated', 'success');
        this.loadAll();
      } catch (err) {
        await showAlert('Error', err.message, 'error');
      }
    },

    // ── Reset Password ──
    openReset(user) {
      this.resetTarget  = user;
      this.resetPw      = '';
      this.resetConfirm = '';
      this.showResetModal = true;
    },

    async confirmReset() {
      const pw = this.resetPw ? this.resetPw.trim() : '';
      if (pw.length < 6) {
        await showAlert('', this.locale.current === 'th' ? 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' : 'Min 6 characters', 'warning'); return;
      }
      if (this.resetPw !== this.resetConfirm) {
        await showAlert('', this.locale.t('Passwords do not match'), 'warning'); return;
      }
      this.savingReset = true;
      try {
        const res = await fetch(`${BASE_API}/api/settings/users/${this.resetTarget.id}/reset-password`, {
          method: 'PATCH',
          headers: { ...JSON_H, ...authHeader() },
          body: JSON.stringify({ password: this.resetPw })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Reset failed'); }
        await showAlert('', this.locale.current === 'th' ? 'รีเซ็ตรหัสผ่านสำเร็จ' : 'Password reset successfully', 'success');
        this.showResetModal = false;
      } catch (err) {
        await showAlert('Error', err.message, 'error');
      } finally {
        this.savingReset = false;
      }
    },

    // ── Add User ──
    switchToAdd() {
      this.resetAddForm();
      this.activeTab = 'add';
    },

    resetAddForm() {
      this.form   = blankForm();
      this.errors = { email: '', password: '', confirmPassword: '', role: '' };
      this.addError = '';
    },

    onRoleChange() {
      const found = this.roles.find(r => r.name === this.form.role);
      this.form.role_id = found ? found.id : null;
    },

    validate() {
      this.errors = { email: '', password: '', confirmPassword: '', role: '' };
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isTh = this.locale.current === 'th';

      if (!this.form.email) this.errors.email = this.locale.t('Please enter your email');
      else if (!emailRe.test(this.form.email)) this.errors.email = this.locale.t('Please enter a valid email address');

      const pw = this.form.password ? this.form.password.trim() : '';
      if (!pw) this.errors.password = this.locale.t('Please enter your password');
      else if (pw.length < 6) this.errors.password = this.locale.t('Password must be at least 6 characters');

      if (!this.form.confirmPassword) this.errors.confirmPassword = isTh ? 'กรุณายืนยันรหัสผ่าน' : 'Please confirm your password';
      else if (this.form.password !== this.form.confirmPassword) this.errors.confirmPassword = this.locale.t('Passwords do not match');

      if (!this.form.role) this.errors.role = this.locale.t('Please select a role');

      return !Object.values(this.errors).some(Boolean);
    },

    async submitAdd() {
      this.addError = '';
      if (!this.validate()) return;
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      this.saving = true;
      try {
        const res = await fetch(`${BASE_API}/api/settings/users`, {
          method: 'POST',
          headers: { ...JSON_H, ...authHeader() },
          body: JSON.stringify({
            email:      this.form.email,
            password:   this.form.password,
            role:       this.form.role,
            role_id:    this.form.role_id,
            is_active:  this.form.is_active,
            company_id: currentUser.company_id,
            rooms:      this.form.rooms
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || (this.locale.current === 'th' ? 'สร้างผู้ใช้ไม่สำเร็จ' : 'Failed to create user'));

        await showAlert(
          this.locale.current === 'th' ? 'สร้างผู้ใช้สำเร็จ!' : 'User Created!',
          this.locale.current === 'th' ? `สร้างบัญชี ${this.form.email} เรียบร้อยแล้ว` : `Account ${this.form.email} has been created`,
          'success'
        );
        this.resetAddForm();
        this.activeTab = 'list';
        this.loadAll();
      } catch (err) {
        this.addError = err.message;
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.us-overlay {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000; padding: 24px;
}
.us-card {
  background: #fff; border-radius: 20px;
  width: 100%; max-width: 960px; max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 25px 60px rgba(0,0,0,0.2);
}

/* Header */
.us-card-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 28px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 16px; }
.us-icon-wrap {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, #0d6efd, #0052cc);
  border-radius: 12px; display: flex; align-items: center; justify-content: center;
  color: white; font-size: 1.1rem; flex-shrink: 0;
}
.us-title  { font-size: 1.05rem; font-weight: 700; color: #1e293b; margin: 0 0 2px; }
.us-subtitle { font-size: 0.78rem; color: #94a3b8; margin: 0; }
.btn-close-minimal {
  width: 36px; height: 36px; border-radius: 10px;
  border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s; font-size: 0.9rem;
}
.btn-close-minimal:hover { background: #fee2e2; border-color: #fecaca; color: #dc2626; }

/* Tabs */
.us-tab-bar {
  display: flex; gap: 4px; padding: 10px 28px 0;
  border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
}
.us-tab {
  padding: 10px 20px; border: none; background: none;
  font-size: 0.875rem; font-weight: 500; color: #64748b;
  cursor: pointer; border-bottom: 2px solid transparent;
  transition: all 0.2s; margin-bottom: -1px;
}
.us-tab:hover { color: #0d6efd; }
.us-tab.active { color: #0d6efd; border-bottom-color: #0d6efd; font-weight: 600; }

/* Body */
.us-card-body { flex: 1; overflow-y: auto; overflow-x: auto; padding: 24px 28px; }

/* User list badges */
.user-avatar {
  width: 30px; height: 30px; background: #e0e7ff; color: #4338ca;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700; flex-shrink: 0;
}
.role-badge {
  display: inline-block; background: #f1f5f9; color: #475569;
  padding: 2px 10px; border-radius: 100px; font-size: 0.78rem; font-weight: 600;
}
.status-active {
  display: inline-block; background: #dcfce7; color: #15803d;
  padding: 3px 10px; border-radius: 100px; font-size: 0.75rem; font-weight: 600;
}
.status-inactive {
  display: inline-block; background: #fee2e2; color: #dc2626;
  padding: 3px 10px; border-radius: 100px; font-size: 0.75rem; font-weight: 600;
}

/* Inner modals (Edit / Reset) */
.inner-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center;
  z-index: 2100; padding: 16px;
}
.inner-modal {
  background: white; border-radius: 16px; width: 100%; max-width: 520px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2); overflow: hidden;
}
.inner-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid #f1f5f9;
}
.inner-modal-body  { padding: 20px; max-height: 65vh; overflow-y: auto; }
.inner-modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 14px 20px; border-top: 1px solid #f1f5f9;
}

/* Add form */
.err-banner {
  background: #fff1f2; border: 1px solid #ffe4e6; color: #e11d48;
  padding: 12px 16px; border-radius: 10px; margin-bottom: 20px;
  font-size: 0.85rem; display: flex; align-items: center;
}
.add-form-grid { display: flex; flex-wrap: wrap; gap: 16px; }
.add-field.full { width: 100%; }
.add-field.half { width: calc(50% - 8px); }
.add-field label { display: block; font-size: 0.82rem; font-weight: 500; color: #475569; margin-bottom: 6px; }
.add-input-wrap { position: relative; display: flex; align-items: center; }
.add-input-wrap input,
.add-input-wrap select {
  width: 100%; padding: 10px 14px 10px 38px;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  font-size: 0.9rem; background: #f8fafc; transition: all 0.2s; outline: none; font-family: inherit;
}
.add-input-wrap select { appearance: none; }
.add-input-wrap input:focus,
.add-input-wrap select:focus { border-color: #0d6efd; background: #fff; box-shadow: 0 0 0 3px rgba(13,110,253,0.08); }
.add-input-wrap.error input,
.add-input-wrap.error select { border-color: #ef4444; background: #fff5f5; }
.icon-prefix { position: absolute; left: 12px; color: #94a3b8; font-size: 0.85rem; pointer-events: none; }
.eye-btn { position: absolute; right: 10px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; }
.eye-btn:hover { color: #0d6efd; }
.err-text { font-size: 0.75rem; color: #ef4444; margin-top: 4px; display: block; }
.status-toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 14px;
}
.toggle-label { font-size: 0.82rem; font-weight: 500; color: #475569; }
.room-section { background: #f8fafc; border-radius: 12px; padding: 14px; }
.room-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.room-header label { font-size: 0.82rem; font-weight: 500; color: #475569; }
.btn-add-room { background: none; border: none; color: #0d6efd; font-size: 0.82rem; font-weight: 600; cursor: pointer; padding: 0; }
.room-empty { font-size: 0.8rem; color: #94a3b8; margin: 0; }
.room-row { display: flex; gap: 8px; margin-bottom: 8px; }
.room-select { flex: 1; padding: 7px 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.83rem; background: white; outline: none; font-family: inherit; }
.room-select:focus { border-color: #0d6efd; }
.btn-remove-room { width: 32px; background: #fee2e2; color: #ef4444; border: none; border-radius: 8px; cursor: pointer; flex-shrink: 0; }
.add-footer { display: flex; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
.btn-cancel-add {
  flex: 1; padding: 11px; background: #f1f5f9; color: #475569;
  border: none; border-radius: 10px; font-size: 0.875rem; font-weight: 500;
  cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.btn-cancel-add:hover:not(:disabled) { background: #e2e8f0; }
.btn-submit-add {
  flex: 2; padding: 11px; background: #1a1a1a; color: white;
  border: none; border-radius: 10px; font-size: 0.875rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s; font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-submit-add:hover:not(:disabled) { background: #333; }
.btn-submit-add:disabled, .btn-cancel-add:disabled { opacity: 0.6; cursor: not-allowed; }

.mini-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.us-pop-enter-active { animation: usPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.us-pop-leave-active { animation: usPop 0.2s ease-in reverse; }
@keyframes usPop {
  from { opacity: 0; transform: scale(0.92) translateY(16px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
