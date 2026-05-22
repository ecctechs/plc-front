<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <transition name="modal-pop">
      <div class="profile-card">
        <button class="btn-close-top" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>

        <!-- Header -->
        <div class="user-header">
          <div class="avatar-wrapper">
            <div class="avatar-main"><i class="fas fa-user-shield"></i></div>
            <div class="status-dot" :class="{ online: user.is_active }"></div>
          </div>
          <h3 class="user-name">{{ user.email?.split('@')[0] }}</h3>
          <p class="user-role-badge">{{ user.role_name || user.permissions?.role_name || user.role?.replace(/_/g, ' ') }}</p>
        </div>

        <!-- ── VIEW MODE ── -->
        <div v-if="mode === 'view'" class="scroll-body">

          <!-- Info rows -->
          <div class="info-container">
            <div class="info-row">
              <div class="info-label"><i class="fas fa-fingerprint"></i><span>{{ locale.current === 'th' ? 'รหัสผู้ใช้' : 'USER ID' }}</span></div>
              <div class="info-value">#{{ user.id?.toString().padStart(4, '0') }}</div>
            </div>
            <div class="info-row">
              <div class="info-label"><i class="fas fa-envelope"></i><span>{{ locale.t('Email') }}</span></div>
              <div class="info-value text-truncate">{{ user.email }}</div>
            </div>
            <div class="info-row">
              <div class="info-label"><i class="fas fa-building"></i><span>{{ locale.current === 'th' ? 'บริษัท' : 'COMPANY' }}</span></div>
              <div class="info-value">{{ user.company?.name || '—' }}</div>
            </div>
            <div class="info-row">
              <div class="info-label"><i class="fas fa-signal"></i><span>{{ locale.current === 'th' ? 'สถานะ' : 'STATUS' }}</span></div>
              <div class="info-value">
                <span :class="user.is_active ? 'status-active' : 'status-inactive'">
                  {{ user.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Rooms -->
          <div class="section-block">
            <p class="section-label"><i class="fas fa-door-open me-2"></i>{{ locale.current === 'th' ? 'สิทธิ์ห้อง' : 'Room Access' }}</p>
            <div v-if="roomList.length === 0" class="empty-chip">
              {{ locale.current === 'th' ? 'ไม่มีการกำหนดห้อง' : 'No rooms assigned' }}
            </div>
            <div v-else class="chip-row">
              <span v-for="r in roomList" :key="r.id" class="room-chip">
                <i class="fas fa-door-closed me-1"></i>{{ r.room?.name || r.name || (locale.current === 'th' ? 'ทุกห้อง' : 'All') }}
                <span :class="['scope-dot', r.scope]">{{ r.scope }}</span>
              </span>
            </div>
          </div>

          <!-- Permissions -->
          <div class="section-block">
            <p class="section-label"><i class="fas fa-shield-alt me-2"></i>{{ locale.current === 'th' ? 'สิทธิ์การเข้าถึง' : 'Permissions' }}</p>
            <div v-if="user.role === 'super_admin'" class="chip-row">
              <span class="perm-chip all">
                <i class="fas fa-infinity me-1"></i>{{ locale.current === 'th' ? 'ทุกสิทธิ์' : 'All Access' }}
              </span>
            </div>
            <div v-else-if="enabledTabs.length === 0" class="empty-chip">
              {{ locale.current === 'th' ? 'ไม่มีสิทธิ์' : 'No permissions' }}
            </div>
            <div v-else class="chip-row">
              <span v-for="t in enabledTabs" :key="t.key" class="perm-chip">
                <i :class="['fas', t.icon, 'me-1']"></i>{{ locale.current === 'th' ? t.th : t.en }}
              </span>
            </div>
          </div>

          <!-- Scope Permissions -->
          <div class="section-block">
            <p class="section-label"><i class="fas fa-key me-2"></i>{{ locale.current === 'th' ? 'สิทธิ์การใช้งาน' : 'Scope Permissions' }}</p>
            <div v-if="user.role === 'super_admin'" class="chip-row">
              <span class="perm-chip all">
                <i class="fas fa-infinity me-1"></i>{{ locale.current === 'th' ? 'ทุกสิทธิ์' : 'All Access' }}
              </span>
            </div>
            <div v-else class="chip-row">
              <span v-for="s in SCOPE_META" :key="s.key"
                :class="['scope-perm-chip', scopePerms[s.key] ? 'active' : 'inactive']">
                <i :class="['fas', s.icon, 'me-1']"></i>
                {{ locale.current === 'th' ? s.th : s.en }}
              </span>
            </div>
          </div>

        </div>

        <!-- ── CHANGE PASSWORD MODE ── -->
        <div v-else-if="mode === 'change-password'" class="form-section">
          <p class="section-title">
            <i class="fas fa-lock me-2"></i>{{ locale.current === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password' }}
          </p>
          <div class="field-group">
            <label>{{ locale.current === 'th' ? 'รหัสผ่านปัจจุบัน' : 'Current Password' }}</label>
            <div class="input-wrap">
              <input v-model="pwForm.current" :type="showCurrent ? 'text' : 'password'" class="pf-input" />
              <button type="button" class="eye-btn" @click="showCurrent = !showCurrent">
                <i class="fas" :class="showCurrent ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
            </div>
          </div>
          <div class="field-group">
            <label>{{ locale.current === 'th' ? 'รหัสผ่านใหม่' : 'New Password' }}</label>
            <div class="input-wrap">
              <input v-model="pwForm.newPw" :type="showNew ? 'text' : 'password'" class="pf-input" placeholder="Min 6 characters" />
              <button type="button" class="eye-btn" @click="showNew = !showNew">
                <i class="fas" :class="showNew ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
            </div>
          </div>
          <div class="field-group">
            <label>{{ locale.current === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm Password' }}</label>
            <div class="input-wrap">
              <input v-model="pwForm.confirm" :type="showConfirm ? 'text' : 'password'" class="pf-input" />
              <button type="button" class="eye-btn" @click="showConfirm = !showConfirm">
                <i class="fas" :class="showConfirm ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
            </div>
          </div>
          <p v-if="pwError" class="err-text">{{ pwError }}</p>
        </div>

        <!-- Footer -->
        <div class="profile-footer">
          <template v-if="mode === 'view'">
            <button class="btn-secondary-action" @click="mode = 'change-password'">
              <i class="fas fa-lock me-1"></i>{{ locale.current === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Change Password' }}
            </button>
            <button class="btn-action-close" @click="$emit('close')">{{ locale.t('Close') }}</button>
          </template>
          <template v-else>
            <div class="action-row">
              <button class="btn-secondary-action" @click="cancelMode" :disabled="saving">{{ locale.t('Cancel') }}</button>
              <button class="btn-save-action" @click="savePassword" :disabled="saving">
                <span v-if="saving" class="mini-spinner"></span>
                {{ locale.current === 'th' ? 'บันทึก' : 'Save' }}
              </button>
            </div>
          </template>
        </div>

      </div>
    </transition>
  </div>
</template>

<script>
import { showAlert } from '../utils/swalHelper';

const BASE_API = import.meta.env.VITE_API_BASE_URL;

const SCOPE_META = [
  { key: 'view',    icon: 'fa-eye',           th: 'ดูข้อมูล',  en: 'View'    },
  { key: 'edit',    icon: 'fa-pencil-alt',     th: 'แก้ไข',     en: 'Edit'    },
  { key: 'export',  icon: 'fa-file-download',  th: 'ส่งออก',    en: 'Export'  },
  { key: 'control', icon: 'fa-gamepad',        th: 'ควบคุม',    en: 'Control' },
];

const TAB_META = [
  { key: 'dashboard',   icon: 'fa-tachometer-alt', th: 'แดชบอร์ด',        en: 'Dashboard'     },
  { key: 'oee',         icon: 'fa-chart-line',      th: 'OEE',             en: 'OEE'           },
  { key: 'alarmhistory',icon: 'fa-bell',             th: 'ประวัติแจ้งเตือน', en: 'Alarm History' },
  { key: 'interaction', icon: 'fa-sliders-h',        th: 'ควบคุม',          en: 'Interaction'   },
  { key: 'demo',        icon: 'fa-flask',             th: 'จำลอง',           en: 'Demo'          },
  { key: 'setting',     icon: 'fa-cog',               th: 'ตั้งค่า',         en: 'Setting'       }
];

export default {
  name: 'ProfileModal',
  inject: ['locale'],
  emits: ['close'],
  props: {
    user: { type: Object, required: true }
  },
  data() {
    return {
      SCOPE_META,
      mode: 'view',
      saving: false,
      pwError: '',
      pwForm: { current: '', newPw: '', confirm: '' },
      showCurrent: false,
      showNew: false,
      showConfirm: false
    };
  },
  computed: {
    roomList() {
      return this.user.rooms || [];
    },
    enabledTabs() {
      const perms = this.user.permissions?.tab_permissions || this.user.tab_permissions || {};
      return TAB_META.filter(t => perms[t.key] === true);
    },
    scopePerms() {
      return this.user.permissions?.scope_permissions || {};
    }
  },
  methods: {
    cancelMode() {
      this.mode = 'view';
      this.pwError = '';
      this.pwForm = { current: '', newPw: '', confirm: '' };
    },
    async savePassword() {
      this.pwError = '';
      if (!this.pwForm.current) {
        this.pwError = this.locale.current === 'th' ? 'กรุณากรอกรหัสผ่านปัจจุบัน' : 'Current password is required'; return;
      }
      if (this.pwForm.newPw.length < 6) {
        this.pwError = this.locale.current === 'th' ? 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' : 'Min 6 characters'; return;
      }
      if (this.pwForm.newPw !== this.pwForm.confirm) {
        this.pwError = this.locale.t('Passwords do not match'); return;
      }
      this.saving = true;
      try {
        const res = await fetch(`${BASE_API}/api/auth/change-password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ current_password: this.pwForm.current, new_password: this.pwForm.newPw })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Failed'); }
        await showAlert('', this.locale.current === 'th' ? 'เปลี่ยนรหัสผ่านสำเร็จ' : 'Password changed successfully', 'success');
        this.cancelMode();
      } catch (err) {
        this.pwError = err.message;
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap');

.modal-overlay {
  font-family: 'Prompt', sans-serif;
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000; padding: 20px;
}

.profile-card {
  background: #fff; width: 100%; max-width: 420px; max-height: 90vh;
  border-radius: 24px; position: relative;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.12);
}

.btn-close-top {
  position: absolute; top: 16px; right: 16px;
  background: #f3f4f6; border: none; width: 32px; height: 32px;
  border-radius: 50%; color: #6b7280; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; z-index: 1;
}
.btn-close-top:hover { background: #fee2e2; color: #ef4444; }

/* Header */
.user-header {
  padding: 40px 20px 20px; text-align: center;
  background: linear-gradient(to bottom, #f8faff 0%, #fff 100%);
  flex-shrink: 0;
}
.avatar-wrapper { position: relative; width: 80px; height: 80px; margin: 0 auto 14px; }
.avatar-main {
  width: 100%; height: 100%; background: #0062ff; border-radius: 24px;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 2rem; transform: rotate(-10deg);
}
.status-dot {
  position: absolute; bottom: -2px; right: -2px; width: 18px; height: 18px;
  background: #9ca3af; border: 3px solid white; border-radius: 50%;
}
.status-dot.online { background: #22c55e; }
.user-name { font-size: 1.15rem; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; text-transform: capitalize; }
.user-role-badge {
  display: inline-block; font-size: 0.73rem; font-weight: 600;
  color: #0062ff; background: #eff6ff; padding: 3px 12px;
  border-radius: 100px; text-transform: uppercase; letter-spacing: 0.5px;
}

/* Scroll body */
.scroll-body { flex: 1; overflow-y: auto; }

/* Info rows */
.info-container { padding: 0 24px 4px; }
.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 11px 0; border-bottom: 1.5px solid #f3f4f6;
}
.info-row:last-child { border-bottom: none; }
.info-label { display: flex; align-items: center; gap: 10px; color: #6b7280; font-size: 0.82rem; }
.info-label i { font-size: 0.85rem; width: 18px; }
.info-value { font-weight: 500; color: #374151; font-size: 0.88rem; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-active  { color: #16a34a; font-weight: 600; }
.status-inactive { color: #9ca3af; }

/* Sections */
.section-block { padding: 12px 24px 4px; border-top: 1.5px solid #f3f4f6; }
.section-label { font-size: 0.78rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; padding-bottom: 10px; }
.empty-chip { font-size: 0.8rem; color: #94a3b8; padding-bottom: 10px; }

/* Room chips */
.room-chip {
  display: inline-flex; align-items: center; gap: 4px;
  background: #f1f5f9; color: #334155;
  padding: 4px 10px; border-radius: 100px; font-size: 0.78rem; font-weight: 500;
}
.scope-dot {
  font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
  padding: 1px 6px; border-radius: 100px; margin-left: 2px;
}
.scope-dot.view    { background: #dbeafe; color: #1d4ed8; }
.scope-dot.control { background: #fef3c7; color: #b45309; }
.scope-dot.manage  { background: #ede9fe; color: #6d28d9; }

/* Scope permission chips */
.scope-perm-chip {
  display: inline-flex; align-items: center;
  padding: 4px 10px; border-radius: 100px; font-size: 0.78rem; font-weight: 500;
  border: 1px solid transparent;
}
.scope-perm-chip.active  { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
.scope-perm-chip.inactive { background: #f9fafb; color: #9ca3af; border-color: #e5e7eb; text-decoration: line-through; }

/* Permission chips */
.perm-chip {
  display: inline-flex; align-items: center;
  background: #f0fdf4; color: #15803d;
  border: 1px solid #bbf7d0;
  padding: 4px 10px; border-radius: 100px; font-size: 0.78rem; font-weight: 500;
}
.perm-chip.all {
  background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe;
}

/* Form section */
.form-section { flex: 1; overflow-y: auto; padding: 8px 24px 4px; }
.section-title { font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 16px; }
.field-group { margin-bottom: 14px; }
.field-group label { display: block; font-size: 0.8rem; font-weight: 500; color: #6b7280; margin-bottom: 6px; }
.input-wrap { position: relative; display: flex; align-items: center; }
.pf-input {
  width: 100%; padding: 10px 40px 10px 14px;
  border: 1.5px solid #e5e7eb; border-radius: 10px;
  font-size: 0.9rem; background: #f9fafb; transition: all 0.2s; font-family: inherit;
}
.pf-input:focus { outline: none; border-color: #0062ff; background: #fff; box-shadow: 0 0 0 3px rgba(0,98,255,0.06); }
.eye-btn { position: absolute; right: 10px; background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; display: flex; align-items: center; }
.eye-btn:hover { color: #0062ff; }
.err-text { font-size: 0.8rem; color: #ef4444; margin: 4px 0 0; }

/* Footer */
.profile-footer { padding: 12px 24px 20px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
.action-row { display: flex; gap: 10px; }
.btn-secondary-action {
  flex: 1; padding: 10px 8px; background: #f3f4f6; color: #374151;
  border: none; border-radius: 12px; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.btn-secondary-action:hover:not(:disabled) { background: #e5e7eb; }
.btn-secondary-action:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-save-action {
  flex: 1; padding: 10px 8px; background: #0062ff; color: white;
  border: none; border-radius: 12px; font-size: 0.85rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s; font-family: inherit;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-save-action:hover:not(:disabled) { background: #004dd1; }
.btn-save-action:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-action-close {
  width: 100%; padding: 11px; background: #1a1a1a; color: white;
  border: none; border-radius: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.2s; font-family: inherit; font-size: 0.9rem;
}
.btn-action-close:hover { background: #333; transform: translateY(-1px); }

.mini-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.modal-pop-enter-active { animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes pop {
  0%   { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1);   opacity: 1; }
}
</style>
