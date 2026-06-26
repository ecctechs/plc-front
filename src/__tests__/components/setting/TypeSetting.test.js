import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import TypeSetting from "../../../components/setting/TypeSetting.vue";

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

// ─── Locale mocks ───────────────────────────────────────────
const mockLocale    = { current: "en", t: (key) => key, toggle: vi.fn() };
const mockLocale_th = { current: "th", t: (key) => key };

// ─── Fixtures ───────────────────────────────────────────────
const mockTypes = [
  { id: 1, name: "PLC",    description: "PLC device", display_types: ["onoff", "number"] },
  { id: 2, name: "Sensor", description: "",           display_types: ["number", "level"] },
];

// ─── Helpers ────────────────────────────────────────────────
function mountComp(locale = mockLocale) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: mockTypes }),
  });
  return mount(TypeSetting, { global: { provide: { locale } } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════
// 1. RENDER
// ═══════════════════════════════════════════════════════════
describe("TypeSetting > Render", () => {
  it("render สำเร็จ", () => {
    const wrapper = mountComp();
    expect(wrapper.find(".card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Type Setting");
  });

  it("แสดงปุ่ม Add Type", () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain("Add Type");
  });

  it("แสดง column headers: ON/OFF, Number, Number Gauge, Level", () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain("ON/OFF");
    expect(wrapper.text()).toContain("Number");
    expect(wrapper.text()).toContain("Number Gauge");
    expect(wrapper.text()).toContain("Level");
  });

  it("deviceTypes.length === 0 → แสดง 'No Device Types found.'", async () => {
    const wrapper = mountComp();
    wrapper.vm.deviceTypes = [];
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("No Device Types found.");
  });

  it("type มี 'number_gauge' → ✓ แสดงใน column number_gauge (TRUE branch)", async () => {
    // ครอบคลุม: v-if ... includes('number_gauge') → TRUE branch (✓ span)
    const wrapper = mountComp();
    wrapper.vm.deviceTypes = [
      { id: 9, name: "Gauge", display_types: ["onoff", "number_gauge", "level"] },
    ];
    await wrapper.vm.$nextTick();
    const cells = wrapper.find("tbody tr").findAll("td");
    // td[1]=onoff, [2]=number, [3]=number_gauge, [4]=level, [5]=actions
    expect(cells[3].find(".text-success").exists()).toBe(true);
    // number ไม่มีในนี้ → '-' (ครอบคลุม v-else สำหรับ number column)
    expect(cells[2].find(".text-muted").text()).toBe("-");
  });

  it("type.display_types = null → ทุก column แสดง '-' (&& short-circuit branch)", async () => {
    // ครอบคลุม: type.display_types && ... → null → false (short-circuit)
    const wrapper = mountComp();
    wrapper.vm.deviceTypes = [
      { id: 10, name: "No Display", display_types: null },
    ];
    await wrapper.vm.$nextTick();
    const row = wrapper.find("tbody tr");
    expect(row.findAll(".text-muted").length).toBe(4); // all 4 columns show '-'
  });

  it("modal title = 'Edit Device Type' ใน Edit mode", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal(mockTypes[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-title").text()).toContain("Edit Device Type");
  });

  it("modal title = 'Add Device Type' ใน Add mode", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-title").text()).toContain("Add Device Type");
  });

  it("ปุ่ม 'Update' แสดงใน Edit mode", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal(mockTypes[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-footer .btn-primary").text()).toContain("Update");
  });

  it("ปุ่ม 'Create' แสดงใน Add mode", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-footer .btn-primary").text()).toContain("Create");
  });

  it("spinner แสดงใน modal เมื่อ loading = true", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.loading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find(".modal-footer .btn-primary").attributes("disabled")).toBeDefined();
  });

  it("modal-backdrop แสดงเมื่อ showModal = true", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".modal-backdrop").exists()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 2. LOAD DATA
// ═══════════════════════════════════════════════════════════
describe("TypeSetting > Load", () => {
  it("mounted → เรียก fetch /api/device-types", async () => {
    mountComp();
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/device-types");
  });

  it("โหลดสำเร็จ → แสดง types ในตาราง", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.deviceTypes).toHaveLength(2));
    expect(wrapper.text()).toContain("PLC");
    expect(wrapper.text()).toContain("Sensor");
  });

  it("โหลดสำเร็จ response ไม่มี .data → deviceTypes = [] (|| [] branch)", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await Promise.resolve();
    await Promise.resolve();
    expect(wrapper.vm.deviceTypes).toHaveLength(0);
  });

  it("โหลดล้มเหลว EN → showAlert error EN", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({ ok: false });
    mount(TypeSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot load device types", "error");
    });
    consoleSpy.mockRestore();
  });

  it("โหลดล้มเหลว TH → showAlert TH strings (2 locale branches)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({ ok: false });
    mount(TypeSetting, { global: { provide: { locale: mockLocale_th } } });
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", "โหลดประเภทอุปกรณ์ไม่สำเร็จ", "error");
    });
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 3. DISPLAY TYPES TABLE
// ═══════════════════════════════════════════════════════════
describe("TypeSetting > Display Types", () => {
  it("PLC มี onoff + number → แสดง ✓ ที่ช่องเหล่านั้น", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.deviceTypes.length).toBe(2));
    const rows = wrapper.findAll("tbody tr");
    const firstRow = rows[0];
    const checks = firstRow.findAll(".text-success");
    expect(checks.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. MODAL (Open / Close)
// ═══════════════════════════════════════════════════════════
describe("TypeSetting > Modal", () => {
  it("openModal() Add → form ว่าง", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(false);
    expect(wrapper.vm.form.name).toBe("");
    expect(wrapper.vm.form.display_types).toEqual([]);
  });

  it("openModal(type) Edit → form มีข้อมูลเดิม", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal(mockTypes[0]);
    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.name).toBe("PLC");
    expect(wrapper.vm.form.display_types).toEqual(["onoff", "number"]);
    expect(wrapper.vm.editingId).toBe(1);
  });

  it("openModal(type) name = null → form.name = '' (|| branch)", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal({ id: 9, name: null, description: "desc", display_types: ["onoff"] });
    expect(wrapper.vm.form.name).toBe("");
  });

  it("openModal(type) description = null → form.description = '' (|| branch)", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal({ id: 9, name: "X", description: null, display_types: ["onoff"] });
    expect(wrapper.vm.form.description).toBe("");
  });

  it("openModal(type) display_types = null → form.display_types = [] (ternary [] branch)", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal({ id: 9, name: "X", description: "", display_types: null });
    expect(wrapper.vm.form.display_types).toEqual([]);
  });

  it("openModal() → reset loading = false", () => {
    const wrapper = mountComp();
    wrapper.vm.loading = true;
    wrapper.vm.openModal(mockTypes[0]);
    expect(wrapper.vm.loading).toBe(false);
  });

  it("closeModal → ปิด modal", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.closeModal();
    expect(wrapper.vm.showModal).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. DOM INTERACTIONS (template compiled functions)
// ═══════════════════════════════════════════════════════════
describe("TypeSetting > DOM Interactions", () => {
  it("DOM: คลิก Add Type btn → template handler เรียก openModal()", async () => {
    const wrapper = mountComp();
    const spy = vi.spyOn(wrapper.vm, "openModal");
    await wrapper.find(".btn-primary").trigger("click");
    expect(spy).toHaveBeenCalled();
    expect(wrapper.vm.showModal).toBe(true);
  });

  it("DOM: คลิก edit btn ในแถว → template handler เรียก openModal(type)", async () => {
    const wrapper = mountComp();
    wrapper.vm.deviceTypes = mockTypes;
    await wrapper.vm.$nextTick();
    const spy = vi.spyOn(wrapper.vm, "openModal");
    await wrapper.find(".btn-outline-primary").trigger("click");
    expect(spy).toHaveBeenCalledWith(mockTypes[0]);
  });

  it("DOM: คลิก delete btn ในแถว → template handler เรียก confirmDelete(type)", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    wrapper.vm.deviceTypes = mockTypes;
    await wrapper.vm.$nextTick();
    const spy = vi.spyOn(wrapper.vm, "confirmDelete");
    await wrapper.find(".btn-outline-danger").trigger("click");
    expect(spy).toHaveBeenCalledWith(mockTypes[0]);
  });

  it("DOM: คลิก btn-close → template handler เรียก closeModal()", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find(".btn-close").trigger("click");
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("DOM: คลิก Cancel btn → template handler เรียก closeModal()", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find(".btn-secondary").trigger("click");
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("DOM: คลิก Save btn → template handler เรียก save()", async () => {
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "DOM Test";
    wrapper.vm.form.display_types = ["onoff"];
    await wrapper.vm.$nextTick();
    const spy = vi.spyOn(wrapper.vm, "save");
    await wrapper.find(".modal-footer .btn-primary").trigger("click");
    expect(spy).toHaveBeenCalled();
  });

  it("DOM: input name → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find("input.form-control").setValue("Typed Name");
    expect(wrapper.vm.form.name).toBe("Typed Name");
  });

  it("DOM: textarea description → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find("textarea.form-control").setValue("My description");
    expect(wrapper.vm.form.description).toBe("My description");
  });

  it("DOM: checkbox onoff → v-model display_types setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find('input[value="onoff"]').setChecked(true);
    expect(wrapper.vm.form.display_types).toContain("onoff");
  });

  it("DOM: checkbox number → v-model display_types setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find('input[value="number"]').setChecked(true);
    expect(wrapper.vm.form.display_types).toContain("number");
  });

  it("DOM: checkbox number_gauge → v-model display_types setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find('input[value="number_gauge"]').setChecked(true);
    expect(wrapper.vm.form.display_types).toContain("number_gauge");
  });

  it("DOM: checkbox level → v-model display_types setter ทำงาน", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    await wrapper.vm.$nextTick();
    await wrapper.find('input[value="level"]').setChecked(true);
    expect(wrapper.vm.form.display_types).toContain("level");
  });
});

