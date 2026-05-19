<template>
  <div class="card shadow-sm h-100">
    <div class="card-body p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="fw-bold m-0">
          <i class="bi bi-shield-lock text-primary me-2"></i>
          {{ locale.current === 'th' ? 'จัดการบทบาท' : 'Role Setting' }}
        </h5>
        <button class="btn btn-primary" @click="openModal()">
          <i class="fa-solid fa-plus me-1"></i>
          {{ locale.current === 'th' ? 'เพิ่มบทบาท' : 'Add Role' }}
        </button>
      </div>

      <!-- Table -->
      <div class="table-responsive rounded-3 border shadow-sm">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-blue">
            <tr>
              <th class="ps-3 py-3" style="min-width:140px">
                {{ locale.current === 'th' ? 'ชื่อบทบาท' : 'Role Name' }}
              </th>
              <!-- Tab Permissions -->
              <th class="py-3 text-center" style="min-width:48px" title="Dashboard">
                <i class="bi bi-speedometer2"></i>
              </th>
              <th class="py-3 text-center" style="min-width:48px" title="OEE">OEE</th>
              <th class="py-3 text-center" style="min-width:60px" title="Products">
                <i class="bi bi-box-seam"></i>
              </th>
              <th class="py-3 text-center" style="min-width:60px" title="Devices">
                <i class="bi bi-cpu"></i>
              </th>
              <th class="py-3 text-center" style="min-width:48px" title="Rooms">
                <i class="bi bi-door-open"></i>
              </th>
              <th class="py-3 text-center" style="min-width:60px" title="Reports">
                <i class="bi bi-file-earmark-bar-graph"></i>
              </th>
              <th class="py-3 text-center" style="min-width:60px" title="Settings">
                <i class="bi bi-gear"></i>
              </th>
              <!-- Divider -->
              <th class="py-3 text-center px-1" style="min-width:4px; width:4px; background:#e2e8f0; padding:0"></th>
              <!-- Scope Permissions -->
              <th class="py-3 text-center" style="min-width:48px" title="View">
                <i class="bi bi-eye"></i>
              </th>
              <th class="py-3 text-center" style="min-width:48px" title="Edit">
                <i class="bi bi-pencil"></i>
              </th>
              <th class="py-3 text-center" style="min-width:60px" title="Export">
                <i class="bi bi-download"></i>
              </th>
              <th class="py-3 text-center" style="min-width:80px">
                {{ locale.current === 'th' ? 'สถานะ' : 'Status' }}
              </th>
              <th class="py-3 text-center" style="min-width:90px">
                {{ locale.current === 'th' ? 'จัดการ' : 'Actions' }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="role in roles" :key="role.id">
              <td class="fw-bold ps-3">{{ role.name }}</td>
              <!-- Tab Permissions -->
              <td class="text-center">
                <span v-if="role.tab_permissions?.dashboard" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="role.tab_permissions?.oee" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="role.tab_permissions?.products" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="role.tab_permissions?.devices" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="role.tab_permissions?.rooms" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="role.tab_permissions?.reports" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="role.tab_permissions?.settings" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <!-- Divider -->
              <td class="p-0" style="background:#e2e8f0; width:4px"></td>
              <!-- Scope Permissions -->
              <td class="text-center">
                <span v-if="role.scope_permissions?.view" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="role.scope_permissions?.edit" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span v-if="role.scope_permissions?.export" class="text-success">✓</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-center">
                <span :class="role.is_active ? 'badge bg-success' : 'badge bg-secondary'">
                  {{ role.is_active
                    ? (locale.current === 'th' ? 'ใช้งาน' : 'Active')
                    : (locale.current === 'th' ? 'ปิดใช้' : 'Inactive') }}
                </span>
              </td>
              <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" @click="openModal(role)" :title="locale.current === 'th' ? 'แก้ไข' : 'Edit'">
                  <i class="fa-solid fa-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(role)" :title="locale.current === 'th' ? 'ลบ' : 'Delete'">
                  <i class="fa-solid fa-trash-alt"></i>
                </button>
              </td>
            </tr>
            <tr v-if="roles.length === 0 && !loadingList">
              <td colspan="15" class="text-center text-muted py-5">
                <i class="fa-solid fa-shield-halved d-block mb-2" style="font-size:2rem"></i>
                {{ locale.current === 'th' ? 'ยังไม่มีบทบาท' : 'No roles found.' }}
              </td>
            </tr>
            <tr v-if="loadingList">
              <td colspan="15" class="text-center text-muted py-5">
                <span class="spinner-border spinner-border-sm me-2"></span>
                {{ locale.current === 'th' ? 'กำลังโหลด...' : 'Loading...' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Column legend -->
      <div class="mt-2 d-flex flex-wrap gap-3 text-muted small">
        <span><i class="bi bi-speedometer2 me-1"></i>Dashboard</span>
        <span>OEE</span>
        <span><i class="bi bi-box-seam me-1"></i>{{ locale.current === 'th' ? 'สินค้า' : 'Products' }}</span>
        <span><i class="bi bi-cpu me-1"></i>{{ locale.current === 'th' ? 'อุปกรณ์' : 'Devices' }}</span>
        <span><i class="bi bi-door-open me-1"></i>{{ locale.current === 'th' ? 'ห้อง' : 'Rooms' }}</span>
        <span><i class="bi bi-file-earmark-bar-graph me-1"></i>{{ locale.current === 'th' ? 'รายงาน' : 'Reports' }}</span>
        <span><i class="bi bi-gear me-1"></i>{{ locale.current === 'th' ? 'ตั้งค่า' : 'Settings' }}</span>
        <span class="vr"></span>
        <span><i class="bi bi-eye me-1"></i>{{ locale.current === 'th' ? 'ดู' : 'View' }}</span>
        <span><i class="bi bi-pencil me-1"></i>{{ locale.current === 'th' ? 'แก้ไข' : 'Edit' }}</span>
        <span><i class="bi bi-download me-1"></i>{{ locale.current === 'th' ? 'ส่งออก' : 'Export' }}</span>
      </div>
    </div>

    <!-- Modal -->
    <div
      class="modal fade"
      :class="{ show: showModal }"
      :style="{ display: showModal ? 'block' : 'none' }"
      tabindex="-1"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title modal-title-custom fw-bold">
              <i class="bi bi-shield-lock me-2"></i>
              {{ isEdit
                ? (locale.current === 'th' ? 'แก้ไขบทบาท' : 'Edit Role')
                : (locale.current === 'th' ? 'เพิ่มบทบาท' : 'Add Role') }}
            </h5>
            <button type="button" class="btn-close" @click="closeModal()"></button>
          </div>

          <div class="modal-body">
            <!-- Role Name -->
            <div class="mb-4">
              <label class="form-label fw-bold">
                {{ locale.current === 'th' ? 'ชื่อบทบาท' : 'Role Name' }}
                <span class="text-danger">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                class="form-control"
                :placeholder="locale.current === 'th' ? 'เช่น หัวหน้าไลน์' : 'e.g. Line Manager'"
              />
            </div>

            <!-- Tab Visibility -->
            <div class="mb-4">
              <label class="form-label fw-bold mb-3">
                <i class="bi bi-layout-tabs me-2 text-primary"></i>
                {{ locale.current === 'th' ? 'การมองเห็นแท็บ' : 'Tab Visibility' }}
              </label>
              <div class="row g-2">
                <div
                  v-for="tab in tabList"
                  :key="tab.key"
                  class="col-6 col-sm-4 col-md-3"
                >
                  <div
                    class="perm-card"
                    :class="{ active: form.tab_permissions[tab.key] }"
                    @click="form.tab_permissions[tab.key] = !form.tab_permissions[tab.key]"
                  >
                    <i :class="tab.icon + ' perm-icon'"></i>
                    <span class="perm-label">{{ locale.current === 'th' ? tab.labelTh : tab.labelEn }}</span>
                    <i
                      class="perm-check"
                      :class="form.tab_permissions[tab.key] ? 'bi bi-toggle-on text-success' : 'bi bi-toggle-off text-muted'"
                    ></i>
                  </div>
                </div>
              </div>
            </div>

            <!-- Scope Permissions -->
            <div class="mb-4">
              <label class="form-label fw-bold mb-3">
                <i class="bi bi-key me-2 text-primary"></i>
                {{ locale.current === 'th' ? 'สิทธิ์การใช้งาน' : 'Scope Permissions' }}
              </label>
              <div class="row g-2">
                <div
                  v-for="scope in scopeList"
                  :key="scope.key"
                  class="col-6 col-sm-4"
                >
                  <div
                    class="perm-card"
                    :class="{ active: form.scope_permissions[scope.key] }"
                    @click="form.scope_permissions[scope.key] = !form.scope_permissions[scope.key]"
                  >
                    <i :class="scope.icon + ' perm-icon'"></i>
                    <span class="perm-label">{{ locale.current === 'th' ? scope.labelTh : scope.labelEn }}</span>
                    <i
                      class="perm-check"
                      :class="form.scope_permissions[scope.key] ? 'bi bi-toggle-on text-success' : 'bi bi-toggle-off text-muted'"
                    ></i>
                  </div>
                </div>
              </div>
            </div>

            <!-- Active Status (edit only) -->
            <div v-if="isEdit" class="mb-2">
              <div class="form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="roleActiveSwitch"
                  v-model="form.is_active"
                />
                <label class="form-check-label fw-semibold" for="roleActiveSwitch">
                  {{ locale.current === 'th' ? 'เปิดใช้งาน' : 'Active' }}
                </label>
              </div>
            </div>
          </div>

          <div class="modal-footer modal-footer-custom">
            <button type="button" class="btn btn-secondary" @click="closeModal()">
              {{ locale.current === 'th' ? 'ยกเลิก' : 'Cancel' }}
            </button>
            <button type="button" class="btn btn-primary" @click="save()" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
              {{ isEdit
                ? (locale.current === 'th' ? 'อัปเดต' : 'Update')
                : (locale.current === 'th' ? 'สร้าง' : 'Create') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script>
import { showAlert, showConfirm } from '../../utils/swalHelper';

const BASE_API = import.meta.env.VITE_API_BASE_URL;

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

function defaultTabPermissions() {
  return { dashboard: false, oee: false, products: false, devices: false, rooms: false, reports: false, settings: false };
}

function defaultScopePermissions() {
  return { view: false, edit: false, export: false };
}

export default {
  name: 'RoleSetting',

  inject: ['locale'],

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
        tab_permissions: defaultTabPermissions(),
        scope_permissions: defaultScopePermissions(),
        is_active: true
      },
      tabList: [
        { key: 'dashboard', icon: 'bi bi-speedometer2', labelTh: 'แดชบอร์ด', labelEn: 'Dashboard' },
        { key: 'oee',       icon: 'bi bi-graph-up',     labelTh: 'OEE',       labelEn: 'OEE' },
        { key: 'products',  icon: 'bi bi-box-seam',     labelTh: 'สินค้า',    labelEn: 'Products' },
        { key: 'devices',   icon: 'bi bi-cpu',          labelTh: 'อุปกรณ์',   labelEn: 'Devices' },
        { key: 'rooms',     icon: 'bi bi-door-open',    labelTh: 'ห้อง',      labelEn: 'Rooms' },
        { key: 'reports',   icon: 'bi bi-file-earmark-bar-graph', labelTh: 'รายงาน', labelEn: 'Reports' },
        { key: 'settings',  icon: 'bi bi-gear',         labelTh: 'ตั้งค่า',   labelEn: 'Settings' }
      ],
      scopeList: [
        { key: 'view',   icon: 'bi bi-eye',      labelTh: 'ดู',     labelEn: 'View' },
        { key: 'edit',   icon: 'bi bi-pencil',   labelTh: 'แก้ไข', labelEn: 'Edit' },
        { key: 'export', icon: 'bi bi-download', labelTh: 'ส่งออก', labelEn: 'Export' }
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
          tab_permissions: { ...defaultTabPermissions(), ...(role.tab_permissions || {}) },
          scope_permissions: { ...defaultScopePermissions(), ...(role.scope_permissions || {}) },
          is_active: role.is_active !== false
        };
      } else {
        this.isEdit = false;
        this.editingId = null;
        this.form = {
          name: '',
          tab_permissions: defaultTabPermissions(),
          scope_permissions: defaultScopePermissions(),
          is_active: true
        };
      }
      this.showModal = true;
    },

    closeModal() {
      this.showModal = false;
    },

    async save() {
      if (!this.form.name.trim()) {
        await showAlert(
          'Error',
          this.locale.current === 'th' ? 'กรุณากรอกชื่อบทบาท' : 'Role name is required',
          'warning'
        );
        return;
      }

      this.loading = true;
      try {
        const url = this.isEdit
          ? `${BASE_API}/api/settings/roles/${this.editingId}`
          : `${BASE_API}/api/settings/roles`;
        const method = this.isEdit ? 'PUT' : 'POST';

        const body = {
          name: this.form.name.trim(),
          tab_permissions: this.form.tab_permissions,
          scope_permissions: this.form.scope_permissions
        };
        if (this.isEdit) body.is_active = this.form.is_active;

        const res = await fetch(url, {
          method,
          headers: authHeaders(),
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Save failed');
        }

        await showAlert(
          'Success',
          this.locale.current === 'th' ? 'บันทึกบทบาทสำเร็จ' : 'Role saved successfully',
          'success'
        );
        this.closeModal();
        this.loadRoles();
      } catch (err) {
        console.error(err);
        await showAlert('Error', err.message, 'error');
      } finally {
        this.loading = false;
      }
    },

    async confirmDelete(role) {
      const confirmed = await showConfirm(
        this.locale.current === 'th' ? 'ยืนยันการลบ' : 'Confirm Delete',
        this.locale.current === 'th'
          ? `คุณต้องการลบบทบาท "${role.name}" หรือไม่?`
          : `Delete role "${role.name}"?`,
        this.locale.current === 'th' ? 'ลบ' : 'Delete'
      );

      if (!confirmed) return;

      try {
        const res = await fetch(`${BASE_API}/settings/roles/${role.id}`, {
          method: 'DELETE',
          headers: authHeaders()
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Delete failed');
        }

        await showAlert(
          'Success',
          this.locale.current === 'th' ? 'ลบบทบาทสำเร็จ' : 'Role deleted successfully',
          'success'
        );
        this.loadRoles();
      } catch (err) {
        console.error(err);
        await showAlert('Error', err.message, 'error');
      }
    }
  }
};
</script>

<style scoped>
.modal.show {
  display: block !important;
}

.perm-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.18s;
  user-select: none;
  background: #f8fafc;
}

.perm-card:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.perm-card.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.perm-icon {
  font-size: 1rem;
  color: #64748b;
  flex-shrink: 0;
}

.perm-card.active .perm-icon {
  color: #2563eb;
}

.perm-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.perm-check {
  font-size: 1.2rem;
  flex-shrink: 0;
}
</style>
