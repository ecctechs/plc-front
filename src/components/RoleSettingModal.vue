<template>
  <div class="rs-overlay" @click.self="$emit('close')">
    <transition name="rs-pop" appear>
      <div class="rs-card">
        
        <!-- Header -->
        <div class="rs-card-header">
          <div class="header-content">
            <div class="rs-icon-wrap">
              <i class="fas fa-shield-alt"></i>
            </div>
            <div>
              <h3 class="rs-title">{{ locale.current === 'th' ? 'จัดการบทบาท' : 'Role Setting' }}</h3>
              <p class="rs-subtitle">
                {{ locale.current === 'th'
                  ? 'กำหนดสิทธิ์การเข้าถึงเมนูและการใช้งานสำหรับแต่ละบทบาท'
                  : 'Manage tab visibility and scope permissions per role' }}
              </p>
            </div>
          </div>
          <!-- Close button -->
          <button class="btn-close-minimal" @click="$emit('close')">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="rs-card-body">
          
          <!-- Toolbar -->
          <div class="rs-toolbar">
            <div class="rs-count-badge" v-if="!loadingList">
              <span class="dot"></span>
              {{ roles.length }} {{ locale.current === 'th' ? 'บทบาท' : 'Roles' }}
            </div>
            <div v-else></div>
            <button class="btn-primary-minimal" @click="openModal()">
              <i class="fas fa-plus me-2"></i>
              {{ locale.current === 'th' ? 'เพิ่มบทบาท' : 'Add Role' }}
            </button>
          </div>

          <!-- Table -->
          <div class="table-wrapper">
            <table class="rs-table">
              <thead>
                <!-- Group headers -->
                <tr>
                  <th rowspan="2" class="col-role-name">
                    {{ locale.current === 'th' ? 'ชื่อบทบาท' : 'Role Name' }}
                  </th>
                  <th :colspan="tabList.length" class="col-group">
                    <i class="fas fa-th-large me-1 text-primary"></i>
                    {{ locale.current === 'th' ? 'การมองเห็นแท็บ (Tabs)' : 'Tab Visibility' }}
                  </th>
                  <th :colspan="scopeList.length" class="col-group">
                    <i class="fas fa-key me-1 text-primary"></i>
                    {{ locale.current === 'th' ? 'สิทธิ์ (Scope)' : 'Scope' }}
                  </th>
                  <th rowspan="2" class="col-status">
                    {{ locale.current === 'th' ? 'สถานะ' : 'Status' }}
                  </th>
                  <th rowspan="2" class="col-actions">
                    {{ locale.current === 'th' ? 'จัดการ' : 'Actions' }}
                  </th>
                </tr>
                <!-- Per-column sub-headers -->
                <tr class="sub-header-row">
                  <th v-for="tab in tabList" :key="tab.key">
                    <i :class="tab.icon"></i>
                    <div class="sub-label">{{ locale.current === 'th' ? tab.labelTh : tab.labelEn }}</div>
                  </th>
                  <th v-for="scope in scopeList" :key="scope.key">
                    <i :class="scope.icon"></i>
                    <div class="sub-label">{{ locale.current === 'th' ? scope.labelTh : scope.labelEn }}</div>
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="role in roles" :key="role.id">
                  <td class="fw-medium text-dark">{{ role.name }}</td>
                  <td v-for="tab in tabList" :key="tab.key" class="text-center">
                    <div class="perm-indicator" :class="{ 'is-active': role.tab_permissions?.[tab.key] }">
                      <i class="fas" :class="role.tab_permissions?.[tab.key] ? 'fa-check' : 'fa-minus'"></i>
                    </div>
                  </td>
                  <td v-for="scope in scopeList" :key="scope.key" class="text-center">
                    <div class="perm-indicator" :class="{ 'is-active': role.scope_permissions?.[scope.key] }">
                      <i class="fas" :class="role.scope_permissions?.[scope.key] ? 'fa-check' : 'fa-minus'"></i>
                    </div>
                  </td>
                  <td class="text-center">
                    <span class="status-badge" :class="role.is_active ? 'active' : 'inactive'">
                      {{ role.is_active
                        ? (locale.current === 'th' ? 'ใช้งาน' : 'Active')
                        : (locale.current === 'th' ? 'ปิดใช้' : 'Inactive') }}
                    </span>
                  </td>
                  <td class="text-center">
                    <div class="action-buttons">
                      <button class="btn-action edit" @click="openModal(role)" title="Edit">
                        <i class="fas fa-pen"></i>
                      </button>
                      <button class="btn-action delete" @click="confirmDelete(role)" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Empty / Loading States -->
                <tr v-if="roles.length === 0 && !loadingList">
                  <td :colspan="2 + tabList.length + scopeList.length" class="empty-state">
                    <div class="empty-content">
                      <i class="fas fa-folder-open mb-2"></i>
                      <p>{{ locale.current === 'th' ? 'ยังไม่มีข้อมูลบทบาท' : 'No roles found.' }}</p>
                    </div>
                  </td>
                </tr>
                <tr v-if="loadingList">
                  <td :colspan="2 + tabList.length + scopeList.length" class="empty-state">
                    <div class="empty-content text-primary">
                      <span class="spinner-border spinner-border-sm mb-2 d-block mx-auto"></span>
                      <p>{{ locale.current === 'th' ? 'กำลังโหลดข้อมูล...' : 'Loading...' }}</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </transition>

    <!-- Inner CRUD Modal -->
    <div
      class="modal fade"
      :class="{ show: showModal }"
      :style="{ display: showModal ? 'block' : 'none' }"
      tabindex="-1"
      style="z-index:2200"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content minimal-modal">
          <div class="modal-header minimal-modal-header">
            <h5 class="modal-title fw-bold">
              <span class="modal-icon-wrap"><i class="fas fa-shield-alt"></i></span>
              {{ isEdit
                ? (locale.current === 'th' ? 'แก้ไขบทบาท' : 'Edit Role')
                : (locale.current === 'th' ? 'เพิ่มบทบาท' : 'Add Role') }}
            </h5>
            <button type="button" class="btn-close" @click="closeModal()"></button>
          </div>
          <div class="modal-body minimal-modal-body">

            <!-- Role Name -->
            <div class="mb-4">
              <label class="form-label fw-medium text-secondary">
                {{ locale.current === 'th' ? 'ชื่อบทบาท (Role Name)' : 'Role Name' }}
                <span class="text-danger">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                class="form-control minimal-input"
                :placeholder="locale.current === 'th' ? 'เช่น Manager, Operator...' : 'e.g. Manager, Operator...'"
              />
            </div>

            <!-- Tab Visibility -->
            <div class="mb-4">
              <label class="form-label fw-medium text-secondary mb-3">
                {{ locale.current === 'th' ? 'การมองเห็นแท็บ (Tab Visibility)' : 'Tab Visibility' }}
              </label>
              <div class="row g-3">
                <div v-for="tab in tabList" :key="tab.key" class="col-6 col-sm-4">
                  <div
                    class="perm-card-minimal"
                    :class="{ active: form.tab_permissions[tab.key] }"
                    @click="form.tab_permissions[tab.key] = !form.tab_permissions[tab.key]"
                  >
                    <div class="perm-icon"><i :class="tab.icon"></i></div>
                    <span class="perm-label">{{ locale.current === 'th' ? tab.labelTh : tab.labelEn }}</span>
                    <div class="checkbox-minimal">
                      <i class="fas fa-check" v-if="form.tab_permissions[tab.key]"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Scope Permissions -->
            <div class="mb-4">
              <label class="form-label fw-medium text-secondary mb-3">
                {{ locale.current === 'th' ? 'สิทธิ์การใช้งาน (Scope Permissions)' : 'Scope Permissions' }}
              </label>
              <div class="row g-3">
                <div v-for="scope in scopeList" :key="scope.key" class="col-6 col-sm-4">
                  <div
                    class="perm-card-minimal"
                    :class="{ active: form.scope_permissions[scope.key] }"
                    @click="form.scope_permissions[scope.key] = !form.scope_permissions[scope.key]"
                  >
                    <div class="perm-icon"><i :class="scope.icon"></i></div>
                    <span class="perm-label">{{ locale.current === 'th' ? scope.labelTh : scope.labelEn }}</span>
                    <div class="checkbox-minimal">
                      <i class="fas fa-check" v-if="form.scope_permissions[scope.key]"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Active (edit only) -->
            <div v-if="isEdit" class="pt-2 border-top mt-4">
              <div class="form-check form-switch custom-switch mt-3">
                <input class="form-check-input" type="checkbox" id="rsActiveSwitch" v-model="form.is_active" />
                <label class="form-check-label fw-medium ms-2" for="rsActiveSwitch">
                  {{ locale.current === 'th' ? 'เปิดใช้งานบทบาทนี้' : 'Set as Active Role' }}
                </label>
              </div>
            </div>
          </div>

          <div class="modal-footer minimal-modal-footer">
            <button type="button" class="btn-secondary-minimal" @click="closeModal()">
              {{ locale.current === 'th' ? 'ยกเลิก' : 'Cancel' }}
            </button>
            <button type="button" class="btn-primary-minimal" @click="save()" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
              {{ isEdit
                ? (locale.current === 'th' ? 'บันทึกการแก้ไข' : 'Save Changes')
                : (locale.current === 'th' ? 'ยืนยันการสร้าง' : 'Confirm Create') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showModal" class="modal-backdrop fade show" style="z-index:2100"></div>
  </div>
</template>

<script>
// ส่วน Script โค้ดเดิม ไม่มีการเปลี่ยนแปลง
import { showAlert, showConfirm } from '../utils/swalHelper';

const BASE_API = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  };
}