// ═══════════════════════════════════════════════════════════
// 6. SAVE
// ═══════════════════════════════════════════════════════════
describe("TypeSetting > Save", () => {
  it("ชื่อว่าง EN → warning EN", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Name is required", "warning");
  });

  it("ชื่อว่าง TH → warning TH (2 locale branches)", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale_th } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", "กรุณากรอกชื่อประเภท", "warning");
  });

  it("display_types ว่าง EN → warning EN", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.display_types = [];
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Please select at least one Display Type", "warning");
  });

  it("display_types ว่าง TH → warning TH (2 locale branches)", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: [] }) });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale_th } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.display_types = [];
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", "กรุณาเลือก Display Type อย่างน้อย 1 รายการ", "warning");
  });

  it("save สำเร็จ (Add POST) EN → showAlert success + ปิด modal", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ data: { id: 3 } }) });
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "New Type";
    wrapper.vm.form.display_types = ["onoff"];
    await wrapper.vm.save();
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Success", "Device Type saved successfully", "success");
    });
    expect(wrapper.vm.showModal).toBe(false);
    expect(wrapper.vm.loading).toBe(false);
  });

  it("save สำเร็จ (Add POST) TH → showAlert TH strings (2 locale branches)", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale_th } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "ประเภททดสอบ";
    wrapper.vm.form.display_types = ["onoff"];
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("สำเร็จ", "บันทึกประเภทอุปกรณ์สำเร็จ", "success");
  });

  it("save สำเร็จ (Edit PUT) → fetch PUT กับ URL /api/device-types/:id (PUT branch)", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.openModal(mockTypes[0]); // isEdit=true, editingId=1
    wrapper.vm.form.name = "PLC Updated";
    wrapper.vm.form.display_types = ["onoff"];
    await wrapper.vm.save();
    const putCall = mockFetch.mock.calls.find(
      ([url, opts]) => opts?.method === "PUT" && url.includes("/api/device-types/1")
    );
    expect(putCall).toBeTruthy();
  });

  it("save ล้มเหลว → showAlert error พร้อม err.message", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Dup";
    wrapper.vm.form.display_types = ["onoff"];
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Duplicate name" }),
    });
    await wrapper.vm.save();
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Duplicate name", "error");
    });
    consoleSpy.mockRestore();
  });

  it("save ล้มเหลว ไม่มี message → fallback 'Save failed' (|| branch)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) }); // no message
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.display_types = ["onoff"];
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Save failed", "error");
    consoleSpy.mockRestore();
  });

  it("save สำเร็จ → emit ไม่จำเป็น แต่ loadDeviceTypes ถูกเรียก", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.display_types = ["onoff"];
    const spy = vi.spyOn(wrapper.vm, "loadDeviceTypes");
    await wrapper.vm.save();
    expect(spy).toHaveBeenCalled();
  });

  it("save ล้มเหลว → loading กลับ false (finally)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "err" }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.display_types = ["onoff"];
    await wrapper.vm.save();
    expect(wrapper.vm.loading).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 7. DELETE
// ═══════════════════════════════════════════════════════════
describe("TypeSetting > Delete", () => {
  function setupDeleteMock(deleteOk = true, locale = mockLocale) {
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({
          ok: deleteOk,
          json: () =>
            Promise.resolve(deleteOk ? {} : { message: "Type is in use" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockTypes }) });
    });
    return mount(TypeSetting, { global: { provide: { locale } } });
  }

  it("confirmDelete EN → showConfirm EN strings (4 locale branches)", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockTypes[0]);
    expect(showConfirm).toHaveBeenCalledWith(
      "Confirm Delete",
      `Delete Device Type "${mockTypes[0].name}"?`,
      "Delete",
      "Cancel"
    );
  });

  it("confirmDelete TH → showConfirm TH strings (4 locale branches)", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp(mockLocale_th);
    await wrapper.vm.confirmDelete(mockTypes[0]);
    expect(showConfirm).toHaveBeenCalledWith(
      "ยืนยันการลบ",
      `คุณต้องการลบ Device Type "${mockTypes[0].name}" หรือไม่?`,
      "ลบ",
      "ยกเลิก"
    );
  });

  it("confirmDelete ยืนยัน EN → fetch DELETE + showAlert success EN (2 locale branches)", async () => {
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(true, mockLocale);
    await wrapper.vm.confirmDelete(mockTypes[0]);
    const delCall = mockFetch.mock.calls.find(([, opts]) => opts?.method === "DELETE");
    expect(delCall[0]).toContain(`/api/device-types/${mockTypes[0].id}`);
    expect(showAlert).toHaveBeenCalledWith("Success", "Device Type deleted successfully", "success");
  });

  it("confirmDelete ยืนยัน TH → showAlert success TH (2 locale branches)", async () => {
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(true, mockLocale_th);
    await wrapper.vm.confirmDelete(mockTypes[0]);
    expect(showAlert).toHaveBeenCalledWith("สำเร็จ", "ลบประเภทอุปกรณ์สำเร็จ", "success");
  });

  it("confirmDelete ยกเลิก → ไม่ DELETE", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockTypes[0]);
    const delCalls = mockFetch.mock.calls.filter(([, opts]) => opts?.method === "DELETE");
    expect(delCalls).toHaveLength(0);
  });

  it("confirmDelete สำเร็จ → loadDeviceTypes ถูกเรียกซ้ำ", async () => {
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(true);
    const spy = vi.spyOn(wrapper.vm, "loadDeviceTypes");
    await wrapper.vm.confirmDelete(mockTypes[0]);
    expect(spy).toHaveBeenCalled();
  });

  it("confirmDelete DELETE !res.ok → res.json() + throw + catch → showAlert (lines 237-239, 244-246)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(false, mockLocale);
    await wrapper.vm.confirmDelete(mockTypes[0]);
    expect(showAlert).toHaveBeenCalledWith("Error", "Type is in use", "error");
    consoleSpy.mockRestore();
  });

  it("confirmDelete DELETE !res.ok ไม่มี message → fallback 'Delete failed' (|| branch)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    showConfirm.mockResolvedValue(true);
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) }); // no message
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale } } });
    await wrapper.vm.confirmDelete(mockTypes[0]);
    expect(showAlert).toHaveBeenCalledWith("Error", "Delete failed", "error");
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 8. BUG CASES (PASS)
// ═══════════════════════════════════════════════════════════
describe("TypeSetting > Bug Cases (PASS)", () => {
  it("[BUG-1] openModal() ขณะ loading ค้าง → reset loading = false", () => {
    const wrapper = mountComp();
    wrapper.vm.loading = true;
    wrapper.vm.openModal(mockTypes[0]);
    expect(wrapper.vm.loading).toBe(false);
  });

  it("[BUG-2] ชื่อ type เป็น space ล้วน → แสดง warning (trim check)", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "   ";
    wrapper.vm.form.display_types = ["onoff"];
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Name is required", "warning");
  });
});

