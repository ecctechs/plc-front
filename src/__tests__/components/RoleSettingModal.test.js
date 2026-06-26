import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import RoleSettingModal from "../../components/RoleSettingModal.vue";

// ─── Mock swalHelper ────────────────────────────────────────
vi.mock("../../utils/swalHelper", () => ({
  showAlert: vi.fn().mockResolvedValue(undefined),
  showConfirm: vi.fn().mockResolvedValue(true),
}));
import { showAlert, showConfirm } from "../../utils/swalHelper";

// ─── Mock fetch & localStorage ──────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("localStorage", {
  getItem: () => "fake-token",
  setItem: () => {},
});

// ─── Mock locale ────────────────────────────────────────────
const mockLocaleEn = {
  current: "en",
  t: (key) => key,
  toggle: vi.fn(),
};

const mockLocaleTh = {
  current: "th",
  t: (key) => key,
  toggle: vi.fn(),
};

// ─── Mock Role Data ─────────────────────────────────────────
const mockRoles = [
  {
    id: 1,
    name: "Admin",
    tab_permissions: { dashboard: true, oee: true, setting: true },
    scope_permissions: { view: true, edit: true, export: false },
    is_active: true,
  },
  {
    id: 2,
    name: "Operator",
    tab_permissions: { dashboard: true, oee: false, setting: false },
    scope_permissions: { view: true, edit: false, export: false },
    is_active: false,
  },
];

function mountModal(locale = mockLocaleEn) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: mockRoles }),
  });
  return mount(RoleSettingModal, {
    global: {
      provide: { locale },
      stubs: { transition: false },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render (EN) ─────────────────────────────────────────
describe("RoleSettingModal > Render", () => {
  it("render modal สำเร็จ", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".rs-overlay").exists()).toBe(true);
    expect(wrapper.find(".rs-card").exists()).toBe(true);
  });

  it("แสดง header title EN", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".rs-title").text()).toBe("Role Setting");
  });

  it("แสดง tab Roles เป็น active", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".rs-tab-btn.active").text()).toContain("Roles");
  });

  it("แสดง Add Role button EN", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".btn-primary-minimal").text()).toContain("Add Role");
  });
});

// ─── 2. Render (TH) ─────────────────────────────────────────
describe("RoleSettingModal > Render TH", () => {
  it("แสดง title TH", () => {
    const wrapper = mountModal(mockLocaleTh);
    expect(wrapper.find(".rs-title").text()).toBe("จัดการบทบาท");
  });

  it("แสดง subtitle TH", () => {
    const wrapper = mountModal(mockLocaleTh);
    expect(wrapper.find(".rs-subtitle").text()).toContain("กำหนดสิทธิ์");
  });

  it("แสดง tab TH", () => {
    const wrapper = mountModal(mockLocaleTh);
    expect(wrapper.find(".rs-tab-btn").text()).toContain("บทบาท");
  });

  it("แสดง Add Role TH", () => {
    const wrapper = mountModal(mockLocaleTh);
    expect(wrapper.find(".btn-primary-minimal").text()).toContain("เพิ่มบทบาท");
  });

  it("แสดง column headers TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await vi.waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    const text = wrapper.text();
    expect(text).toContain("ชื่อบทบาท");
    expect(text).toContain("การมองเห็นแท็บ");
    expect(text).toContain("สิทธิ์");
    expect(text).toContain("สถานะ");
    expect(text).toContain("จัดการ");
  });

  it("แสดง tab/scope sub-labels TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await vi.waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    expect(wrapper.text()).toContain("แดชบอร์ด");
    expect(wrapper.text()).toContain("ดู");
  });

  it("แสดง count badge TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await vi.waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    expect(wrapper.find(".rs-count-badge").text()).toContain("บทบาท");
  });

  it("แสดง status badge TH (active)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    expect(wrapper.findAll(".status-badge")[0].text()).toBe("ใช้งาน");
  });

  it("แสดง status badge TH (inactive)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    expect(wrapper.findAll(".status-badge")[1].text()).toBe("ปิดใช้");
  });
});

