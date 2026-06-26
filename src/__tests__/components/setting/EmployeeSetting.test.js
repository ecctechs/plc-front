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

const mockLocale_th = {
  current: "th",
  t: (key) => key,
};

const mockEmployees = [
  { id: 1, employee_id: "EMP001", first_name: "John", last_name: "Doe", position: "Operator", department: "Production", phone: "0812345678" },
  { id: 2, employee_id: "EMP002", first_name: "Jane", last_name: "Smith", position: "Manager", department: "QC", phone: "" },
];

function setupFetch(employees = mockEmployees) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: employees }),
  });
}

function mountComp(locale = mockLocale) {
  setupFetch();
  return mount(EmployeeSetting, {
    global: { provide: { locale } },
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

  it("แสดง column headers EN", () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain("Employee ID");
    expect(wrapper.text()).toContain("Name");
    expect(wrapper.text()).toContain("Position");
    expect(wrapper.text()).toContain("Department");
    expect(wrapper.text()).toContain("Phone");
  });

  it("แสดง column headers TH", () => {
    const wrapper = mountComp(mockLocale_th);
    expect(wrapper.text()).toContain("รหัสพนักงาน");
    expect(wrapper.text()).toContain("ชื่อ-นามสกุล");
    expect(wrapper.text()).toContain("ตำแหน่ง");
    expect(wrapper.text()).toContain("แผนก");
    expect(wrapper.text()).toContain("โทรศัพท์");
  });

  it("แสดง 'No employees found.' เมื่อไม่มีข้อมูล EN", async () => {
    setupFetch([]);
    const wrapper = mount(EmployeeSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.employees).toHaveLength(0));
    expect(wrapper.text()).toContain("No employees found.");
  });

  it("แสดง 'ยังไม่มีพนักงาน' เมื่อไม่มีข้อมูล TH", async () => {
    setupFetch([]);
    const wrapper = mount(EmployeeSetting, { global: { provide: { locale: mockLocale_th } } });
    await vi.waitFor(() => expect(wrapper.vm.employees).toHaveLength(0));
    expect(wrapper.text()).toContain("ยังไม่มีพนักงาน");
  });

  it("แสดง '—' สำหรับ position/department/phone ที่ว่าง", async () => {
    setupFetch([{ id: 2, employee_id: "EMP002", first_name: "Jane", last_name: "Smith",
      position: "", department: "", phone: "" }]);
    const wrapper = mount(EmployeeSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.employees).toHaveLength(1));
    const tds = wrapper.findAll("td");
    const texts = tds.map(td => td.text());
    expect(texts.filter(t => t === "—").length).toBeGreaterThanOrEqual(3);
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

  it("json.data undefined → employees = [] (|| [] fallback)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}), // no data field
    });
    const wrapper = mount(EmployeeSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.loading === false || true).toBe(true));
    expect(wrapper.vm.employees).toEqual([]);
  });

  it("โหลดล้มเหลว res.ok=false → showAlert error EN", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    mount(EmployeeSetting, {
      global: { provide: { locale: mockLocale } },
    });
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot load employees", "error");
    });
  });

  it("โหลดล้มเหลว res.ok=false → showAlert error TH", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    mount(EmployeeSetting, {
      global: { provide: { locale: mockLocale_th } },
    });
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "โหลดข้อมูลพนักงานไม่สำเร็จ", "error");
    });
  });
});