// ═══════════════════════════════════════════════════════════
// 9. BUG CASES (FAIL — อันตราย ยังไม่แก้ component)
// ═══════════════════════════════════════════════════════════
describe("TypeSetting > Bug Cases (FAIL)", () => {

  // BUG-3: save() catch ใช้ showAlert("Error", ...) แบบ hardcoded ไม่ผ่าน locale
  // อันตราย: loadDeviceTypes() catch ใช้ locale ternary ถูกต้อง:
  //            locale.current === 'th' ? 'ข้อผิดพลาด' : 'Error'
  //          แต่ save() catch: await showAlert("Error", err.message, "error") ← hardcoded!
  //          → ใน TH mode title เป็น "Error" ไม่ใช่ "ข้อผิดพลาด"
  //          → UX inconsistent กับ component อื่นทั้งหมดในระบบ (RoomSetting, TypeSetting)
  //          → ถ้า frontend ทำ i18n audit โดย grep "Error" จะไม่เจอ error นี้ว่าไม่ได้แปล
  //          → monitoring/alerting ที่ track error title จะมี mix ของ TH/EN → เสียความสม่ำเสมอ
  // FAIL เพราะ: ใน TH mode showAlert ถูกเรียกด้วย "Error" ไม่ใช่ "ข้อผิดพลาด"
  it("[BUG-3] save() catch TH → title ควรเป็น 'ข้อผิดพลาด' ไม่ใช่ 'Error' (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "POST") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: "ชื่อประเภทซ้ำ" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale_th } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "ซ้ำ";
    wrapper.vm.form.display_types = ["onoff"];
    await wrapper.vm.save();

    // คาดหวัง: TH mode → title = 'ข้อผิดพลาด'
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", expect.any(String), "error");
    // FAIL: ได้ showAlert("Error", ...) เพราะ title hardcoded
    consoleSpy.mockRestore();
  });

  // BUG-4: confirmDelete() catch ใช้ showAlert("Error", ...) hardcoded เช่นเดียวกัน
  // อันตราย: confirmDelete() ใช้ locale ternary ถูกต้องใน showConfirm และ showAlert success
  //          แต่ catch: await showAlert("Error", err.message, "error") ← hardcoded!
  //          → ใน TH mode ผู้ใช้เห็น "Error" dialog หลังจากลบไม่สำเร็จ
  //          → inconsistent: TH ตลอด flow จนถึงตอน error กลับมาเป็น EN
  //          → ถ้า error เกิดจาก permission denied หรือ constraint, user ไม่รู้บริบท
  //          → อาจนำไปสู่การลองลบซ้ำๆ และ server load ที่ไม่จำเป็น
  // FAIL เพราะ: ใน TH mode showAlert ถูกเรียกด้วย "Error" ไม่ใช่ "ข้อผิดพลาด"
  it("[BUG-4] confirmDelete() catch TH → title ควรเป็น 'ข้อผิดพลาด' ไม่ใช่ 'Error' (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    showConfirm.mockResolvedValue(true);
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: "ประเภทนี้มีการใช้งานอยู่" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale_th } } });
    await wrapper.vm.confirmDelete(mockTypes[0]);

    // คาดหวัง: TH mode → title = 'ข้อผิดพลาด'
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", expect.any(String), "error");
    // FAIL: ได้ showAlert("Error", ...) เพราะ title hardcoded
    consoleSpy.mockRestore();
  });

  // BUG-5: save() ส่ง form.name ดิบโดยไม่ trim → DB บันทึกชื่อประเภทที่มี spaces
  // อันตราย: validate ด้วย !this.form.name.trim() (จับ space-only ได้)
  //          แต่ส่ง JSON.stringify(this.form) ดิบ → body มี name: "  Heater  "
  //          → DB บันทึก "  Heater  " ซึ่ง ≠ "Heater" ในการค้นหาและ duplicate check
  //          → Device ที่ใช้ Device Type นี้จะ reference ชื่อที่ผิดพลาด
  //          → ถ้าระบบ sync ชื่อ Device Type ไปยัง PLC config หรือ report ก็จะมี spaces
  //          → ผู้ใช้สร้างซ้ำได้: "Heater" และ "  Heater  " ต่างกันใน DB แต่ดูเหมือนกันใน UI
  //          → sorting/grouping รายงาน OEE โดย type จะพัง เพราะ key ไม่ match
  // FAIL เพราะ: API body name = "  Heater  " ไม่ใช่ "Heater" (ไม่ trim)
  it("[BUG-5] save() ส่ง form.name ที่มี spaces โดยไม่ trim ก่อน POST (FAIL)", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mount(TypeSetting, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.openModal();
    wrapper.vm.form.name = "  Heater  "; // leading/trailing spaces
    wrapper.vm.form.display_types = ["onoff"];
    await wrapper.vm.save();

    const postCall = mockFetch.mock.calls.find(([, opts]) => opts?.method === "POST");
    expect(postCall).toBeTruthy();
    const body = JSON.parse(postCall[1].body);

    // คาดหวัง: name ถูก trim ก่อนส่ง API
    expect(body.name).toBe("Heater"); // FAIL: ได้ "  Heater  " (ไม่ trim)
  });
});
