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

const mockLocale = {
  current: "en",
  t: (key) => key,
  toggle: vi.fn(),
};

const mockProducts = [
  { id: 1, name: "Widget A", image_path: "http://img/a.png", cycle_time: 10 },
  { id: 2, name: "Widget B", image_path: null, cycle_time: 20 },
];

function setupFetchMock() {
  mockFetch.mockImplementation((url) => {
    if (url.includes("/api/products/plc-addresses")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            plc_address_output: "D100",
            plc_address_active: "M10",
            plc_address_complete: "M11",
            plc_address_reject: "M12",
          }),
      });
    }
    if (url.includes("/api/products")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockProducts }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
}

function mountComp() {
  setupFetchMock();
  return mount(ProductSetting, {
    global: { provide: { locale: mockLocale } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
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
});

// ─── 2. Load Data ───────────────────────────────────────────
describe("ProductSetting > Load", () => {
  it("mounted → เรียก fetch products + plc-addresses", async () => {
    mountComp();
    await vi.waitFor(() => {
      const prodCall = mockFetch.mock.calls.find(([url]) =>
        url.includes("/api/products") && !url.includes("plc-addresses")
      );
      const plcCall = mockFetch.mock.calls.find(([url]) =>
        url.includes("/api/products/plc-addresses")
      );
      expect(prodCall).toBeTruthy();
      expect(plcCall).toBeTruthy();
    });
  });

  it("โหลด products สำเร็จ → แสดงในตาราง", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => {
      expect(wrapper.vm.products).toHaveLength(2);
    });
    expect(wrapper.text()).toContain("Widget A");
    expect(wrapper.text()).toContain("Widget B");
  });

  it("โหลด plcAddresses สำเร็จ → ตั้งค่า fields", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => {
      expect(wrapper.vm.plcAddresses.plc_address_output).toBe("D100");
    });
    expect(wrapper.vm.plcAddresses.plc_address_active).toBe("M10");
  });
});

// ─── 3. PLC Address Save ────────────────────────────────────
describe("ProductSetting > PLC Address", () => {
  it("savePlcAddresses สำเร็จ → showAlert success", async () => {
    setupFetchMock();
    mockFetch.mockImplementation((url, opts) => {
      if (opts && opts.method === "PUT" && url.includes("plc-addresses")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "Saved" }),
        });
      }
      return setupFetchMock(), mockFetch(url, opts);
    });

    // Re-setup properly
    mockFetch.mockImplementation((url, opts) => {
      if (url.includes("/api/products/plc-addresses") && opts?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: "PLC addresses saved successfully" }),
        });
      }
      if (url.includes("/api/products/plc-addresses")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, plc_address_output: "D100", plc_address_active: "M10", plc_address_complete: "M11", plc_address_reject: "M12" }),
        });
      }
      if (url.includes("/api/products")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockProducts }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = mount(ProductSetting, {
      global: { provide: { locale: mockLocale } },
    });

    await vi.waitFor(() => expect(wrapper.vm.products.length).toBeGreaterThan(0));

    await wrapper.vm.savePlcAddresses();

    expect(showAlert).toHaveBeenCalledWith("Success", expect.any(String), "success");
    expect(wrapper.vm.savingPlc).toBe(false);
  });

  it("savePlcAddresses ล้มเหลว → showAlert error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Save failed" }),
    });

    const wrapper = mount(ProductSetting, {
      global: { provide: { locale: mockLocale } },
    });
    await wrapper.vm.savePlcAddresses();

    expect(showAlert).toHaveBeenCalledWith("Error", "Save failed", "error");
    expect(wrapper.vm.savingPlc).toBe(false);
  });
});

// ─── 4. Emit Events ────────────────────────────────────────
describe("ProductSetting > Events", () => {
  it("คลิก Add Product → emit add", async () => {
    const wrapper = mountComp();
    await wrapper.find(".btn-primary").trigger("click");
    expect(wrapper.emitted("add")).toBeTruthy();
  });

  it("openEditModal → emit edit", () => {
    const wrapper = mountComp();
    wrapper.vm.openEditModal(mockProducts[0]);
    expect(wrapper.emitted("edit")).toBeTruthy();
    expect(wrapper.emitted("edit")[0][0]).toEqual(mockProducts[0]);
  });
});

// ─── 5. Delete ──────────────────────────────────────────────
describe("ProductSetting > Delete", () => {
  it("confirmDelete confirm → fetch DELETE + showAlert success", async () => {
    setupFetchMock();
    showConfirm.mockResolvedValue(true);

    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockProducts[0]);

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
    await wrapper.vm.confirmDelete(mockProducts[0]);

    const delCalls = mockFetch.mock.calls.filter(
      ([, opts]) => opts && opts.method === "DELETE"
    );
    expect(delCalls).toHaveLength(0);
  });
});

// ─── 6. Bug Cases ───────────────────────────────────────────
describe("ProductSetting > Bug Cases", () => {
  // BUG-1: template มี condition ซ้ำ: product.image_path || product.image_path
  // ทั้ง v-if และ :src ใช้ product.image_path || product.image_path (ซ้ำกัน)
  // ควรเป็น product.image_url || product.image_path
  it("[BUG-1] product มี image_url แต่ไม่มี image_path → ต้องแสดงรูป", async () => {
    const productsWithUrl = [
      { id: 3, name: "URL Product", image_url: "http://img/url.png", image_path: null, cycle_time: 5 },
    ];
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/products/plc-addresses")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: false }) });
      }
      if (url.includes("/api/products")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: productsWithUrl }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = mount(ProductSetting, {
      global: { provide: { locale: mockLocale } },
    });

    await vi.waitFor(() => expect(wrapper.vm.products.length).toBe(1));

    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
  });
});