// ─── 3. Load Roles (API) ────────────────────────────────────
describe("RoleSettingModal > Load Roles", () => {
  it("mounted → เรียก fetch loadRoles", async () => {
    mountModal();
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][0]).toContain("/api/settings/roles");
  });

  it("โหลดสำเร็จ → แสดง roles ในตาราง", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles).toHaveLength(2));
    expect(wrapper.text()).toContain("Admin");
    expect(wrapper.text()).toContain("Operator");
  });

  it("json ไม่มี data field → roles = []", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const wrapper = mount(RoleSettingModal, {
      global: { provide: { locale: mockLocaleEn }, stubs: { transition: false } },
    });
    await vi.waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    expect(wrapper.vm.roles).toHaveLength(0);
  });

  it("โหลดล้มเหลว → เรียก showAlert error", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    mount(RoleSettingModal, {
      global: { provide: { locale: mockLocaleEn }, stubs: { transition: false } },
    });
    await vi.waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot load roles", "error")
    );
  });

  it("แสดง role count badge", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    expect(wrapper.find(".rs-count-badge").text()).toContain("2");
  });

  it("ระหว่างโหลด → แสดง loading spinner ในตาราง", async () => {
    let resolveLoad;
    mockFetch.mockReturnValue(new Promise((res) => { resolveLoad = res; }));
    const wrapper = mount(RoleSettingModal, {
      global: { provide: { locale: mockLocaleEn }, stubs: { transition: false } },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.loadingList).toBe(true);
    expect(wrapper.find(".spinner-border-sm").exists()).toBe(true);
    resolveLoad({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });

  it("ระหว่างโหลด TH → แสดง 'กำลังโหลดข้อมูล...'", async () => {
    let resolveLoad;
    mockFetch.mockReturnValue(new Promise((res) => { resolveLoad = res; }));
    const wrapper = mount(RoleSettingModal, {
      global: { provide: { locale: mockLocaleTh }, stubs: { transition: false } },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("กำลังโหลดข้อมูล");
    resolveLoad({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });

  it("ระหว่างโหลด EN → แสดง 'Loading...'", async () => {
    let resolveLoad;
    mockFetch.mockReturnValue(new Promise((res) => { resolveLoad = res; }));
    const wrapper = mount(RoleSettingModal, {
      global: { provide: { locale: mockLocaleEn }, stubs: { transition: false } },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Loading...");
    resolveLoad({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });

  it("ไม่มี roles → แสดง empty state TH", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    const wrapper = mount(RoleSettingModal, {
      global: { provide: { locale: mockLocaleTh }, stubs: { transition: false } },
    });
    await vi.waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    expect(wrapper.text()).toContain("ยังไม่มีข้อมูลบทบาท");
  });

  it("ไม่มี roles → แสดง empty state EN", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    const wrapper = mount(RoleSettingModal, {
      global: { provide: { locale: mockLocaleEn }, stubs: { transition: false } },
    });
    await vi.waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    expect(wrapper.text()).toContain("No roles found.");
  });
});

// ─── 4. Permission Indicators ───────────────────────────────
describe("RoleSettingModal > Permission Indicators", () => {
  it("tab_permission = true → is-active class", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    const indicators = wrapper.findAll(".perm-indicator.is-active");
    expect(indicators.length).toBeGreaterThan(0);
  });

  it("tab_permission = false → ไม่มี is-active", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    const inactive = wrapper.findAll(".perm-indicator:not(.is-active)");
    expect(inactive.length).toBeGreaterThan(0);
  });
});

// ─── 5. Status Badge ────────────────────────────────────────
describe("RoleSettingModal > Status", () => {
  it("is_active = true → แสดง Active EN", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    expect(wrapper.findAll(".status-badge")[0].text()).toBe("Active");
    expect(wrapper.findAll(".status-badge")[0].classes()).toContain("active");
  });

  it("is_active = false → แสดง Inactive EN", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    expect(wrapper.findAll(".status-badge")[1].text()).toBe("Inactive");
    expect(wrapper.findAll(".status-badge")[1].classes()).toContain("inactive");
  });
});

// ─── 6. Open Modal (Add / Edit) ─────────────────────────────
describe("RoleSettingModal > CRUD Modal", () => {
  it("คลิก Add Role → เปิด modal ใหม่ (isEdit = false)", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(false);
    expect(wrapper.vm.form.name).toBe("");
  });

  it("Add modal แสดง title EN 'Add Role'", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.find(".modal-title").text()).toContain("Add Role");
  });

  it("Add modal แสดง title TH 'เพิ่มบทบาท'", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.find(".modal-title").text()).toContain("เพิ่มบทบาท");
  });

  it("คลิก Edit → เปิด modal แก้ไขพร้อมข้อมูลเดิม", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    await wrapper.find(".btn-action.edit").trigger("click");
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.name).toBe("Admin");
  });

  it("Edit modal แสดง title EN 'Edit Role'", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    await wrapper.find(".btn-action.edit").trigger("click");
    expect(wrapper.find(".modal-title").text()).toContain("Edit Role");
  });

  it("Edit modal แสดง title TH 'แก้ไขบทบาท'", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    await wrapper.find(".btn-action.edit").trigger("click");
    expect(wrapper.find(".modal-title").text()).toContain("แก้ไขบทบาท");
  });

  it("Edit modal แสดง is_active toggle (isEdit = true)", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    await wrapper.find(".btn-action.edit").trigger("click");
    expect(wrapper.find("#rsActiveSwitch").exists()).toBe(true);
  });

  it("Add modal ไม่แสดง is_active toggle (isEdit = false)", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.find("#rsActiveSwitch").exists()).toBe(false);
  });

  it("openModal role ที่ไม่มี tab_permissions → ใช้ defaultTab", async () => {
    const wrapper = mountModal();
    wrapper.vm.openModal({ id: 99, name: "Test", is_active: true });
    expect(wrapper.vm.form.tab_permissions.dashboard).toBe(true);
  });

  it("openModal role ที่ไม่มี name → form.name เป็น ''", async () => {
    const wrapper = mountModal();
    wrapper.vm.openModal({ id: 10, is_active: true });
    expect(wrapper.vm.form.name).toBe("");
  });

  it("openModal role ที่ is_active = false", async () => {
    const wrapper = mountModal();
    wrapper.vm.openModal({ id: 5, name: "X", is_active: false });
    expect(wrapper.vm.form.is_active).toBe(false);
  });

  it("คลิก Cancel button → ปิด modal", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.vm.showModal).toBe(true);
    await wrapper.find(".btn-secondary-minimal").trigger("click");
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("คลิก X button ใน inner modal header → ปิด modal", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.vm.showModal).toBe(true);
    await wrapper.find(".modal-header .btn-close").trigger("click");
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("Cancel/Save label EN", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.find(".btn-secondary-minimal").text()).toContain("Cancel");
    expect(wrapper.find(".modal-footer .btn-primary-minimal").text()).toContain("Confirm Create");
  });

  it("Cancel/Save label TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.find(".btn-secondary-minimal").text()).toContain("ยกเลิก");
    expect(wrapper.find(".modal-footer .btn-primary-minimal").text()).toContain("ยืนยันการสร้าง");
  });

  it("Save Changes label ใน edit mode EN", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    await wrapper.find(".btn-action.edit").trigger("click");
    expect(wrapper.find(".modal-footer .btn-primary-minimal").text()).toContain("Save Changes");
  });

  it("Save Changes label ใน edit mode TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    await wrapper.find(".btn-action.edit").trigger("click");
    expect(wrapper.find(".modal-footer .btn-primary-minimal").text()).toContain("บันทึกการแก้ไข");
  });
});

