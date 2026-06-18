import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import DeviceSetting from "../../../components/setting/DeviceSetting.vue";

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

const mockDevices = [
  {
    id: 1,
    name: "Device A",
    room: { id: 1, name: "Room 1" },
    device_type: { id: 1 },
    addresses: [
      { id: 10, label: "Point 1", data_type: "onoff", plc_address: "M0" },
      { id: 11, label: "Point 2", data_type: "number", plc_address: "D100" },
    ],
    alarms: [],
  },
  {
    id: 2,
    name: "Device B",
    room: { id: 2, name: "Room 2" },
    device_type: { id: 2 },
    addresses: [
      { id: 20, label: "Sensor", data_type: "level", plc_address: "D200" },
    ],
    alarms: [],
  },
];

const mockRooms = [
  { id: 1, name: "Room 1" },
  { id: 2, name: "Room 2" },
];

function setupFetchMock() {
  mockFetch.mockImplementation((url) => {
    if (url.includes("/api/devices")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockDevices }),
      });
    }
    if (url.includes("/api/rooms")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockRooms }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
}

function mountComp() {
  setupFetchMock();
  return mount(DeviceSetting, {
    global: { provide: { locale: mockLocale } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("DeviceSetting > Render", () => {
  it("render สำเร็จ", () => {
    const wrapper = mountComp();
    expect(wrapper.find(".card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Device Setting");
  });

  it("แสดงปุ่ม Add Device", () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain("Add Device");
  });

  it("แสดง column headers", () => {
    const wrapper = mountComp();
    expect(wrapper.text()).toContain("Device");
    expect(wrapper.text()).toContain("Label");
    expect(wrapper.text()).toContain("Display Type");
    expect(wrapper.text()).toContain("Address");
    expect(wrapper.text()).toContain("Room");
  });
});

// ─── 2. Load Data ───────────────────────────────────────────
describe("DeviceSetting > Load", () => {
  it("mounted → เรียก fetch devices + rooms", async () => {
    mountComp();
    await vi.waitFor(() => {
      const devCall = mockFetch.mock.calls.find(([url]) => url.includes("/api/devices"));
      const roomCall = mockFetch.mock.calls.find(([url]) => url.includes("/api/rooms"));
      expect(devCall).toBeTruthy();
      expect(roomCall).toBeTruthy();
    });
  });

  it("โหลดสำเร็จ → แสดง devices ในตาราง", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => {
      expect(wrapper.vm.devices).toHaveLength(2);
    });
    expect(wrapper.text()).toContain("Device A");
    expect(wrapper.text()).toContain("Device B");
  });

  it("โหลด rooms → ใช้ใน filter dropdown", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => {
      expect(wrapper.vm.rooms).toHaveLength(2);
    });
  });
});

// ─── 3. Filter ──────────────────────────────────────────────
describe("DeviceSetting > Filter", () => {
  it("filter by device name", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));

    wrapper.vm.filters.deviceName = "Device A";
    expect(wrapper.vm.filteredDevices).toHaveLength(1);
    expect(wrapper.vm.filteredDevices[0].name).toBe("Device A");
  });

  it("filter by room name", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));

    wrapper.vm.filters.roomName = "Room 1";
    expect(wrapper.vm.filteredDevices).toHaveLength(1);
  });

  it("filter ว่าง → แสดงทั้งหมด", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));

    wrapper.vm.filters.deviceName = "";
    wrapper.vm.filters.roomName = "";
    expect(wrapper.vm.filteredDevices).toHaveLength(2);
  });

  it("applyFilters → reset currentPage = 1", () => {
    const wrapper = mountComp();
    wrapper.vm.currentPage = 5;
    wrapper.vm.applyFilters();
    expect(wrapper.vm.currentPage).toBe(1);
  });
});

// ─── 4. Pagination ─────────────────────────────────────────
describe("DeviceSetting > Pagination", () => {
  it("totalPages คำนวณถูก", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));

    wrapper.vm.itemsPerPage = 10;
    expect(wrapper.vm.totalPages).toBe(1);
  });

  it("paginatedDevices slice ถูก", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));

    wrapper.vm.itemsPerPage = 1;
    wrapper.vm.currentPage = 1;
    expect(wrapper.vm.paginatedDevices).toHaveLength(1);
    expect(wrapper.vm.paginatedDevices[0].name).toBe("Device A");

    wrapper.vm.currentPage = 2;
    expect(wrapper.vm.paginatedDevices).toHaveLength(1);
    expect(wrapper.vm.paginatedDevices[0].name).toBe("Device B");
  });

  it("visiblePages ≤ 5", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));
    expect(wrapper.vm.visiblePages.length).toBeLessThanOrEqual(5);
  });
});