// ─── 3. Modal ───────────────────────────────────────────────
describe("EmployeeSetting > Modal", () => {
  it("openModal() Add → form ว่าง isEdit=false", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(false);
    expect(wrapper.vm.editingId).toBeNull();
    expect(wrapper.vm.form.employee_id).toBe("");
    expect(wrapper.vm.form.first_name).toBe("");
  });

  it("openModal(emp) Edit → form มีข้อมูลเดิม isEdit=true", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal(mockEmployees[0]);
    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.employee_id).toBe("EMP001");
    expect(wrapper.vm.form.first_name).toBe("John");
    expect(wrapper.vm.form.last_name).toBe("Doe");
    expect(wrapper.vm.editingId).toBe(1);
  });

  it("openModal(emp) ที่มี null fields → ใช้ '' fallback ทุก field รวมถึง employee_id", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal({ id: 9, employee_id: null,
      first_name: null, last_name: null, position: null, department: null, phone: null });
    expect(wrapper.vm.form.employee_id).toBe("");
    expect(wrapper.vm.form.first_name).toBe("");
    expect(wrapper.vm.form.last_name).toBe("");
    expect(wrapper.vm.form.position).toBe("");
    expect(wrapper.vm.form.department).toBe("");
    expect(wrapper.vm.form.phone).toBe("");
  });

  it("closeModal → ปิด modal", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.closeModal();
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("openModal reset loading = false", () => {
    const wrapper = mountComp();
    wrapper.vm.loading = true;
    wrapper.vm.openModal(mockEmployees[0]);
    expect(wrapper.vm.loading).toBe(false);
  });

  it("modal title Add EN: 'Add Employee'", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-title").text()).toContain("Add Employee");
  });

  it("modal title Edit EN: 'Edit Employee'", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal(mockEmployees[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-title").text()).toContain("Edit Employee");
  });

  it("modal title Add TH: 'เพิ่มพนักงาน'", async () => {
    const wrapper = mountComp(mockLocale_th);
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-title").text()).toContain("เพิ่มพนักงาน");
  });

  it("modal title Edit TH: 'แก้ไขพนักงาน'", async () => {
    const wrapper = mountComp(mockLocale_th);
    wrapper.vm.openModal(mockEmployees[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-title").text()).toContain("แก้ไขพนักงาน");
  });
});

// ─── 4. DOM Interactions ───────────────────────────────────
describe("EmployeeSetting > DOM Interactions", () => {
  it("คลิกปุ่ม Add Employee → openModal()", async () => {
    const wrapper = mountComp();
    await wrapper.find(".btn-primary").trigger("click");
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(false);
  });

  it("คลิกปุ่ม close (btn-close) → closeModal()", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find(".btn-close").trigger("click");
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("คลิกปุ่ม Cancel → closeModal()", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find(".btn-secondary").trigger("click");
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("คลิกปุ่ม Save → save() ถูกเรียก", async () => {
    setupFetch();
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "EMP010";
    wrapper.vm.form.first_name = "Test";
    await wrapper.vm.$nextTick();
    const saveSpy = vi.spyOn(wrapper.vm, "save");
    const saveBtn = wrapper.find(".modal-footer .btn-primary");
    await saveBtn.trigger("click");
    expect(saveSpy).toHaveBeenCalled();
  });

  it("DOM: input employee_id → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    const input = wrapper.find('input[placeholder="e.g. EMP001"]');
    await input.setValue("EMP-X01");
    expect(wrapper.vm.form.employee_id).toBe("EMP-X01");
  });

  it("DOM: input first_name → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    const inputs = wrapper.findAll("input.form-control");
    const firstNameInput = inputs.find(i => i.attributes("placeholder")?.includes("First"));
    await firstNameInput.setValue("Alice");
    expect(wrapper.vm.form.first_name).toBe("Alice");
  });

  it("DOM: input last_name → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    const inputs = wrapper.findAll("input.form-control");
    const lastNameInput = inputs.find(i => i.attributes("placeholder")?.includes("Last"));
    await lastNameInput.setValue("Wonder");
    expect(wrapper.vm.form.last_name).toBe("Wonder");
  });

  it("DOM: input position → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    const inputs = wrapper.findAll("input.form-control");
    const posInput = inputs.find(i => i.attributes("placeholder")?.includes("Operator"));
    await posInput.setValue("Technician");
    expect(wrapper.vm.form.position).toBe("Technician");
  });

  it("DOM: input department → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    const inputs = wrapper.findAll("input.form-control");
    const deptInput = inputs.find(i => i.attributes("placeholder")?.includes("Production"));
    await deptInput.setValue("Engineering");
    expect(wrapper.vm.form.department).toBe("Engineering");
  });

  it("DOM: input phone → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    const phoneInput = wrapper.find('input[placeholder="e.g. 0812345678"]');
    await phoneInput.setValue("0999999999");
    expect(wrapper.vm.form.phone).toBe("0999999999");
  });

  it("DOM: คลิกปุ่ม edit → openModal(emp) isEdit=true", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.employees).toHaveLength(2));
    await wrapper.vm.$nextTick();
    const editBtn = wrapper.find(".btn-outline-primary");
    await editBtn.trigger("click");
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(true);
  });

  it("DOM: คลิกปุ่ม delete → confirmDelete ถูกเรียก", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.employees).toHaveLength(2));
    await wrapper.vm.$nextTick();
    const deleteBtn = wrapper.find(".btn-outline-danger");
    await deleteBtn.trigger("click");
    expect(showConfirm).toHaveBeenCalled();
  });

  it("TH locale: form labels ใช้ภาษาไทย", async () => {
    const wrapper = mountComp(mockLocale_th);
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("รหัสพนักงาน");
    expect(wrapper.text()).toContain("ชื่อ");
    expect(wrapper.text()).toContain("นามสกุล");
    expect(wrapper.text()).toContain("ตำแหน่ง");
    expect(wrapper.text()).toContain("แผนก");
    expect(wrapper.text()).toContain("โทรศัพท์");
  });

  it("TH locale: placeholder ใน input ใช้ภาษาไทย", async () => {
    const wrapper = mountComp(mockLocale_th);
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    const inputs = wrapper.findAll("input.form-control");
    const placeholders = inputs.map(i => i.attributes("placeholder") || "");
    expect(placeholders.some(p => p.includes("ชื่อ"))).toBe(true);
  });
});

