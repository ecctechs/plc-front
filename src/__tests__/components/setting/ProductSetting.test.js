import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ProductSetting from "../../../components/setting/ProductSetting.vue";

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
const mockLocale    = { current: "en", t: (k) => k, toggle: vi.fn() };
const mockLocale_th = { current: "th", t: (k) => k };

// ─── Fixtures ───────────────────────────────────────────────
const mockProducts = [
  { id: 1, name: "Widget A", image_url: null, image_path: "http://img/a.png", cycle_time: 10 },
  { id: 2, name: "Widget B", image_url: null, image_path: null,               cycle_time: 20 },
];

const mockPlcData = {
  success: true,
  plc_address_output:   "D100",
  plc_address_active:   "M10",
  plc_address_complete: "M11",
  plc_address_reject:   "M12",
};

// ─── Helpers ────────────────────────────────────────────────
function setupFetchMock() {
  mockFetch.mockImplementation((url) => {
    if (url.includes("/api/products/plc-addresses")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPlcData) });
    }
    if (url.includes("/api/products")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockProducts }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function mountComp(locale = mockLocale) {
  setupFetchMock();
  return mount(ProductSetting, { global: { provide: { locale } } });
}

/** Mount + wait for both initial fetch calls to fire */
async function mountAndWait(locale = mockLocale) {
  const wrapper = mountComp(locale);
  await vi.waitFor(() => {
    const urls = mockFetch.mock.calls.map(([u]) => u);
    const hasProducts = urls.some((u) => u.includes("/api/products") && !u.includes("plc-addresses"));
    const hasPlc      = urls.some((u) => u.includes("plc-addresses"));
    expect(hasProducts && hasPlc).toBe(true);
  });
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════
// 1. RENDER
// ═══════════════════════════════════════════════════════════
describe("ProductSetting > Render", () => {
  it("render สำเร็จ", () => {
    const wrapper = mountComp();
    expect(wrapper.find(".card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Product Setting");
  });

  it("แสดงปุ่ม Add Product", () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain("Add Product");
  });

  it("แสดง PLC Address Configuration section", () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain("PLC Address Configuration");
  });

  it("products.length === 0 → แสดงแถว 'No products found.'", async () => {
    const wrapper = mountComp();
    wrapper.vm.products = [];
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("No products found.");
  });

  it("product มี image_path (ไม่มี image_url) → img แสดง src = image_path", async () => {
    const wrapper = mountComp();
    wrapper.vm.products = [
      { id: 1, name: "A", image_url: null, image_path: "http://img/a.png", cycle_time: 5 },
    ];
    await wrapper.vm.$nextTick();
    const img = wrapper.find("img.product-image");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("http://img/a.png");
  });

  it("product มี image_url → img แสดง src = image_url", async () => {
    const wrapper = mountComp();
    wrapper.vm.products = [
      { id: 2, name: "B", image_url: "http://img/url.png", image_path: null, cycle_time: 5 },
    ];
    await wrapper.vm.$nextTick();
    const img = wrapper.find("img.product-image");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("http://img/url.png");
  });

  it("product ไม่มีรูปเลย → แสดง span '-'", async () => {
    const wrapper = mountComp();
    wrapper.vm.products = [
      { id: 3, name: "C", image_url: null, image_path: null, cycle_time: 5 },
    ];
    await wrapper.vm.$nextTick();
    expect(wrapper.find("img.product-image").exists()).toBe(false);
    expect(wrapper.find("span.text-muted").text()).toBe("-");
  });

  it("savingPlc = true → spinner แสดง + ปุ่ม Save PLC disabled", async () => {
    const wrapper = mountComp();
    wrapper.vm.savingPlc = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find(".btn-success").attributes("disabled")).toBeDefined();
  });

  it("savingPlc = false → ไม่มี spinner + ปุ่ม Save PLC enabled", async () => {
    const wrapper = mountComp();
    wrapper.vm.savingPlc = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find(".btn-success").attributes("disabled")).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// 2. LOAD DATA
// ═══════════════════════════════════════════════════════════
describe("ProductSetting > Load", () => {
  it("mounted → เรียก fetch products + plc-addresses", async () => {
    await mountAndWait();
    const urls = mockFetch.mock.calls.map(([u]) => u);
    expect(urls.some((u) => u.includes("/api/products") && !u.includes("plc-addresses"))).toBe(true);
    expect(urls.some((u) => u.includes("plc-addresses"))).toBe(true);
  });

  it("loadProducts → json.data มีค่า → this.products = json.data", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.products).toHaveLength(2));
    expect(wrapper.text()).toContain("Widget A");
    expect(wrapper.text()).toContain("Widget B");
  });

  it("loadProducts → response เป็น array โดยตรง (ไม่มี .data) → ใช้ json (|| branch)", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("plc-addresses")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false }) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: 9, name: "Direct", image_path: null, cycle_time: 1 }]),
      });
    });
    const wrapper = mount(ProductSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.products).toHaveLength(1));
    expect(wrapper.vm.products[0].name).toBe("Direct");
  });

  it("loadProducts !res.ok → catch → products ยังเป็น [] ไม่ crash", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url) => {
      if (url.includes("plc-addresses")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false }) });
      }
      return Promise.resolve({ ok: false });
    });
    const wrapper = mount(ProductSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    expect(wrapper.vm.products).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it("loadPlcAddresses สำเร็จ → set plcAddresses ครบ", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() =>
      expect(wrapper.vm.plcAddresses.plc_address_output).toBe("D100")
    );
    expect(wrapper.vm.plcAddresses.plc_address_active).toBe("M10");
    expect(wrapper.vm.plcAddresses.plc_address_complete).toBe("M11");
    expect(wrapper.vm.plcAddresses.plc_address_reject).toBe("M12");
  });

  it("loadPlcAddresses fields เป็น null → fallback เป็น '' (4 || branches)", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("plc-addresses")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              plc_address_output:   null,
              plc_address_active:   null,
              plc_address_complete: null,
              plc_address_reject:   null,
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(ProductSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2));
    await Promise.resolve();
    await Promise.resolve();
    expect(wrapper.vm.plcAddresses.plc_address_output).toBe("");
    expect(wrapper.vm.plcAddresses.plc_address_active).toBe("");
    expect(wrapper.vm.plcAddresses.plc_address_complete).toBe("");
    expect(wrapper.vm.plcAddresses.plc_address_reject).toBe("");
  });

  it("loadPlcAddresses success = false → plcAddresses ไม่ถูก set (if block ไม่ทำงาน)", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("plc-addresses")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: false }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(ProductSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2));
    await Promise.resolve();
    await Promise.resolve();
    expect(wrapper.vm.plcAddresses.plc_address_output).toBe("");
  });

  it("loadPlcAddresses !res.ok → catch → ไม่ crash", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url) => {
      if (url.includes("plc-addresses")) {
        return Promise.resolve({ ok: false });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(ProductSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    expect(wrapper.vm.plcAddresses.plc_address_output).toBe("");
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 3. DOM INTERACTIONS (template compiled functions)
// ═══════════════════════════════════════════════════════════
describe("ProductSetting > DOM Interactions", () => {
  it("DOM: คลิก .btn-success → template handler เรียก savePlcAddresses", async () => {
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "PUT") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ message: "Saved" }) });
      }
      if (url.includes("plc-addresses")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(ProductSetting, { global: { provide: { locale: mockLocale } } });
    const spy = vi.spyOn(wrapper.vm, "savePlcAddresses");
    await wrapper.find(".btn-success").trigger("click");
    expect(spy).toHaveBeenCalled();
  });

  it("DOM: input plc_address_output → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    // Wait for loadPlcAddresses to finish before setValue (prevents async overwrite)
    await vi.waitFor(() => expect(wrapper.vm.plcAddresses.plc_address_output).toBe("D100"));
    const inputs = wrapper.findAll(".form-control-lg");
    await inputs[0].setValue("D200");
    expect(wrapper.vm.plcAddresses.plc_address_output).toBe("D200");
  });

  it("DOM: input plc_address_active → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.plcAddresses.plc_address_active).toBe("M10"));
    const inputs = wrapper.findAll(".form-control-lg");
    await inputs[1].setValue("M20");
    expect(wrapper.vm.plcAddresses.plc_address_active).toBe("M20");
  });

  it("DOM: input plc_address_complete → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.plcAddresses.plc_address_complete).toBe("M11"));
    const inputs = wrapper.findAll(".form-control-lg");
    await inputs[2].setValue("M21");
    expect(wrapper.vm.plcAddresses.plc_address_complete).toBe("M21");
  });

  it("DOM: input plc_address_reject → v-model setter ทำงาน", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.plcAddresses.plc_address_reject).toBe("M12"));
    const inputs = wrapper.findAll(".form-control-lg");
    await inputs[3].setValue("M22");
    expect(wrapper.vm.plcAddresses.plc_address_reject).toBe("M22");
  });

  it("DOM: คลิก edit button ในแถว → template handler เรียก openEditModal", async () => {
    const wrapper = mountComp();
    wrapper.vm.products = mockProducts;
    await wrapper.vm.$nextTick();
    const spy = vi.spyOn(wrapper.vm, "openEditModal");
    await wrapper.find(".btn-outline-primary").trigger("click");
    expect(spy).toHaveBeenCalledWith(mockProducts[0]);
  });

  it("DOM: คลิก delete button ในแถว → template handler เรียก confirmDelete", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    wrapper.vm.products = mockProducts;
    await wrapper.vm.$nextTick();
    const spy = vi.spyOn(wrapper.vm, "confirmDelete");
    await wrapper.find(".btn-outline-danger").trigger("click");
    expect(spy).toHaveBeenCalledWith(mockProducts[0]);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. EMIT EVENTS
// ═══════════════════════════════════════════════════════════
describe("ProductSetting > Events", () => {
  it("คลิก Add Product → emit 'add'", async () => {
    const wrapper = mountComp();
    await wrapper.find(".btn-primary").trigger("click");
    expect(wrapper.emitted("add")).toBeTruthy();
  });

  it("openEditModal(product) → emit 'edit' พร้อม product", () => {
    const wrapper = mountComp();
    wrapper.vm.openEditModal(mockProducts[0]);
    expect(wrapper.emitted("edit")).toBeTruthy();
    expect(wrapper.emitted("edit")[0][0]).toEqual(mockProducts[0]);
  });
});

// ═══════════════════════════════════════════════════════════
// 5. SAVE PLC ADDRESSES
// ═══════════════════════════════════════════════════════════
describe("ProductSetting > Save PLC Addresses", () => {
  function setupPlcSave(locale = mockLocale, responseData = { message: "PLC addresses saved successfully" }) {
    mockFetch.mockImplementation((url, opts) => {
      if (url.includes("plc-addresses") && opts?.method === "PUT") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(responseData) });
      }
      if (url.includes("plc-addresses")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    return mount(ProductSetting, { global: { provide: { locale } } });
  }

  function setupPlcSaveFail(locale = mockLocale, errData = { message: "Server error" }) {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url, opts) => {
      if (url.includes("plc-addresses") && opts?.method === "PUT") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve(errData) });
      }
      if (url.includes("plc-addresses")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    return { wrapper: mount(ProductSetting, { global: { provide: { locale } } }), consoleSpy };
  }

  it("savePlcAddresses สำเร็จ EN + json.message → showAlert ใช้ json.message", async () => {
    const wrapper = setupPlcSave(mockLocale, { message: "Custom OK" });
    await wrapper.vm.savePlcAddresses();
    expect(showAlert).toHaveBeenCalledWith("Success", "Custom OK", "success");
  });

  it("savePlcAddresses สำเร็จ EN ไม่มี json.message → fallback 'PLC addresses saved successfully'", async () => {
    const wrapper = setupPlcSave(mockLocale, {}); // no message field
    await wrapper.vm.savePlcAddresses();
    expect(showAlert).toHaveBeenCalledWith("Success", "PLC addresses saved successfully", "success");
  });

  it("savePlcAddresses สำเร็จ TH → showAlert ใช้ TH strings (ไม่ใช้ json.message)", async () => {
    const wrapper = setupPlcSave(mockLocale_th, { message: "Ignored in TH" });
    await wrapper.vm.savePlcAddresses();
    expect(showAlert).toHaveBeenCalledWith("สำเร็จ", "บันทึกที่อยู่ PLC สำเร็จ", "success");
  });

  it("savePlcAddresses ล้มเหลว !res.ok → throw + showAlert error EN", async () => {
    const { wrapper, consoleSpy } = setupPlcSaveFail(mockLocale, { message: "Server error" });
    await wrapper.vm.savePlcAddresses();
    expect(showAlert).toHaveBeenCalledWith("Error", "Server error", "error");
    consoleSpy.mockRestore();
  });

  it("savePlcAddresses ล้มเหลว ไม่มี err.message → fallback 'Save failed'", async () => {
    const { wrapper, consoleSpy } = setupPlcSaveFail(mockLocale, {}); // no message
    await wrapper.vm.savePlcAddresses();
    expect(showAlert).toHaveBeenCalledWith("Error", "Save failed", "error");
    consoleSpy.mockRestore();
  });

  it("savePlcAddresses สำเร็จ → savingPlc = false (finally)", async () => {
    const wrapper = setupPlcSave();
    await wrapper.vm.savePlcAddresses();
    expect(wrapper.vm.savingPlc).toBe(false);
  });

  it("savePlcAddresses ล้มเหลว → savingPlc = false (finally)", async () => {
    const { wrapper, consoleSpy } = setupPlcSaveFail();
    await wrapper.vm.savePlcAddresses();
    expect(wrapper.vm.savingPlc).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 6. CONFIRM DELETE
// ═══════════════════════════════════════════════════════════
describe("ProductSetting > Confirm Delete", () => {
  function setupDeleteMock(deleteOk = true, locale = mockLocale) {
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({
          ok: deleteOk,
          json: () => Promise.resolve(deleteOk ? {} : { message: "FK constraint violation" }),
        });
      }
      if (url.includes("plc-addresses")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockProducts }) });
    });
    return mount(ProductSetting, { global: { provide: { locale } } });
  }

  it("confirmDelete → showConfirm EN strings", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockProducts[0]);
    expect(showConfirm).toHaveBeenCalledWith(
      "Confirm Delete",
      `Delete product "${mockProducts[0].name}"?`,
      "Delete",
      "Cancel"
    );
  });

  it("confirmDelete → showConfirm TH strings (4 locale branches)", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp(mockLocale_th);
    await wrapper.vm.confirmDelete(mockProducts[0]);
    expect(showConfirm).toHaveBeenCalledWith(
      "ยืนยันการลบ",
      `คุณต้องการลบผลิตภัณฑ์ "${mockProducts[0].name}" หรือไม่?`,
      "ลบ",
      "ยกเลิก"
    );
  });

  it("confirmDelete ยืนยัน EN → fetch DELETE + showAlert success EN", async () => {
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(true, mockLocale);
    await wrapper.vm.confirmDelete(mockProducts[0]);
    const delCall = mockFetch.mock.calls.find(([, opts]) => opts?.method === "DELETE");
    expect(delCall[0]).toContain(`/api/products/${mockProducts[0].id}`);
    expect(showAlert).toHaveBeenCalledWith("Success", "Product deleted successfully", "success");
  });

  it("confirmDelete ยืนยัน TH → showAlert success TH (2 locale branches)", async () => {
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(true, mockLocale_th);
    await wrapper.vm.confirmDelete(mockProducts[0]);
    expect(showAlert).toHaveBeenCalledWith("สำเร็จ", "ลบผลิตภัณฑ์สำเร็จ", "success");
  });

  it("confirmDelete ยกเลิก → ไม่ fetch DELETE", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockProducts[0]);
    const delCalls = mockFetch.mock.calls.filter(([, opts]) => opts?.method === "DELETE");
    expect(delCalls).toHaveLength(0);
  });

  it("confirmDelete สำเร็จ → loadProducts ถูกเรียกซ้ำ", async () => {
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(true);
    const spy = vi.spyOn(wrapper.vm, "loadProducts");
    await wrapper.vm.confirmDelete(mockProducts[0]);
    expect(spy).toHaveBeenCalled();
  });

  it("confirmDelete DELETE !res.ok → catch → showAlert error EN (lines 247,252,253)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(false, mockLocale);
    await wrapper.vm.confirmDelete(mockProducts[0]);
    expect(showAlert).toHaveBeenCalledWith("Error", "Cannot delete product", "error");
    consoleSpy.mockRestore();
  });

  it("confirmDelete DELETE !res.ok TH → showAlert error TH (2 locale branches)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    showConfirm.mockResolvedValue(true);
    const wrapper = setupDeleteMock(false, mockLocale_th);
    await wrapper.vm.confirmDelete(mockProducts[0]);
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", "ไม่สามารถลบผลิตภัณฑ์ได้", "error");
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════
// 7. BUG CASES (FAIL — อันตราย ยังไม่แก้ component)
// ═══════════════════════════════════════════════════════════
describe("ProductSetting > Bug Cases (FAIL)", () => {

  // BUG-2: `json.data || json` ไม่ตรวจว่า json.data เป็น array หรือไม่
  // อันตราย: API บางครั้งอาจคืน { data: null, message: "No data" }
  //          → json.data = null (falsy) → null || { data: null } = object ทั้ง object!
  //          → this.products = { data: null } (plain object ไม่ใช่ array)
  //          → v-for="product in products" iterate ค่าของ object → [null]
  //          → template access null.id, null.name → TypeError: Cannot read properties of null
  //          → ตาราง render crash ผู้ใช้เห็นหน้าขาว
  //          ควรแก้: Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []
  // FAIL เพราะ: this.products จะเป็น object { data: null } → toBeInstanceOf(Array) fail
  it("[BUG-2] loadProducts → json.data = null → products ต้องเป็น Array ไม่ใช่ object (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url) => {
      if (url.includes("plc-addresses")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false }) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: null }), // edge case: data = null
      });
    });
    const wrapper = mount(ProductSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2));
    await Promise.resolve();
    await Promise.resolve();

    // คาดหวัง: products ต้องเป็น Array เสมอ (ไม่ใช่ object)
    expect(wrapper.vm.products).toBeInstanceOf(Array); // FAIL: ได้ { data: null }
    consoleSpy.mockRestore();
  });

  // BUG-3: savePlcAddresses catch ใช้ showAlert("Error", ...) แบบ hardcoded ไม่ผ่าน locale
  // อันตราย: ทุก method อื่นใช้ locale ternary เช่น
  //          confirmDelete catch → locale.current === 'th' ? 'ข้อผิดพลาด' : 'Error'
  //          แต่ savePlcAddresses catch → await showAlert("Error", err.message, "error")
  //          → ใน TH mode error title ยังเป็น "Error" แทน "ข้อผิดพลาด"
  //          → UX ไม่ consistent: ภาษาไทยทั้งหมด ยกเว้น error dialog นี้ที่เป็นอังกฤษ
  //          → ถ้าระบบ log/analytics ดู error title จะเห็น mix ของ TH/EN → filter ยาก
  // FAIL เพราะ: showAlert ถูกเรียกด้วย "Error" ไม่ใช่ "ข้อผิดพลาด"
  it("[BUG-3] savePlcAddresses catch TH → title ควรเป็น 'ข้อผิดพลาด' ไม่ใช่ 'Error' (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "PUT") {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "ข้อผิดพลาด API" }) });
      }
      if (url.includes("plc-addresses")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(ProductSetting, { global: { provide: { locale: mockLocale_th } } });
    await wrapper.vm.savePlcAddresses();

    // คาดหวัง: TH mode → title = 'ข้อผิดพลาด' (locale-aware เหมือน confirmDelete)
    expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", expect.any(String), "error");
    // FAIL: ได้ showAlert("Error", ...) เพราะ title hardcoded
    consoleSpy.mockRestore();
  });

  // BUG-4: confirmDelete catch ซ่อน API error message → ผู้ใช้ไม่รู้สาเหตุที่แท้จริง
  // อันตราย: เมื่อ DELETE ล้มเหลว code ทำ `throw new Error("Delete failed")` แบบ generic
  //          catch แสดง "Cannot delete product" hardcoded โดยไม่เคยอ่าน res.json() เลย
  //          API อาจส่ง: { message: "Product referenced in 500 production records" }
  //                      { message: "Permission denied: admin only" }
  //                      { message: "Product is active in current shift" }
  //          → ผู้ใช้เห็นแค่ "Cannot delete product" → ต้องโทรหา IT แทนที่จะแก้เองได้
  //          เปรียบกับ savePlcAddresses ที่ `const err = await res.json()` ก่อน throw ✓
  //          ควรแก้: const errData = await res.json(); throw new Error(errData.message || "Delete failed")
  // FAIL เพราะ: showAlert ถูกเรียกด้วย generic msg ไม่ใช่ API message
  it("[BUG-4] confirmDelete DELETE fail → showAlert ควรแสดง API message ไม่ใช่ generic (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    showConfirm.mockResolvedValue(true);

    const apiMsg = "Product is referenced in 500 production records";
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: apiMsg }),
        });
      }
      if (url.includes("plc-addresses")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    const wrapper = mount(ProductSetting, { global: { provide: { locale: mockLocale } } });
    await wrapper.vm.confirmDelete(mockProducts[0]);

    // คาดหวัง: แสดง API message เพื่อให้ผู้ใช้รู้สาเหตุ
    expect(showAlert).toHaveBeenCalledWith(expect.any(String), apiMsg, "error");
    // FAIL: ได้ showAlert("Error", "Cannot delete product", "error") → ซ่อน API message
    consoleSpy.mockRestore();
  });
});
