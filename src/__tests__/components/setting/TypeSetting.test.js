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

const mockLocale = {
  current: "en",
  t: (key) => key,
  toggle: vi.fn(),
};

const mockTypes = [
  { id: 1, name: "PLC", description: "PLC device", display_types: ["onoff", "number"] },
  { id: 2, name: "Sensor", description: "", display_types: ["number", "level"] },
];

function mountComp() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: mockTypes }),
  });
  return mount(TypeSetting, {
    global: { provide: { locale: mockLocale } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
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
});

// ─── 2. Load Data ───────────────────────────────────────────
describe("TypeSetting > Load", () => {
  it("mounted → เรียก fetch /api/device-types", async () => {
    mountComp();
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/device-types");
  });

  it("โหลดสำเร็จ → แสดง types ในตาราง", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => {
      expect(wrapper.vm.deviceTypes).toHaveLength(2);
    });
    expect(wrapper.text()).toContain("PLC");
    expect(wrapper.text()).toContain("Sensor");
  });

  it("โหลดล้มเหลว → showAlert error", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    mount(TypeSetting, {
      global: { provide: { locale: mockLocale } },
    });
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot load device types", "error");
    });
  });
});

// ─── 3. Display Types Checkmarks ────────────────────────────
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

// ─── 4. Modal ───────────────────────────────────────────────
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

  it("closeModal → ปิด modal", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.closeModal();
    expect(wrapper.vm.showModal).toBe(false);
  });
});

// ─── 5. Save ────────────────────────────────────────────────
describe("TypeSetting > Save", () => {
  it("ชื่อว่าง → warning", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Name is required", "warning");
  });

  it("display_types ว่าง → warning", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.display_types = [];
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Please select at least one Display Type", "warning");
  });

  it("save สำเร็จ → showAlert success + ปิด modal", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
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

  it("save ล้มเหลว → showAlert error", async () => {
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
  });
});

// ─── 6. Delete ──────────────────────────────────────────────
describe("TypeSetting > Delete", () => {
  it("confirmDelete confirm → fetch DELETE + showAlert success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockTypes }),
    });
    showConfirm.mockResolvedValue(true);

    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockTypes[0]);

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
    await wrapper.vm.confirmDelete(mockTypes[0]);

    const delCalls = mockFetch.mock.calls.filter(
      ([, opts]) => opts && opts.method === "DELETE"
    );
    expect(delCalls).toHaveLength(0);
  });
});

// ─── 7. Bug Cases ───────────────────────────────────────────
describe("TypeSetting > Bug Cases", () => {
  // BUG-1: openModal() ไม่ reset loading
  it("[BUG-1] เปิด modal ขณะ loading ค้าง → ปุ่ม Save ต้องใช้ได้", () => {
    const wrapper = mountComp();
    wrapper.vm.loading = true;
    wrapper.vm.openModal(mockTypes[0]);
    expect(wrapper.vm.loading).toBe(false);
  });

  // BUG-2: ชื่อ space ล้วน → ผ่าน validation
  it("[BUG-2] ชื่อ type เป็น space ล้วน → ต้องแสดง warning", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "   ";
    wrapper.vm.form.display_types = ["onoff"];
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Name is required", "warning");
  });
});
