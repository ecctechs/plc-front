import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ProductForm from "../../../components/setting/ProductForm.vue";

// ─── Mock swalHelper ────────────────────────────────────────
vi.mock("../../../utils/swalHelper", () => ({
  showAlert: vi.fn(),
}));
import { showAlert } from "../../../utils/swalHelper";

// ─── Mock fetch & localStorage ──────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("localStorage", {
  getItem: () => "fake-token",
  setItem: () => {},
});

// ─── Mock locale ────────────────────────────────────────────
const mockLocale = {
  current: "en",
  t: (key) => key,
  toggle: vi.fn(),
};

const mockProduct = {
  id: 1,
  name: "Widget A",
  cycle_time: 10,
  target_oee: 85,
  target_output: 500,
  image_url: "http://example.com/img.png",
};

function mountForm(props = {}) {
  return mount(ProductForm, {
    global: {
      provide: { locale: mockLocale },
    },
    props,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("ProductForm > Render", () => {
  it("render สำเร็จ (modal ซ่อน)", () => {
    const wrapper = mountForm();
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("open() → แสดง modal Add", () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(false);
    expect(wrapper.vm.form.name).toBe("");
  });

  it("open(product) → แสดง modal Edit", () => {
    const wrapper = mountForm();
    wrapper.vm.open(mockProduct);
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.name).toBe("Widget A");
    expect(wrapper.vm.editingId).toBe(1);
  });
});

// ─── 2. Form Fields ────────────────────────────────────────
describe("ProductForm > Form", () => {
  it("แสดง field ครบ: name, cycle_time, target_oee, target_output", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Model Name");
    expect(wrapper.text()).toContain("Cycle Time");
    expect(wrapper.text()).toContain("Target OEE");
    expect(wrapper.text()).toContain("Target Output");
  });

  it("แสดง image upload input", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
  });

  it("open(product) → imagePreview ถูกตั้งค่า", () => {
    const wrapper = mountForm();
    wrapper.vm.open(mockProduct);
    expect(wrapper.vm.imagePreview).toBe("http://example.com/img.png");
  });
});

// ─── 3. Close ───────────────────────────────────────────────
describe("ProductForm > Close", () => {
  it("closeModal → ปิด modal", () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    expect(wrapper.vm.showModal).toBe(true);

    wrapper.vm.closeModal();
    expect(wrapper.vm.showModal).toBe(false);
  });
});

// ─── 4. Save ────────────────────────────────────────────────
describe("ProductForm > Save", () => {
  it("ชื่อว่าง → แสดง warning ไม่ส่ง API", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "";

    await wrapper.vm.save();

    expect(showAlert).toHaveBeenCalledWith("Error", "Model Name is required", "warning");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("save สำเร็จ (Add) → fetch POST + showAlert success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 2 } }),
    });

    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "New Product";

    await wrapper.vm.save();

    expect(mockFetch).toHaveBeenCalled();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/products");
    expect(opts.method).toBe("POST");
    expect(showAlert).toHaveBeenCalledWith("Success", "Product saved successfully", "success");
  });

  it("save สำเร็จ (Edit) → fetch PUT", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });

    const wrapper = mountForm();
    wrapper.vm.open(mockProduct);
    wrapper.vm.form.name = "Updated Product";

    await wrapper.vm.save();

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/products/1");
    expect(opts.method).toBe("PUT");
  });

  it("save ล้มเหลว → showAlert error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Duplicate name" }),
    });

    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Dup";

    await wrapper.vm.save();

    expect(showAlert).toHaveBeenCalledWith("Error", "Duplicate name", "error");
  });

  it("save ใช้ FormData (ไม่ใช่ JSON)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });

    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";

    await wrapper.vm.save();

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.body).toBeInstanceOf(FormData);
  });

  it("save เรียก reloadProducts callback ถ้ามี", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 4 } }),
    });

    const reload = vi.fn();
    const wrapper = mountForm({ reloadProducts: reload });
    wrapper.vm.open();
    wrapper.vm.form.name = "Callback Test";

    await wrapper.vm.save();

    expect(reload).toHaveBeenCalled();
  });

  it("save สำเร็จ → loading กลับเป็น false", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 5 } }),
    });

    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Loading Test";

    await wrapper.vm.save();

    expect(wrapper.vm.loading).toBe(false);
  });
});

// ─── 5. Bug Cases ───────────────────────────────────────────
describe("ProductForm > Bug Cases", () => {
  // BUG-1: ชื่อเป็น space ล้วน "   " → ผ่าน validation (!this.form.name = false)
  // ควร trim ก่อนเช็ค
  it("[BUG-1] ชื่อ product เป็น space ล้วน → ต้องแสดง warning", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "   ";

    await wrapper.vm.save();

    expect(showAlert).toHaveBeenCalledWith("Error", "Model Name is required", "warning");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // BUG-2: cycle_time ค่าติดลบ → ส่ง API ได้ (ไม่มี validation)
  // ควร validate cycle_time >= 0
  it("[BUG-2] cycle_time ติดลบ → ต้อง validate ก่อนส่ง", async () => {
    const wrapper = mountForm();
    wrapper.vm.open();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.cycle_time = -5;

    await wrapper.vm.save();

    expect(showAlert).toHaveBeenCalledWith("Error", "Cycle Time must not be negative", "warning");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