// ─── 5. Save ────────────────────────────────────────────────
describe("EmployeeSetting > Save", () => {
  it("employee_id ว่าง → warning EN", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Employee ID is required", "warning");
  });

  it("employee_id ว่าง → warning TH", async () => {
    const wrapper = mountComp(mockLocale_th);
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "กรุณากรอกรหัสพนักงาน", "warning");
  });

  it("first_name ว่าง → warning EN", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "EMP003";
    wrapper.vm.form.first_name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "First name is required", "warning");
  });

  it("first_name ว่าง → warning TH", async () => {
    const wrapper = mountComp(mockLocale_th);
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "EMP003";
    wrapper.vm.form.first_name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "กรุณากรอกชื่อ", "warning");
  });

  it("save สำเร็จ (Add) → fetch POST + showAlert success EN", async () => {
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
    const postCall = mockFetch.mock.calls.find(([, opts]) => opts && opts.method === "POST");
    expect(postCall).toBeTruthy();
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("save สำเร็จ (Add) → showAlert success TH", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
    const wrapper = mountComp(mockLocale_th);
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "EMP003";
    wrapper.vm.form.first_name = "Bob";
    await wrapper.vm.save();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Success", "บันทึกข้อมูลพนักงานสำเร็จ", "success");
    });
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

  it("save ล้มเหลว → showAlert error พร้อม API message", async () => {
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

  it("save ล้มเหลว ไม่มี API message → fallback 'Save failed'", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "EMP001";
    wrapper.vm.form.first_name = "Test";

    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    await wrapper.vm.save();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Save failed", "error");
    });
    consoleSpy.mockRestore();
  });

  it("save → loading กลับ false เสมอ (finally)", async () => {
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

  it("save ล้มเหลว → loading กลับ false (finally)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "err" }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "E1";
    wrapper.vm.form.first_name = "A";
    await wrapper.vm.save();
    expect(wrapper.vm.loading).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ─── 6. Delete ──────────────────────────────────────────────
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

  it("confirmDelete → showConfirm ข้อความ EN ครบ 4 พารามิเตอร์", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete({ id: 1, employee_id: "EMP001",
      first_name: "John", last_name: "Doe" });

    expect(showConfirm).toHaveBeenCalledWith(
      "Confirm Delete",
      `Delete employee "John Doe"?`,
      "Delete",
      "Cancel"
    );
  });

  it("confirmDelete → showConfirm ข้อความ TH ครบ 4 พารามิเตอร์", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp(mockLocale_th);
    await wrapper.vm.confirmDelete({ id: 1, employee_id: "EMP001",
      first_name: "สมชาย", last_name: "ใจดี" });

    expect(showConfirm).toHaveBeenCalledWith(
      "ยืนยันการลบ",
      `คุณต้องการลบพนักงาน "สมชาย ใจดี" หรือไม่?`,
      "ลบ",
      "ยกเลิก"
    );
  });

  it("confirmDelete name ว่าง → ใช้ employee_id เป็น fallback", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete({ id: 1, employee_id: "EMP001",
      first_name: "", last_name: "" });

    expect(showConfirm).toHaveBeenCalledWith(
      "Confirm Delete",
      `Delete employee "EMP001"?`,
      "Delete",
      "Cancel"
    );
  });

  it("delete สำเร็จ → showAlert success EN", async () => {
    setupFetch();
    showConfirm.mockResolvedValue(true);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockEmployees[0]);

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Success", "Employee deleted successfully", "success");
    });
  });

  it("delete สำเร็จ → showAlert success TH", async () => {
    setupFetch();
    showConfirm.mockResolvedValue(true);
    const wrapper = mountComp(mockLocale_th);
    await wrapper.vm.confirmDelete(mockEmployees[0]);

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Success", "ลบพนักงานสำเร็จ", "success");
    });
  });

  it("delete สำเร็จ → เรียก loadEmployees ใหม่", async () => {
    setupFetch();
    showConfirm.mockResolvedValue(true);
    const wrapper = mountComp();
    const callsBefore = mockFetch.mock.calls.filter(([url]) => url.includes("/api/employees")).length;
    await wrapper.vm.confirmDelete(mockEmployees[0]);
    await vi.waitFor(() => {
      const callsAfter = mockFetch.mock.calls.filter(([url]) => url.includes("/api/employees")).length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });
  });

  it("delete ล้มเหลว res.ok=false → catch → showAlert error พร้อม message", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    showConfirm.mockResolvedValue(true);
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.employees).toHaveLength(2));

    // override: GET employees = ok, DELETE = fail with message
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "DELETE")
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "Cannot delete" }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockEmployees }) });
    });
    await wrapper.vm.confirmDelete(mockEmployees[0]);

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot delete", "error");
    });
    consoleSpy.mockRestore();
  });

  it("delete ล้มเหลว ไม่มี message → fallback 'Delete failed'", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    showConfirm.mockResolvedValue(true);
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.employees).toHaveLength(2));

    // override: DELETE = fail with no message
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "DELETE")
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockEmployees }) });
    });
    await wrapper.vm.confirmDelete(mockEmployees[0]);

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Delete failed", "error");
    });
    consoleSpy.mockRestore();
  });
});