// ─── 7. Form Inputs ─────────────────────────────────────────
describe("RoleSettingModal > Form Inputs", () => {
  it("กรอกชื่อ role ใน input → อัปเดต form.name", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    await wrapper.find(".minimal-input").setValue("Manager");
    expect(wrapper.vm.form.name).toBe("Manager");
  });

  it("form.name placeholder EN", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.find(".minimal-input").attributes("placeholder")).toContain("Manager");
  });

  it("form.name placeholder TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.find(".minimal-input").attributes("placeholder")).toContain("เช่น");
  });

  it("คลิก tab permission card → toggle เปิด/ปิด", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    const cards = wrapper.findAll(".perm-card-minimal");
    const firstCard = cards[0];
    const keyBefore = wrapper.vm.form.tab_permissions.dashboard;
    await firstCard.trigger("click");
    expect(wrapper.vm.form.tab_permissions.dashboard).toBe(!keyBefore);
  });

  it("คลิก scope permission card → toggle เปิด/ปิด", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    const tabCount = wrapper.vm.tabList.length;
    const cards = wrapper.findAll(".perm-card-minimal");
    const scopeCard = cards[tabCount];
    const keyBefore = wrapper.vm.form.scope_permissions.view;
    await scopeCard.trigger("click");
    expect(wrapper.vm.form.scope_permissions.view).toBe(!keyBefore);
  });

  it("perm card label EN", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    const labels = wrapper.findAll(".perm-label").map((c) => c.text());
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("View");
  });

  it("perm card label TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await wrapper.find(".btn-primary-minimal").trigger("click");
    const labels = wrapper.findAll(".perm-label").map((c) => c.text());
    expect(labels).toContain("แดชบอร์ด");
    expect(labels).toContain("ดู");
  });

  it("toggle is_active checkbox ใน edit mode", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    await wrapper.find(".btn-action.edit").trigger("click");
    const before = wrapper.vm.form.is_active;
    await wrapper.find("#rsActiveSwitch").setValue(!before);
    expect(wrapper.vm.form.is_active).toBe(!before);
  });

  it("is_active label EN", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    await wrapper.find(".btn-action.edit").trigger("click");
    expect(wrapper.find(".form-check-label").text()).toContain("Set as Active Role");
  });

  it("is_active label TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    await wrapper.find(".btn-action.edit").trigger("click");
    expect(wrapper.find(".form-check-label").text()).toContain("เปิดใช้งานบทบาทนี้");
  });

  it("loading = true ขณะ save → ปุ่ม disabled + spinner", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    await wrapper.setData({ loading: true });
    expect(wrapper.find(".modal-footer .btn-primary-minimal").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".spinner-border-sm").exists()).toBe(true);
  });

  it("คลิกปุ่ม Save ใน modal footer → เรียก save() (covers line 248)", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "Click Test Role";
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });
    await wrapper.find(".modal-footer .btn-primary-minimal").trigger("click");
    await vi.waitFor(() => expect(showAlert).toHaveBeenCalled());
  });
});

