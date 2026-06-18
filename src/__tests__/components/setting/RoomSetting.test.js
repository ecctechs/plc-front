import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import RoomSetting from "../../../components/setting/RoomSetting.vue";

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

// ─── Mock locale ────────────────────────────────────────────
const mockLocale = {
  current: "en",
  t: (key) => key,
  toggle: vi.fn(),
};

const mockRooms = [
  { id: 1, name: "Room A" },
  { id: 2, name: "Room B" },
];

function mountComp() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: mockRooms }),
  });
  return mount(RoomSetting, {
    global: { provide: { locale: mockLocale } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("RoomSetting > Render", () => {
  it("render สำเร็จ", () => {
    const wrapper = mountComp();
    expect(wrapper.find(".card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Room Setting");
  });

  it("แสดงปุ่ม Add Room", () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain("Add Room");
  });

  it("modal ซ่อนตอน render", () => {
    const wrapper = mountComp();
    expect(wrapper.vm.showModal).toBe(false);
  });
});

// ─── 2. Load Data ───────────────────────────────────────────
describe("RoomSetting > Load", () => {
  it("mounted → เรียก fetch /api/rooms", async () => {
    mountComp();
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/rooms");
  });

  it("โหลดสำเร็จ → แสดง rooms ในตาราง", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => {
      expect(wrapper.vm.rooms).toHaveLength(2);
    });
    expect(wrapper.text()).toContain("Room A");
    expect(wrapper.text()).toContain("Room B");
  });

  it("โหลดล้มเหลว → showAlert error", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    mount(RoomSetting, {
      global: { provide: { locale: mockLocale } },
    });
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot load rooms", "error");
    });
  });
});

// ─── 3. Modal (Open / Close) ────────────────────────────────
describe("RoomSetting > Modal", () => {
  it("openModal() → เปิด modal Add (form ว่าง)", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(false);
    expect(wrapper.vm.form.name).toBe("");
  });

  it("openModal(room) → เปิด modal Edit (form มีข้อมูล)", () => {
    const wrapper = mountComp();
    wrapper.vm.openModal(mockRooms[0]);
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.name).toBe("Room A");
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
describe("RoomSetting > Save", () => {
  it("ชื่อว่าง → warning ไม่ส่ง API", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Room name is required", "warning");
  });

  it("save สำเร็จ (Add) → fetch POST + showAlert success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Room C";
    await wrapper.vm.save();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Success", "Room saved successfully", "success");
    });
    const postCall = mockFetch.mock.calls.find(
      ([, opts]) => opts && opts.method === "POST"
    );
    expect(postCall).toBeTruthy();
  });

  it("save สำเร็จ (Edit) → fetch PUT", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 1 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal(mockRooms[0]);
    wrapper.vm.form.name = "Room A Updated";
    await wrapper.vm.save();

    const putCall = mockFetch.mock.calls.find(
      ([url, opts]) => opts && opts.method === "PUT" && url.includes("/api/rooms/1")
    );
    expect(putCall).toBeTruthy();
  });

  it("save ล้มเหลว → showAlert error", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Dup";

    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Duplicate" }),
    });
    await wrapper.vm.save();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Duplicate", "error");
    });
  });

  it("save → emit room-updated", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "New";
    await wrapper.vm.save();

    expect(wrapper.emitted("room-updated")).toBeTruthy();
  });

  it("save → loading กลับ false", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "Test";
    await wrapper.vm.save();
    expect(wrapper.vm.loading).toBe(false);
  });
});

// ─── 5. Delete ──────────────────────────────────────────────
describe("RoomSetting > Delete", () => {
  it("confirmDelete → showConfirm + fetch DELETE", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockRooms }),
    });
    showConfirm.mockResolvedValue(true);

    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockRooms[0]);

    expect(showConfirm).toHaveBeenCalled();
    await vi.waitFor(() => {
      const delCalls = mockFetch.mock.calls.filter(
        ([, opts]) => opts && opts.method === "DELETE"
      );
      expect(delCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("confirmDelete ยกเลิก → ไม่เรียก DELETE", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockRooms[0]);

    const delCalls = mockFetch.mock.calls.filter(
      ([, opts]) => opts && opts.method === "DELETE"
    );
    expect(delCalls).toHaveLength(0);
  });

  it("delete สำเร็จ → emit room-updated", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockRooms }),
    });
    showConfirm.mockResolvedValue(true);

    const wrapper = mountComp();
    await wrapper.vm.confirmDelete(mockRooms[0]);

    expect(wrapper.emitted("room-updated")).toBeTruthy();
  });
});

// ─── 6. Bug Cases ───────────────────────────────────────────
describe("RoomSetting > Bug Cases", () => {
  // BUG-1: openModal() ไม่ reset loading
  // ถ้า save กำลัง loading=true แล้วกด edit room อื่น
  // loading ค้าง → ปุ่ม Save disabled
  it("[BUG-1] เปิด modal ขณะ loading ค้าง → ปุ่ม Save ต้องใช้ได้", () => {
    const wrapper = mountComp();
    wrapper.vm.loading = true;
    wrapper.vm.openModal(mockRooms[0]);
    expect(wrapper.vm.loading).toBe(false);
  });

  // BUG-2: ชื่อ room เป็น space ล้วน "   " → ผ่าน validation
  // !this.form.name → "   " is truthy → ผ่าน
  it("[BUG-2] ชื่อ room เป็น space ล้วน → ต้องแสดง warning", async () => {
    const wrapper = mountComp();
    wrapper.vm.openModal();
    wrapper.vm.form.name = "   ";
    await wrapper.vm.save();
    expect(showAlert).toHaveBeenCalledWith("Error", "Room name is required", "warning");
  });
});
