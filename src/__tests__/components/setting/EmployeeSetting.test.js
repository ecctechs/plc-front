import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import EmployeeSetting from "../../../components/setting/EmployeeSetting.vue";

// ─── Mock swalHelper ────────────────────────────────────────
vi.mock("../../../utils/swalHelper", () => ({
  showAlert: vi.fn(),
  showConfirm: vi.fn(() => Promise.resolve(true)),
}));
import { showAlert, showConfirm } from "../../../utils/swalHelper";

// ─── Mock fetch & localStorage ──────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("localStorage", {
  getItem: () => "fake-token",
  setItem: () => {},
});

const mockLocale = {
  current: "en",
  t: (key) => key,
  toggle: vi.fn(),
};

const mockEmployees = [
  { id: 1, employee_id: "EMP001", first_name: "John", last_name: "Doe", position: "Operator", department: "Production", phone: "0812345678" },
  { id: 2, employee_id: "EMP002", first_name: "Jane", last_name: "Smith", position: "Manager", department: "QC", phone: "" },
];

function mountComp() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: mockEmployees }),
  });
  return mount(EmployeeSetting, {
    global: { provide: { locale: mockLocale } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("EmployeeSetting > Render", () => {
  it("render สำเร็จ", () => {
    const wrapper = mountComp();
    expect(wrapper.find(".card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Employee Setting");
  });

  it("แสดงปุ่ม Add Employee", () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain("Add Employee");
  });

  it("แสดง column headers", () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain("Employee ID");
    expect(wrapper.text()).toContain("Name");
    expect(wrapper.text()).toContain("Position");
    expect(wrapper.text()).toContain("Department");
    expect(wrapper.text()).toContain("Phone");
  });
});

// ─── 2. Load Data ───────────────────────────────────────────
describe("EmployeeSetting > Load", () => {
  it("mounted → เรียก fetch /api/employees", async () => {
    mountComp();
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/employees");
  });

  it("โหลดสำเร็จ → แสดง employees ในตาราง", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => {
      expect(wrapper.vm.employees).toHaveLength(2);
    });
    expect(wrapper.text()).toContain("EMP001");
    expect(wrapper.text()).toContain("John");
    expect(wrapper.text()).toContain("Jane");
  });

  it("โหลดล้มเหลว → showAlert error", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    mount(EmployeeSetting, {
      global: { provide: { locale: mockLocale } },
    });
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot load employees", "error");
    });
  });
});

// ─── 3. Modal ───────────────────────────────────────────────
describe("EmployeeSetting > Modal", () => {
  it("openModal() Add → form ว่าง", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(false);
    expect(wrapper.vm.form.employee_id).toBe("");
    expect(wrapper.vm.form.first_name).toBe("");
  });

  it("openModal(emp) Edit → form มีข้อมูลเดิม", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal(mockEmployees[0]);
    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.employee_id).toBe("EMP001");
    expect(wrapper.vm.form.first_name).toBe("John");
    expect(wrapper.vm.form.last_name).toBe("Doe");
    expect(wrapper.vm.editingId).toBe(1);
  });

  it("closeModal → ปิด modal", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.closeModal();
    expect(wrapper.vm.showModal).toBe(false);
  });
});

// ─── 4. Save ────────────────────────────────────────────────
describe("EmployeeSetting > Save", () => {
  it("employee_id ว่าง → warning", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Employee ID is required", "warning");
  });

  it("first_name ว่าง → warning", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "EMP003";
    wrapper.vm.form.first_name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "First name is required", "warning");
  });

  it("save สำเร็จ (Add) → fetch POST + showAlert success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "EMP003";
    wrapper.vm.form.first_name = "Bob";
    await wrapper.vm.save();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Success", "Employee saved successfully", "success");
    });
    const postCall = mockFetch.mock.calls.find(
      ([, opts]) => opts && opts.method === "POST"
    );
    expect(postCall).toBeTruthy();
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("save สำเร็จ (Edit) → fetch PUT", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal(mockEmployees[0]);
    wrapper.vm.form.first_name = "Updated";
    await wrapper.vm.save();

    const putCall = mockFetch.mock.calls.find(
      ([url, opts]) => opts && opts.method === "PUT" && url.includes("/api/employees/1")
    );
    expect(putCall).toBeTruthy();
  });

  it("save ล้มเหลว → showAlert error", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "EMP001";
    wrapper.vm.form.first_name = "Dup";

    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Duplicate ID" }),
    });
    await wrapper.vm.save();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Duplicate ID", "error");
    });
  });

  it("save → loading กลับ false", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "E1";
    wrapper.vm.form.first_name = "A";
    await wrapper.vm.save();
    expect(wrapper.vm.loading).toBe(false);
  });
});

// ─── 5. Delete ──────────────────────────────────────────────
describe("EmployeeSetting > Delete", () => {
  it("confirmDelete confirm → fetch DELETE", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockEmployees }),
    });
    showConfirm.mockResolvedValue(true);

    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockEmployees[0]);

    expect(showConfirm).toHaveBeenCalled();
    await vi.waitFor(() => {
      const delCalls = mockFetch.mock.calls.filter(
        ([, opts]) => opts && opts.method === "DELETE"
      );
      expect(delCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("confirmDelete ยกเลิก → ไม่ DELETE", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockEmployees[0]);

    const delCalls = mockFetch.mock.calls.filter(
      ([, opts]) => opts && opts.method === "DELETE"
    );
    expect(delCalls).toHaveLength(0);
  });
});

// ─── 6. Bug Cases ───────────────────────────────────────────
describe("EmployeeSetting > Bug Cases", () => {
  // BUG-1: openModal() ไม่ reset loading
  it("[BUG-1] เปิด modal ขณะ loading ค้าง → ปุ่ม Save ต้องใช้ได้", () => {
    const wrapper = mountComp();
    wrapper.vm.loading = true;
    wrapper.vm.openModal(mockEmployees[0]);
    expect(wrapper.vm.loading).toBe(false);
  });

  // BUG-2: employee_id เป็น space ล้วน → ผ่าน validation
  // !this.form.employee_id → "   " is truthy → ผ่านไปเช็ค first_name
  // ควร trim ก่อนเช็ค
  it("[BUG-2] employee_id เป็น space ล้วน → ต้องแสดง warning (ไม่ผ่านไป first_name)", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "   ";
    wrapper.vm.form.first_name = "John";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Employee ID is required", "warning");
  });
});