function defaultTab() {
  return {
    dashboard: true, oee: true, alarmhistory: true, interaction: true, demo: true, setting: true,
    products: true, devices: true, rooms: true, reports: true, settings: true
  };
}

function defaultScope() {
  return { view: false, edit: false, export: false };
}

export default {
  name: 'RoleSettingModal',
  inject: ['locale'],
  emits: ['close'],

  data() {
    return {
      roles: [],
      loadingList: false,
      showModal: false,
      isEdit: false,
      loading: false,
      editingId: null,
      form: {
        name: '',
        tab_permissions: defaultTab(),
        scope_permissions: defaultScope(),
        is_active: true
      },
      tabList: [
        { key: 'dashboard',    icon: 'fas fa-tachometer-alt', labelTh: 'แดชบอร์ด',       labelEn: 'Dashboard' },
        { key: 'oee',          icon: 'fas fa-chart-line',     labelTh: 'OEE',            labelEn: 'OEE' },
        { key: 'alarmhistory', icon: 'fas fa-bell',           labelTh: 'ประวัติแจ้งเตือน', labelEn: 'Alarm History' },
        { key: 'interaction',  icon: 'fas fa-sliders-h',      labelTh: 'ควบคุม',          labelEn: 'Interaction' },
        { key: 'demo',         icon: 'fas fa-flask',          labelTh: 'จำลอง',           labelEn: 'Demo' },
        { key: 'setting',      icon: 'fas fa-cog',            labelTh: 'ตั้งค่า',          labelEn: 'Setting' }
      ],
      scopeList: [
        { key: 'view',   icon: 'fas fa-eye',           labelTh: 'ดู',     labelEn: 'View' },
        { key: 'edit',   icon: 'fas fa-pencil-alt',    labelTh: 'แก้ไข', labelEn: 'Edit' },
        { key: 'export', icon: 'fas fa-file-download', labelTh: 'ส่งออก', labelEn: 'Export' }
      ]
    };
  },

  mounted() {
    this.loadRoles();
  },

  methods: {
    async loadRoles() {
      this.loadingList = true;
      try {
        const res = await fetch(`${BASE_API}/api/settings/roles`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        this.roles = json.data || [];
      } catch (err) {
        console.error(err);
        await showAlert('Error', 'Cannot load roles', 'error');
      } finally {
        this.loadingList = false;
      }
    },

    openModal(role = null) {
      if (role) {
        this.isEdit = true;
        this.editingId = role.id;
        this.form = {
          name: role.name || '',
          tab_permissions: { ...defaultTab(), ...(role.tab_permissions || {}) },
          scope_permissions: { ...defaultScope(), ...(role.scope_permissions || {}) },
          is_active: role.is_active !== false
        };
      } else {
        this.isEdit = false;
        this.editingId = null;
        this.form = { name: '', tab_permissions: defaultTab(), scope_permissions: defaultScope(), is_active: true };
      }
      this.showModal = true;
    },

    closeModal() {
      this.showModal = false;
    },

    async save() {
      if (!this.form.name.trim()) {
        await showAlert('Error', this.locale.current === 'th' ? 'กรุณากรอกชื่อบทบาท' : 'Role name is required', 'warning');
        return;
      }
      this.loading = true;
      try {
        const url = this.isEdit
          ? `${BASE_API}/api/settings/roles/${this.editingId}`
          : `${BASE_API}/api/settings/roles`;
        const body = {
          name: this.form.name.trim(),
          tab_permissions: this.form.tab_permissions,
          scope_permissions: this.form.scope_permissions
        };
        if (this.isEdit) body.is_active = this.form.is_active;

        const res = await fetch(url, { method: this.isEdit ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(body) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Save failed'); }

        await showAlert('Success', this.locale.current === 'th' ? 'บันทึกบทบาทสำเร็จ' : 'Role saved successfully', 'success');
        this.closeModal();
        this.loadRoles();
      } catch (err) {
        await showAlert('Error', err.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    async confirmDelete(role) {
      const ok = await showConfirm(
        this.locale.current === 'th' ? 'ยืนยันการลบ' : 'Confirm Delete',
        this.locale.current === 'th' ? `ลบบทบาท "${role.name}" หรือไม่?` : `Delete role "${role.name}"?`,
        this.locale.current === 'th' ? 'ลบ' : 'Delete'
      );
      if (!ok) return;
      try {
        const res = await fetch(`${BASE_API}/api/settings/roles/${role.id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Delete failed'); }
        await showAlert('Success', this.locale.current === 'th' ? 'ลบบทบาทสำเร็จ' : 'Role deleted', 'success');
        this.loadRoles();
      } catch (err) {
        await showAlert('Error', err.message, 'error');
      }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap');

/* ── Overlay ── */
.rs-overlay {
  font-family: 'Prompt', sans-serif;
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}

/* ── Main Card ── */
.rs-card {
  background: #ffffff;
  width: 100%;
  max-width: 1100px;
  max-height: 90vh;
  border-radius: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* ── Header ── */
.rs-card-header {
  background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.rs-icon-wrap {
  width: 48px;
  height: 48px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.rs-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 4px;
}

.rs-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.btn-close-minimal {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.25rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-close-minimal:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* ── Body & Toolbar ── */
.rs-card-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  background: #f8fafc; /* Very light gray/blue background for the content area */
}

.rs-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.rs-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}
.rs-count-badge .dot {
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
}

.btn-primary-minimal {
  background: #3b82f6;
  color: #ffffff;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
}
.btn-primary-minimal:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}
.btn-primary-minimal:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

/* ── Table Design ── */
.table-wrapper {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.rs-table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

.rs-table th {
  background: #ffffff;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 12px 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e2e8f0;
}

.rs-table .col-group {
  text-align: center;
  border-bottom: none;
  padding-bottom: 4px;
}

.sub-header-row th {
  text-align: center;
  padding-top: 4px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f1f5f9;
  color: #64748b;
}

.sub-header-row th i {
  font-size: 1rem;
  margin-bottom: 4px;
  color: #94a3b8;
}

.sub-label {
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
}

.rs-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.rs-table tbody tr {
  transition: background 0.15s;
}
.rs-table tbody tr:hover {
  background: #f8fafc;
}

/* ── Permission Indicators (Check/Dash) ── */
.perm-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.75rem;
  color: #cbd5e1;
  background: transparent;
}
.perm-indicator.is-active {
  color: #3b82f6;
  background: #eff6ff;
}

/* ── Badges ── */
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}
.status-badge.active {
  background: #ecfdf5;
  color: #10b981;
}
.status-badge.inactive {
  background: #f1f5f9;
  color: #64748b;
}

/* ── Action Buttons ── */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.btn-action {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-action.edit {
  color: #3b82f6;
}
.btn-action.edit:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}
.btn-action.delete {
  color: #ef4444;
}
.btn-action.delete:hover {
  background: #fef2f2;
  border-color: #fecaca;
}

/* ── Empty State ── */
.empty-state {
  text-align: center;
  padding: 48px 24px !important;
}
.empty-content i {
  font-size: 2rem;
  color: #cbd5e1;
}
.empty-content p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

/* ── Inner Modal (Minimal Form) ── */
.minimal-modal {
  border: none;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
.minimal-modal-header {
  border-bottom: 1px solid #f1f5f9;
  padding: 24px 32px 20px;
  background: #ffffff;
}
.modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #0f172a;
  font-size: 1.25rem;
}
.modal-icon-wrap {
  background: #eff6ff;
  color: #3b82f6;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}
.minimal-modal-body {
  padding: 32px;
  background: #fcfcfd;
}
.minimal-input {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.minimal-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  outline: none;
}

/* Permission Cards */
.perm-card-minimal {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  height: 100%;
}
.perm-card-minimal:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
.perm-card-minimal.active {
  border-color: #3b82f6;
  background: #eff6ff;
}
.perm-card-minimal .perm-icon {
  font-size: 1.25rem;
  color: #94a3b8;
  transition: color 0.2s;
}
.perm-card-minimal.active .perm-icon {
  color: #3b82f6;
}
.perm-card-minimal .perm-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
}
.perm-card-minimal.active .perm-label {
  color: #1e3a8a;
}
.checkbox-minimal {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1.5px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.perm-card-minimal.active .checkbox-minimal {
  background: #3b82f6;
  border-color: #3b82f6;
}
.checkbox-minimal i {
  color: white;
  font-size: 0.65rem;
}
.perm-card-minimal {
  position: relative; /* For absolute checkbox */
}

/* Modal Footer */
.minimal-modal-footer {
  padding: 20px 32px;
  border-top: 1px solid #f1f5f9;
  background: #ffffff;
  display: flex;
  gap: 12px;
}
.btn-secondary-minimal {
  background: #f1f5f9;
  color: #475569;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary-minimal:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* Custom Switch */
.custom-switch .form-check-input:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

/* Animation */
.rs-pop-enter-active { animation: rs-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.rs-pop-leave-active { animation: rs-pop 0.2s ease reverse; }
@keyframes rs-pop {
  0%   { transform: translateY(20px) scale(0.95); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
</style>