// ─── 8. Save Role ───────────────────────────────────────────
describe("RoleSettingModal > Save", () => {
  it("ชื่อว่าง → warning EN ไม่ส่ง API", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Role name is required", "warning");
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/settings/roles"),
      expect.objectContaining({ method: expect.stringMatching(/POST|PUT/) })
    );
  });

  it("ชื่อว่าง → warning TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "กรุณากรอกชื่อบทบาท", "warning");
  });

  it("save POST สำเร็จ EN → showAlert success + ปิด modal", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "New Role";
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
    await wrapper.vm.save();
    await vi.waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith("Success", "Role saved successfully", "success")
    );
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("save POST สำเร็จ TH → showAlert success TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "บทบาทใหม่";
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });
    await wrapper.vm.save();
    await vi.waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith("Success", "บันทึกบทบาทสำเร็จ", "success")
    );
  });

  it("save PUT ใน edit mode → URL มี role id + body มี is_active", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    await wrapper.find(".btn-action.edit").trigger("click");
    wrapper.vm.form.name = "Admin Updated";
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });
    await wrapper.vm.save();
    await vi.waitFor(() => expect(showAlert).toHaveBeenCalled());
    const saveCalls = mockFetch.mock.calls.filter(([, opts]) => opts?.method === "PUT");
    expect(saveCalls.length).toBe(1);
    const [url, opts] = saveCalls[0];
    expect(url).toContain("/api/settings/roles/1");
    const body = JSON.parse(opts.body);
    expect(body).toHaveProperty("is_active");
  });

  it("save ล้มเหลว API มี message → showAlert error", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "Bad Role";
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Duplicate name" }),
    });
    await wrapper.vm.save();
    await vi.waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith("Error", "Duplicate name", "error")
    );
  });

  it("save ล้มเหลว API ไม่มี message → fallback 'Save failed'", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "Bad Role";
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    await wrapper.vm.save();
    await vi.waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith("Error", "Save failed", "error")
    );
  });
});

