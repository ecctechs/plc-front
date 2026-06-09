<template>
  <div class="card shadow-sm h-100">
    <div class="card-body p-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="fw-bold m-0">
          <i class="bi bi-person-badge text-primary me-2"></i>{{ locale.t('Employee Setting') }}
        </h5>
        <button class="btn btn-primary" @click="openModal()">
          <i class="fa-solid fa-plus me-1"></i> {{ locale.t('Add Employee') }}
        </button>
      </div>

      <!-- Table -->
      <div class="table-responsive rounded-3 border shadow-sm">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-blue">
            <tr>
              <th class="ps-3 py-3" style="width: 15%">{{ locale.current === 'th' ? 'รหัสพนักงาน' : 'Employee ID' }}</th>
              <th class="py-3" style="width: 20%">{{ locale.current === 'th' ? 'ชื่อ-นามสกุล' : 'Name' }}</th>
              <th class="py-3" style="width: 20%">{{ locale.current === 'th' ? 'ตำแหน่ง' : 'Position' }}</th>
              <th class="py-3" style="width: 18%">{{ locale.current === 'th' ? 'แผนก' : 'Department' }}</th>
              <th class="py-3" style="width: 17%">{{ locale.current === 'th' ? 'โทรศัพท์' : 'Phone' }}</th>
              <th class="py-3 text-center" style="width: 10%">{{ locale.t('Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in employees" :key="emp.id">
              <td class="fw-bold ps-3">{{ emp.employee_id }}</td>
              <td>{{ emp.first_name }} {{ emp.last_name }}</td>
              <td>{{ emp.position || '—' }}</td>
              <td>{{ emp.department || '—' }}</td>
              <td>{{ emp.phone || '—' }}</td>
              <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" @click="openModal(emp)" :title="locale.t('Edit')">
                  <i class="fa-solid fa-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="confirmDelete(emp)" :title="locale.t('Delete')">
                  <i class="fa-solid fa-trash-alt"></i>
                </button>
              </td>
            </tr>
            <tr v-if="employees.length === 0">
              <td colspan="6" class="text-center text-muted py-4">
                <i class="fa-solid fa-users d-block mb-2" style="font-size: 2rem;"></i>
                {{ locale.current === 'th' ? 'ยังไม่มีพนักงาน' : 'No employees found.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div class="modal fade" :class="{ show: showModal }" :style="{ display: showModal ? 'block' : 'none' }" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-md">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title modal-title-custom fw-bold">
              {{ isEdit ? (locale.current === 'th' ? 'แก้ไขพนักงาน' : 'Edit Employee') : (locale.current === 'th' ? 'เพิ่มพนักงาน' : 'Add Employee') }}
            </h5>
            <button type="button" class="btn-close" @click="closeModal()"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label fw-bold">{{ locale.current === 'th' ? 'รหัสพนักงาน' : 'Employee ID' }}</label>
              <input v-model="form.employee_id" type="text" class="form-control" placeholder="e.g. EMP001" />
            </div>
            <div class="row mb-3">
              <div class="col">
                <label class="form-label fw-bold">{{ locale.current === 'th' ? 'ชื่อ' : 'First Name' }}</label>
                <input v-model="form.first_name" type="text" class="form-control" :placeholder="locale.current === 'th' ? 'ชื่อ' : 'First name'" />
              </div>
              <div class="col">
                <label class="form-label fw-bold">{{ locale.current === 'th' ? 'นามสกุล' : 'Last Name' }}</label>
                <input v-model="form.last_name" type="text" class="form-control" :placeholder="locale.current === 'th' ? 'นามสกุล' : 'Last name'" />
              </div>
            </div>
            <div class="row mb-3">
              <div class="col">
                <label class="form-label fw-bold">{{ locale.current === 'th' ? 'ตำแหน่ง' : 'Position' }}</label>
                <input v-model="form.position" type="text" class="form-control" :placeholder="locale.current === 'th' ? 'เช่น Operator' : 'e.g. Operator'" />
              </div>
              <div class="col">
                <label class="form-label fw-bold">{{ locale.current === 'th' ? 'แผนก' : 'Department' }}</label>
                <input v-model="form.department" type="text" class="form-control" :placeholder="locale.current === 'th' ? 'เช่น ฝ่ายผลิต' : 'e.g. Production'" />
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label fw-bold">{{ locale.current === 'th' ? 'โทรศัพท์' : 'Phone' }}</label>
              <input v-model="form.phone" type="text" class="form-control" placeholder="e.g. 0812345678" />
            </div>
          </div>
          <div class="modal-footer modal-footer-custom">
            <button type="button" class="btn btn-secondary" @click="closeModal()">{{ locale.t('Cancel') }}</button>
            <button type="button" class="btn btn-primary" @click="save()" :disabled="loading">
              <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
              {{ isEdit ? locale.t('Update') : locale.t('Create') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script>
import { showAlert, showConfirm } from "../../utils/swalHelper";

const BASE_API = import.meta.env.VITE_API_BASE_URL;
const authH = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

export default {
  name: "EmployeeSetting",

  inject: ['locale'],

  data() {
    return {
      employees: [],
      showModal: false,
      isEdit: false,
      loading: false,
      editingId: null,
      form: {
        employee_id: "",
        first_name: "",
        last_name: "",
        position: "",
        department: "",
        phone: ""
      }
    };
  },

  mounted() {
    this.loadEmployees();
  },

  methods: {
    async loadEmployees() {
      try {
        const res = await fetch(`${BASE_API}/api/employees`, { headers: authH() });
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        this.employees = json.data || [];
      } catch (err) {
        console.error(err);
        await showAlert("Error", this.locale.current === 'th' ? 'โหลดข้อมูลพนักงานไม่สำเร็จ' : "Cannot load employees", "error");
      }
    },

    openModal(emp = null) {
      if (emp) {
        this.isEdit = true;
        this.editingId = emp.id;
        this.form = {
          employee_id: emp.employee_id || "",
          first_name:  emp.first_name  || "",
          last_name:   emp.last_name   || "",
          position:    emp.position    || "",
          department:  emp.department  || "",
          phone:       emp.phone       || ""
        };
      } else {
        this.isEdit = false;
        this.editingId = null;
        this.form = { employee_id: "", first_name: "", last_name: "", position: "", department: "", phone: "" };
      }
      this.showModal = true;
    },

    closeModal() {
      this.showModal = false;
    },

    async save() {
      if (!this.form.employee_id) {
        await showAlert("Error", this.locale.current === 'th' ? 'กรุณากรอกรหัสพนักงาน' : "Employee ID is required", "warning");
        return;
      }
      if (!this.form.first_name) {
        await showAlert("Error", this.locale.current === 'th' ? 'กรุณากรอกชื่อ' : "First name is required", "warning");
        return;
      }

      try {
        this.loading = true;
        const url = this.isEdit
          ? `${BASE_API}/api/employees/${this.editingId}`
          : `${BASE_API}/api/employees`;
        const method = this.isEdit ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json", ...authH() },
          body: JSON.stringify(this.form)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Save failed");
        }

        await showAlert("Success", this.locale.current === 'th' ? 'บันทึกข้อมูลพนักงานสำเร็จ' : "Employee saved successfully", "success");
        this.closeModal();
        this.loadEmployees();
      } catch (err) {
        console.error(err);
        await showAlert("Error", err.message, "error");
      } finally {
        this.loading = false;
      }
    },

    async confirmDelete(emp) {
      const name = `${emp.first_name} ${emp.last_name}`.trim() || emp.employee_id;
      const confirmed = await showConfirm(
        this.locale.current === 'th' ? 'ยืนยันการลบ' : 'Confirm Delete',
        this.locale.current === 'th' ? `คุณต้องการลบพนักงาน "${name}" หรือไม่?` : `Delete employee "${name}"?`,
        this.locale.current === 'th' ? 'ลบ' : 'Delete',
        this.locale.current === 'th' ? 'ยกเลิก' : 'Cancel'
      );

      if (confirmed) {
        try {
          const res = await fetch(`${BASE_API}/api/employees/${emp.id}`, {
            method: "DELETE",
            headers: authH()
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Delete failed");
          }

          await showAlert("Success", this.locale.current === 'th' ? 'ลบพนักงานสำเร็จ' : "Employee deleted successfully", "success");
          this.loadEmployees();
        } catch (err) {
          console.error(err);
          await showAlert("Error", err.message, "error");
        }
      }
    }
  }
};
</script>

<style scoped>
.modal.show {
  display: block !important;
}
</style>