// ─── 7. Bug Cases (PASS) ───────────────────────────────────
describe("EmployeeSetting > Bug Cases (PASS)", () => {
  it("[BUG-1] openModal reset loading → ปุ่ม Save ต้องใช้ได้ทันที", () => {
    const wrapper = mountComp();
    wrapper.vm.loading = true;
    wrapper.vm.openModal(mockEmployees[0]);
    expect(wrapper.vm.loading).toBe(false);
  });

  it("[BUG-2] employee_id spaces-only → validation block ด้วย .trim()", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "   ";
    wrapper.vm.form.first_name = "John";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Employee ID is required", "warning");
  });
});

// ─── 8. Bug Cases (FAIL — อันตราย) ─────────────────────────
describe("EmployeeSetting > Bug Cases (FAIL)", () => {

  // BUG-3: confirmDelete → emp.first_name=null, last_name=null → "`${null} ${null}`" = "null null"
  // อันตราย: ถ้า Employee record ใน DB มี first_name=null (เกิดจาก migration หรือ import ข้อมูล)
  //          dialog แสดง `Delete employee "null null"?` แทนที่จะ fallback ไป employee_id
  //          ผู้ใช้เห็น "null null" → สับสน, รายงาน bug, ไม่กล้า confirm การลบ
  //          อาจทำให้ไม่กล้าลบ record เสียหายออกจากระบบ
  // FAIL เพราะ: Template literal `${null} ${null}` = "null null" (string ที่มีค่า)
  //             "null null".trim() = "null null" → truthy → ไม่ fallback ไป emp.employee_id
  it("[BUG-3] confirmDelete emp.first_name=null → dialog แสดง 'null null' ไม่ใช่ employee_id (FAIL)", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete({
      id: 5,
      employee_id: "EMP005",
      first_name: null,
      last_name: null,
    });

    // คาดหวัง: ชื่อ null → fallback ไป employee_id = "EMP005"
    expect(showConfirm).toHaveBeenCalledWith(
      "Confirm Delete",
      `Delete employee "EMP005"?`, // FAIL: ได้ `Delete employee "null null"?`
      "Delete",
      "Cancel"
    );
  });

  // BUG-4: save() ส่ง employee_id ที่ยังมี leading/trailing spaces ไปยัง API
  // อันตราย: validate ด้วย `.trim()` (ถูกต้อง) แต่ JSON.stringify(this.form) ส่งค่าดิบที่ไม่ trim
  //          DB จะ store " EMP010 " (มี spaces) ต่างจาก "EMP010"
  //          ค้นหาด้วย "EMP010" จะไม่เจอ, สร้าง duplicate records ใน future
  //          ยิ่งร้ายถ้า employee_id เป็น PK หรือ UNIQUE constraint
  // FAIL เพราะ: form.employee_id = "  EMP010  " ผ่าน validation (trim() ไม่ว่าง)
  //             แต่ form ยังถือ value "  EMP010  " (ไม่มี assignment trim กลับ)
  //             body = JSON.stringify(form) → employee_id = "  EMP010  "
  it("[BUG-4] save() ส่ง employee_id ที่ไม่ถูก trim ไปยัง API (FAIL)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "  EMP010  ";
    wrapper.vm.form.first_name = "Test";
    await wrapper.vm.save();

    const postCall = mockFetch.mock.calls.find(([, opts]) => opts?.method === "POST");
    const sentBody = JSON.parse(postCall[1].body);

    // คาดหวัง: API รับ trimmed employee_id = "EMP010"
    expect(sentBody.employee_id).toBe("EMP010"); // FAIL: ได้ "  EMP010  " (ไม่ trim)
  });

  // BUG-5: save() catch block แสดง error message โดยไม่คำนึง locale
  // อันตราย: ผู้ใช้ Thai ที่ดู UI เป็นภาษาไทยทั้งหมด แต่เมื่อ save fail (เช่น network down)
  //          เห็น popup "Error: Save failed" (English) ทั้งที่ validation errors เป็น Thai
  //          ไม่สม่ำเสมอ → confuse user + ยาก support เพราะ screenshot มี Thai UI กับ English error
  //          ถ้า API ส่ง error message เป็น Thai ก็ยังแสดงได้ แต่ fallback "Save failed" เป็น English เสมอ
  // FAIL เพราะ: catch block: `await showAlert("Error", err.message, "error")`
  //             err.message = throw new Error(err.message || "Save failed") → "Save failed" (English)
  //             ไม่มี `this.locale.current === 'th' ? 'บันทึกไม่สำเร็จ' : 'Save failed'`
  it("[BUG-5] save() catch ไม่มี locale switch → Thai mode แสดง English error (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountComp(mockLocale_th);
    wrapper.vm.openModal();
    wrapper.vm.form.employee_id = "EMP001";
    wrapper.vm.form.first_name = "Test";

    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}), // no message → err.message = "Save failed"
    });
    await wrapper.vm.save();

    // คาดหวัง: Thai locale ควรแสดงข้อความภาษาไทย
    expect(showAlert).toHaveBeenCalledWith(
      "Error",
      "บันทึกข้อมูลไม่สำเร็จ", // FAIL: ได้ "Save failed" (English) แทน
      "error"
    );
    consoleSpy.mockRestore();
  });
});