// ─── 9. Delete Role ─────────────────────────────────────────
describe("RoleSettingModal > Delete", () => {
  it("confirmDelete → เรียก showConfirm + fetch DELETE", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    await wrapper.vm.confirmDelete(mockRoles[0]);
    expect(showConfirm).toHaveBeenCalled();
    const deleteCalls = mockFetch.mock.calls.filter(([, opts]) => opts?.method === "DELETE");
    expect(deleteCalls.length).toBe(1);
  });

  it("confirmDelete EN → showConfirm ข้อความ EN", async () => {
    const wrapper = mountModal();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await wrapper.vm.confirmDelete(mockRoles[0]);
    expect(showConfirm).toHaveBeenCalledWith(
      "Confirm Delete",
      expect.stringContaining("Admin"),
      "Delete",
      "Cancel"
    );
  });

  it("confirmDelete TH → showConfirm ข้อความ TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await wrapper.vm.confirmDelete(mockRoles[0]);
    expect(showConfirm).toHaveBeenCalledWith(
      "ยืนยันการลบ",
      expect.stringContaining("Admin"),
      "ลบ",
      "ยกเลิก"
    );
  });

  it("delete สำเร็จ EN → showAlert success + reload", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await wrapper.vm.confirmDelete(mockRoles[0]);
    await vi.waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith("Success", "Role deleted", "success")
    );
  });

  it("delete สำเร็จ TH → showAlert success TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await wrapper.vm.confirmDelete(mockRoles[0]);
    await vi.waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith("Success", "ลบบทบาทสำเร็จ", "success")
    );
  });

  it("confirmDelete ยกเลิก → ไม่เรียก fetch", async () => {
    const wrapper = mountModal();
    showConfirm.mockResolvedValue(false);
    await wrapper.vm.confirmDelete(mockRoles[0]);
    const deleteCalls = mockFetch.mock.calls.filter(([, opts]) => opts?.method === "DELETE");
    expect(deleteCalls).toHaveLength(0);
  });

  it("delete ล้มเหลว API มี message → showAlert error", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    showConfirm.mockResolvedValue(true);
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Cannot delete role in use" }),
    });
    await wrapper.vm.confirmDelete(mockRoles[0]);
    await vi.waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot delete role in use", "error")
    );
  });

  it("delete ล้มเหลว API ไม่มี message → fallback 'Delete failed'", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    showConfirm.mockResolvedValue(true);
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    await wrapper.vm.confirmDelete(mockRoles[0]);
    await vi.waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith("Error", "Delete failed", "error")
    );
  });

  it("คลิกปุ่ม Delete ใน table → เรียก confirmDelete", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await wrapper.findAll(".btn-action.delete")[0].trigger("click");
    expect(showConfirm).toHaveBeenCalled();
  });
});