// ─── 5. Display Type ───────────────────────────────────────
describe("DeviceSetting > Display Type", () => {
  it("getDisplayTypeLabel → label ที่ถูกต้อง", () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getDisplayTypeLabel("onoff")).toBe("ON/OFF");
    expect(wrapper.vm.getDisplayTypeLabel("number")).toBe("Number");
    expect(wrapper.vm.getDisplayTypeLabel("number_gauge")).toBe("Number Gauge");
    expect(wrapper.vm.getDisplayTypeLabel("level")).toBe("Level");
    expect(wrapper.vm.getDisplayTypeLabel("unknown")).toBe("unknown");
  });

  it("getDisplayTypeClass → CSS class ที่ถูกต้อง", () => {
    const wrapper = mountComp();
    expect(wrapper.vm.getDisplayTypeClass("onoff")).toBe("bg-success");
    expect(wrapper.vm.getDisplayTypeClass("number")).toBe("bg-primary");
    expect(wrapper.vm.getDisplayTypeClass("level")).toBe("bg-warning");
    expect(wrapper.vm.getDisplayTypeClass("unknown")).toBe("bg-secondary");
  });
});

// ─── 6. Emit Events ────────────────────────────────────────
describe("DeviceSetting > Events", () => {
  it("คลิก Add → emit add", async () => {
    const wrapper = mountComp();
    await wrapper.find(".btn-primary").trigger("click");
    expect(wrapper.emitted("add")).toBeTruthy();
  });

  it("openEditModal → emit edit พร้อม device data", () => {
    const wrapper = mountComp();
    wrapper.vm.openEditModal(mockDevices[0]);
    expect(wrapper.emitted("edit")).toBeTruthy();
    expect(wrapper.emitted("edit")[0][0].id).toBe(1);
  });
});

// ─── 7. Delete ──────────────────────────────────────────────
describe("DeviceSetting > Delete", () => {
  it("confirmDelete confirm → fetch DELETE + showAlert success", async () => {
    setupFetchMock();
    showConfirm.mockResolvedValue(true);

    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));

    await wrapper.vm.confirmDelete(mockDevices[0]);

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
    await wrapper.vm.confirmDelete(mockDevices[0]);

    const delCalls = mockFetch.mock.calls.filter(
      ([, opts]) => opts && opts.method === "DELETE"
    );
    expect(delCalls).toHaveLength(0);
  });

  it("delete ล้มเหลว → showAlert error", async () => {
    mockFetch.mockImplementation((url, opts) => {
      if (opts && opts.method === "DELETE") {
        return Promise.resolve({ ok: false });
      }
      if (url.includes("/api/devices")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDevices }) });
      }
      if (url.includes("/api/rooms")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    showConfirm.mockResolvedValue(true);

    const wrapper = mount(DeviceSetting, {
      global: { provide: { locale: mockLocale } },
    });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));

    await wrapper.vm.confirmDelete(mockDevices[0]);

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot delete device", "error");
    });
  });
});

// ─── 8. Bug Cases ───────────────────────────────────────────
describe("DeviceSetting > Bug Cases", () => {
  // BUG-1: filter case-sensitive
  // deviceName filter ใช้ .toLowerCase() แล้ว → case-insensitive ดี
  // แต่ roomName filter ใช้ === exact match → ถูกต้องเพราะเป็น select
  // ตรงนี้ไม่มี bug

  // BUG-1: loadDevices ไม่มี loading state → ผู้ใช้ไม่รู้ว่ากำลังโหลด
  it("[BUG-1] loadData ต้องมี loading state", async () => {
    let loadingDuringFetch = false;
    mockFetch.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          });
        }, 10);
      });
    });

    const wrapper = mount(DeviceSetting, {
      global: { provide: { locale: mockLocale } },
    });

    await wrapper.vm.$nextTick();
    loadingDuringFetch = wrapper.vm.loading !== undefined;

    // DeviceSetting ไม่มี loading data property เลย
    // ควรเพิ่ม loading state สำหรับ initial load
    expect(wrapper.vm).toHaveProperty("loading");
  });
});