// ─── 10. Close Event ────────────────────────────────────────
describe("RoleSettingModal > Close", () => {
  it("คลิก tab button → activeTab = 'roles'", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "other";
    await wrapper.find(".rs-tab-btn").trigger("click");
    expect(wrapper.vm.activeTab).toBe("roles");
  });

  it("คลิก overlay → emit close", async () => {
    const wrapper = mountModal();
    await wrapper.find(".rs-overlay").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("คลิกปุ่ม X (header) → emit close", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-close-minimal").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });
});

// ─── 11. Bug Cases (อันตรายที่สุด) ─────────────────────────
//
//  กฎ: ห้ามแก้ test — ต้องแก้ RoleSettingModal.vue เท่านั้น
//  test ที่ FAIL = พบ bug จริง

describe("RoleSettingModal > Bug Cases", () => {

  // ── BUG-1 ─────────────────────────────────────────────────
  // trim() ป้องกัน space ล้วนได้ → test นี้ควร PASS
  it("[BUG-1] ชื่อ role มีแต่ space → ต้องแสดง warning", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "   ";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Role name is required", "warning");
  });

  // ── BUG-2 ─────────────────────────────────────────────────
  // openModal() ต้อง reset loading = false เสมอ
  // ถ้าไม่ reset → ปุ่ม Save ยัง disabled ค้างอยู่
  it("[BUG-2] เปิด modal ขณะ loading ค้าง → ปุ่ม Save ต้องใช้ได้", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    wrapper.vm.loading = true;
    wrapper.vm.openModal(mockRoles[0]);
    expect(wrapper.vm.loading).toBe(false);
  });

  // ── BUG-3 (อันตรายที่สุด) ────────────────────────────────
  // confirmDelete ไม่มี loading/guard flag
  // double-click Delete ก่อน showConfirm resolve → 2 DELETE requests
  // ผลลัพธ์: role ถูกลบแล้ว ยังส่ง DELETE ซ้ำ → API error
  //          หรือถ้า role อื่นได้ id เดิม อาจลบผิดตัว
  it("🔴 [BUG-3] double-click Delete → fetch DELETE ถูกเรียก 2 ครั้ง", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));

    showConfirm.mockResolvedValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const deleteBtn = wrapper.findAll(".btn-action.delete")[0];
    deleteBtn.trigger("click");  // ครั้งที่ 1
    deleteBtn.trigger("click");  // ครั้งที่ 2 ทันที (ยังไม่มี guard)

    await new Promise((r) => setTimeout(r, 50));

    const deleteCalls = mockFetch.mock.calls.filter(([, opts]) => opts?.method === "DELETE");
    // ควรเรียกแค่ 1 ครั้ง → ถ้า FAIL แปลว่า bug มีจริง
    expect(deleteCalls.length).toBe(1);
  });

  // ── BUG-4 (อันตรายมาก) ───────────────────────────────────
  // ปิด outer modal (X หรือ overlay) ขณะ inner modal มีข้อมูลค้างอยู่
  // → ไม่มีการ warn ว่าข้อมูลจะหาย
  // ผลลัพธ์: user กรอกข้อมูลเสร็จเกือบหมด แล้วข้อมูลหายทันที
  it("🔴 [BUG-4] ปิด outer modal ขณะมีข้อมูลใน form → ควรมี confirm ก่อน", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "Important Role";  // มีข้อมูลค้างอยู่

    await wrapper.find(".btn-close-minimal").trigger("click");

    // Bug: close ทันทีโดยไม่ถามว่าต้องการทิ้งข้อมูลไหม
    // ถ้า fix แล้ว → ต้องไม่ emit close ทันที (ต้องมี confirm ก่อน)
    expect(wrapper.emitted("close")).toBeFalsy();
  });

  // ── BUG-5 (อันตรายมาก) ───────────────────────────────────
  // save() เรียก loadRoles() หลัง save สำเร็จ
  // แต่ loadRoles ถูกเรียกซ้อนทับกับ closeModal() พร้อมกัน
  // ถ้า component unmount ก่อน loadRoles เสร็จ → memory leak
  // อย่างน้อย: หลัง save สำเร็จ → modal ต้องปิด + roles ต้องโหลดใหม่
  it("🔴 [BUG-5] save สำเร็จ → modal ปิด และ roles โหลดใหม่ (fetch ถูกเรียก 2 ครั้ง)", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));

    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "New Role";

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
    await wrapper.vm.save();
    await vi.waitFor(() => expect(wrapper.vm.showModal).toBe(false));

    // fetch ถูกเรียก: 1 ครั้งตอน mounted + 1 ครั้งตอน save POST + 1 ครั้งตอน loadRoles หลัง save
    const getCalls = mockFetch.mock.calls.filter(
      ([, opts]) => !opts || opts.method === "GET" || !opts.method
    );
    expect(getCalls.length).toBeGreaterThanOrEqual(2);
  });
});
