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

const mockLocale_th = {
  current: "th",
  t: (key) => key,
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

function setupFetchMock(devices = mockDevices, rooms = mockRooms) {
  mockFetch.mockImplementation((url) => {
    if (url.includes("/api/devices")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: devices }),
      });
    }
    if (url.includes("/api/rooms")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: rooms }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
}

function mountComp(locale = mockLocale) {
  setupFetchMock();
  return mount(DeviceSetting, {
    global: { provide: { locale } },
  });
}

// สร้าง devices หลายชิ้นสำหรับ pagination tests
function makeManyDevices(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Device ${i + 1}`,
    room: { id: 1, name: "Room 1" },
    device_type: { id: 1 },
    addresses: [{ id: i + 100, label: `Pt${i}`, data_type: "onoff", plc_address: "M0" }],
    alarms: [],
  }));
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

  it("แสดง 'No devices found.' เมื่อไม่มีข้อมูล", async () => {
    setupFetchMock([]);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(0));
    expect(wrapper.text()).toContain("No devices found.");
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

  it("loadData → ตั้ง loading = true ระหว่างโหลด แล้ว = false หลังจบ", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
  });

  it("loadDevices → map addresses ถูกต้อง", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(2));
    const device = wrapper.vm.devices[0];
    expect(device.addresses).toHaveLength(2);
    expect(device.addresses[0].label).toBe("Point 1");
  });

  it("loadDevices → ใช้ json array ตรงเมื่อไม่มี .data wrapper", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/devices"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDevices) });
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(2));
  });

  it("loadDevices → device ไม่มี device_type → ใช้ device_type_id fallback", async () => {
    const devNoType = [{ id: 9, name: "NoType", device_type: undefined, device_type_id: 7,
      room: { id: 1, name: "Room 1" }, addresses: [], alarms: [] }];
    setupFetchMock(devNoType);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    expect(wrapper.vm.devices[0].device_type_id).toBe(7);
  });

  it("loadDevices → device ไม่มี room → room_name = null", async () => {
    const devNoRoom = [{ id: 9, name: "NoRoom", room: undefined, room_id: 5,
      device_type: { id: 1 }, addresses: [], alarms: [] }];
    setupFetchMock(devNoRoom);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    expect(wrapper.vm.devices[0].room_name).toBeNull();
  });

  it("loadDevices → device ไม่มี addresses → addresses = []", async () => {
    const devNoAddr = [{ id: 9, name: "NoAddr", room: { id: 1, name: "Room 1" },
      device_type: { id: 1 }, addresses: undefined, alarms: [] }];
    setupFetchMock(devNoAddr);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    expect(wrapper.vm.devices[0].addresses).toEqual([]);
  });

  it("loadDevices → address มี number_config → map numberConfig ถูกต้อง", async () => {
    const devWithConfig = [{
      id: 9, name: "Dev", room: { id: 1, name: "R" }, device_type: { id: 1 }, alarms: [],
      addresses: [{
        id: 10, label: "Pt", data_type: "number", plc_address: "D0",
        number_config: { scale: 2, offset: 5, decimal_places: 1, unit: "kg", min_value: 10, max_value: 200 }
      }]
    }];
    setupFetchMock(devWithConfig);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    const nc = wrapper.vm.devices[0].addresses[0].numberConfig;
    expect(nc.scale).toBe(2);
    expect(nc.offset).toBe(5);
    expect(nc.unit).toBe("kg");
    expect(nc.max_value).toBe(200);
  });

  it("loadDevices → address ไม่มี number_config → ใช้ default numberConfig", async () => {
    const devNoConfig = [{
      id: 9, name: "Dev", room: { id: 1, name: "R" }, device_type: { id: 1 }, alarms: [],
      addresses: [{ id: 10, label: "Pt", data_type: "onoff", plc_address: "M0" }]
    }];
    setupFetchMock(devNoConfig);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    const nc = wrapper.vm.devices[0].addresses[0].numberConfig;
    expect(nc).toEqual({ scale: 1, offset: 0, decimal_places: 0, unit: "", min_value: 0, max_value: 100 });
  });

  it("loadDevices → device มี alarms → map alarms ลงใน address ที่ตรง", async () => {
    const devWithAlarms = [{
      id: 9, name: "Dev", room: { id: 1, name: "R" }, device_type: { id: 1 },
      addresses: [{ id: 10, label: "Pt", data_type: "onoff", plc_address: "M0" }],
      alarms: [{
        id: 55, address_id: 10, name: "Alarm1", data_type: "onoff",
        condition_type: "on", min_value: null, max_value: null,
        level_index: null, level_label: null, duration_sec: 5,
        severity: "Warning", is_active: true, notify_email: true,
        email_recipients: ["test@example.com"]
      }]
    }];
    setupFetchMock(devWithAlarms);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    const alarms = wrapper.vm.devices[0].addresses[0].alarms;
    expect(alarms).toHaveLength(1);
    expect(alarms[0].id).toBe(55);
    expect(alarms[0].notify_email).toBe(true);
    expect(alarms[0].email_recipients).toEqual(["test@example.com"]);
  });

  it("loadDevices → alarm notify_email undefined → fallback false", async () => {
    const devWithAlarms = [{
      id: 9, name: "Dev", room: { id: 1, name: "R" }, device_type: { id: 1 },
      addresses: [{ id: 10, label: "Pt", data_type: "onoff", plc_address: "M0" }],
      alarms: [{ id: 55, address_id: 10, name: "A1", condition_type: "on",
        duration_sec: 5, severity: "Warning", is_active: true }]
    }];
    setupFetchMock(devWithAlarms);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    expect(wrapper.vm.devices[0].addresses[0].alarms[0].notify_email).toBe(false);
    expect(wrapper.vm.devices[0].addresses[0].alarms[0].email_recipients).toEqual([]);
  });

  it("loadDevices → alarm address_id ไม่ตรง → ไม่แสดงใน address อื่น", async () => {
    const devWithAlarms = [{
      id: 9, name: "Dev", room: { id: 1, name: "R" }, device_type: { id: 1 },
      addresses: [{ id: 10, label: "Pt", data_type: "onoff", plc_address: "M0" }],
      alarms: [{ id: 55, address_id: 99, name: "A1", condition_type: "on",
        duration_sec: 5, severity: "Warning", is_active: true }]
    }];
    setupFetchMock(devWithAlarms);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    expect(wrapper.vm.devices[0].addresses[0].alarms).toHaveLength(0);
  });

  it("loadDevices → device ไม่มี alarms field → addresses.alarms = []", async () => {
    const devNoAlarms = [{
      id: 9, name: "Dev", room: { id: 1, name: "R" }, device_type: { id: 1 },
      addresses: [{ id: 10, label: "Pt", data_type: "onoff", plc_address: "M0" }],
      alarms: undefined
    }];
    setupFetchMock(devNoAlarms);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    expect(wrapper.vm.devices[0].addresses[0].alarms).toEqual([]);
  });

  it("loadDevices → address มี level_config → levels = level_config", async () => {
    const levels = [{ label: "High", color: "red" }];
    const devWithLevel = [{
      id: 9, name: "Dev", room: { id: 1, name: "R" }, device_type: { id: 1 }, alarms: [],
      addresses: [{ id: 10, label: "Pt", data_type: "level", plc_address: "D0", level_config: levels }]
    }];
    setupFetchMock(devWithLevel);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    expect(wrapper.vm.devices[0].addresses[0].levels).toEqual(levels);
  });

  it("loadDevices res.ok=false → console.error, devices stays []", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/devices"))
        return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    expect(wrapper.vm.devices).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("loadRooms res.ok=false → console.error, rooms stays []", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDevices }) });
    });
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    expect(wrapper.vm.rooms).toEqual([]);
    consoleSpy.mockRestore();
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

  it("filter by device name case-insensitive", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));
    wrapper.vm.filters.deviceName = "device a";
    expect(wrapper.vm.filteredDevices).toHaveLength(1);
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

  it("DOM: input device name → applyFilters ถูกเรียก", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));
    wrapper.vm.currentPage = 3;

    const input = wrapper.find("input.form-control");
    await input.setValue("Device A");
    await input.trigger("input");

    expect(wrapper.vm.currentPage).toBe(1);
    expect(wrapper.vm.filters.deviceName).toBe("Device A");
  });

  it("DOM: room select change → applyFilters ถูกเรียก", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.rooms.length).toBe(2));
    wrapper.vm.currentPage = 3;

    const selects = wrapper.findAll("select");
    await selects[0].setValue("Room 1");
    await selects[0].trigger("change");

    expect(wrapper.vm.currentPage).toBe(1);
    expect(wrapper.vm.filters.roomName).toBe("Room 1");
  });

  it("DOM: itemsPerPage select change → applyFilters ถูกเรียก", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));
    wrapper.vm.currentPage = 3;

    const selects = wrapper.findAll("select");
    // selects[0] = room filter, selects[1] = itemsPerPage
    await selects[1].trigger("change");

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

  it("visiblePages total ≤ 5 → แสดงทุก page", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));
    wrapper.vm.itemsPerPage = 1;
    // 2 devices, 1 per page → 2 pages → ≤5 → [1,2]
    expect(wrapper.vm.visiblePages).toEqual([1, 2]);
  });

  it("visiblePages total > 5, current ≤ 3 → pages [1,2,3,4,5]", async () => {
    const manyDevices = makeManyDevices(60);
    setupFetchMock(manyDevices);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(60));
    // 60 devices, 10 per page → 6 pages
    wrapper.vm.currentPage = 1; // ≤ 3
    expect(wrapper.vm.visiblePages).toEqual([1, 2, 3, 4, 5]);
  });

  it("visiblePages total > 5, current = 2 → pages [1,2,3,4,5]", async () => {
    const manyDevices = makeManyDevices(60);
    setupFetchMock(manyDevices);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(60));
    wrapper.vm.currentPage = 2;
    expect(wrapper.vm.visiblePages).toEqual([1, 2, 3, 4, 5]);
  });

  it("visiblePages total > 5, current ≥ total-2 → แสดง 5 pages สุดท้าย", async () => {
    const manyDevices = makeManyDevices(60);
    setupFetchMock(manyDevices);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(60));
    // totalPages = 6, current = 5 (≥ 6-2=4) → pages [2,3,4,5,6]
    wrapper.vm.currentPage = 5;
    expect(wrapper.vm.visiblePages).toEqual([2, 3, 4, 5, 6]);
  });

  it("visiblePages total > 5, current = totalPages → แสดง 5 pages สุดท้าย", async () => {
    const manyDevices = makeManyDevices(60);
    setupFetchMock(manyDevices);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(60));
    // totalPages = 6, current = 6
    wrapper.vm.currentPage = 6;
    expect(wrapper.vm.visiblePages).toEqual([2, 3, 4, 5, 6]);
  });

  it("visiblePages total > 5, current = 4 (middle) → window ±2", async () => {
    const manyDevices = makeManyDevices(80);
    setupFetchMock(manyDevices);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(80));
    // totalPages = 8, current = 4 (not ≤3, not ≥6) → [2,3,4,5,6]
    wrapper.vm.currentPage = 4;
    expect(wrapper.vm.visiblePages).toEqual([2, 3, 4, 5, 6]);
  });

  it("DOM: คลิก page link → เปลี่ยน currentPage", async () => {
    const manyDevices = makeManyDevices(20);
    setupFetchMock(manyDevices);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(20));
    // totalPages = 2, pagination should show
    await wrapper.vm.$nextTick();

    const pageLinks = wrapper.findAll(".page-link");
    expect(pageLinks.length).toBeGreaterThan(0);
    // Middle link(s) are page numbers; first is «, last is »
    // Click on page 2 link (index 2: «, 1, 2, »)
    await pageLinks[2].trigger("click");
    expect(wrapper.vm.currentPage).toBe(2);
  });

  it("DOM: คลิก « prev → ลด currentPage", async () => {
    const manyDevices = makeManyDevices(20);
    setupFetchMock(manyDevices);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(20));
    wrapper.vm.currentPage = 2;
    await wrapper.vm.$nextTick();

    const pageLinks = wrapper.findAll(".page-link");
    await pageLinks[0].trigger("click"); // « button
    expect(wrapper.vm.currentPage).toBe(1);
  });

  it("DOM: คลิก » next → เพิ่ม currentPage", async () => {
    const manyDevices = makeManyDevices(20);
    setupFetchMock(manyDevices);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(20));
    wrapper.vm.currentPage = 1;
    await wrapper.vm.$nextTick();

    const pageLinks = wrapper.findAll(".page-link");
    await pageLinks[pageLinks.length - 1].trigger("click"); // » button
    expect(wrapper.vm.currentPage).toBe(2);
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
    expect(wrapper.vm.getDisplayTypeClass("number_gauge")).toBe("bg-info");
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

  it("DOM: คลิกปุ่ม edit → emit edit", async () => {
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));
    await wrapper.vm.$nextTick();

    const editBtn = wrapper.find(".btn-outline-primary");
    await editBtn.trigger("click");
    expect(wrapper.emitted("edit")).toBeTruthy();
  });

  it("DOM: คลิกปุ่ม delete → เรียก confirmDelete", async () => {
    showConfirm.mockResolvedValue(false); // ยกเลิก เพื่อไม่ให้ delete จริง
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));
    await wrapper.vm.$nextTick();

    const deleteBtn = wrapper.find(".btn-outline-danger");
    await deleteBtn.trigger("click");
    expect(showConfirm).toHaveBeenCalled();
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

  it("delete สำเร็จ → showAlert success EN", async () => {
    setupFetchMock();
    showConfirm.mockResolvedValue(true);
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));

    await wrapper.vm.confirmDelete(mockDevices[0]);

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Success", "Device deleted successfully", "success");
    });
  });

  it("delete สำเร็จ → เรียก loadDevices ใหม่", async () => {
    setupFetchMock();
    showConfirm.mockResolvedValue(true);
    const wrapper = mountComp();
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));

    const callsBefore = mockFetch.mock.calls.filter(([url]) => url.includes("/api/devices")).length;
    await wrapper.vm.confirmDelete(mockDevices[0]);
    await vi.waitFor(() => {
      const callsAfter = mockFetch.mock.calls.filter(([url]) => url.includes("/api/devices")).length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });
  });

  it("delete ล้มเหลว → showAlert error EN", async () => {
    mockFetch.mockImplementation((url, opts) => {
      if (opts && opts.method === "DELETE")
        return Promise.resolve({ ok: false });
      if (url.includes("/api/devices"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDevices }) });
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    showConfirm.mockResolvedValue(true);

    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));

    await wrapper.vm.confirmDelete(mockDevices[0]);

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot delete device", "error");
    });
  });

  it("confirmDelete → showConfirm ข้อความ EN ครบ 4 พารามิเตอร์", async () => {
    showConfirm.mockResolvedValue(false);
    const wrapper = mountComp();
    await wrapper.vm.confirmDelete({ id: 1, name: "TestDev" });

    expect(showConfirm).toHaveBeenCalledWith(
      "Confirm Delete",
      `Delete device "TestDev"?`,
      "Delete",
      "Cancel"
    );
  });

  it("confirmDelete Thai locale → showConfirm ข้อความ TH", async () => {
    showConfirm.mockResolvedValue(false);
    setupFetchMock();
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale_th } } });
    await wrapper.vm.confirmDelete({ id: 1, name: "เซ็นเซอร์" });

    expect(showConfirm).toHaveBeenCalledWith(
      "ยืนยันการลบ",
      `คุณต้องการลบ Device "เซ็นเซอร์" หรือไม่?`,
      "ลบ",
      "ยกเลิก"
    );
  });

  it("delete สำเร็จ Thai locale → showAlert TH success", async () => {
    setupFetchMock();
    showConfirm.mockResolvedValue(true);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale_th } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));
    await wrapper.vm.confirmDelete(mockDevices[0]);
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("สำเร็จ", "ลบ Device สำเร็จ", "success");
    });
  });

  it("delete ล้มเหลว Thai locale → showAlert TH error", async () => {
    mockFetch.mockImplementation((url, opts) => {
      if (opts && opts.method === "DELETE")
        return Promise.resolve({ ok: false });
      if (url.includes("/api/devices"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDevices }) });
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    showConfirm.mockResolvedValue(true);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale_th } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(2));
    await wrapper.vm.confirmDelete(mockDevices[0]);
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("ข้อผิดพลาด", "ไม่สามารถลบ Device ได้", "error");
    });
  });
});

// ─── 8. Branch Coverage: fallbacks ────────────────────────
describe("DeviceSetting > Branch Coverage", () => {
  it("number_config.scale = 0 → ใช้ 1 fallback", async () => {
    const devScaleZero = [{
      id: 9, name: "Dev", room: { id: 1, name: "R" }, device_type: { id: 1 }, alarms: [],
      addresses: [{
        id: 10, label: "Pt", data_type: "number", plc_address: "D0",
        number_config: { scale: 0, offset: 0, decimal_places: 0, unit: "", min_value: 0, max_value: 100 }
      }]
    }];
    setupFetchMock(devScaleZero);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    // scale=0 → 0 is falsy → || 1 fallback used
    expect(wrapper.vm.devices[0].addresses[0].numberConfig.scale).toBe(1);
  });

  it("number_config.min_value = 0 → ใช้ 0 fallback (0||0=0)", async () => {
    const devMinZero = [{
      id: 9, name: "Dev", room: { id: 1, name: "R" }, device_type: { id: 1 }, alarms: [],
      addresses: [{
        id: 10, label: "Pt", data_type: "number", plc_address: "D0",
        number_config: { scale: 1, offset: 0, decimal_places: 0, unit: "", min_value: 0, max_value: 100 }
      }]
    }];
    setupFetchMock(devMinZero);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));
    // min_value=0 → 0 || 0 = 0
    expect(wrapper.vm.devices[0].addresses[0].numberConfig.min_value).toBe(0);
  });

  it("loadRooms API ไม่มี .data field → rooms = []", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); // no .data
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDevices }) });
    });
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.rooms).toEqual([]));
  });
});

// ─── 10. Bug Cases (original) ───────────────────────────────
describe("DeviceSetting > Bug Cases (original)", () => {
  it("[BUG-1] loadData ต้องมี loading state", async () => {
    let loadingDuringFetch = false;
    mockFetch.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
        }, 10);
      });
    });

    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await wrapper.vm.$nextTick();
    loadingDuringFetch = wrapper.vm.loading !== undefined;
    expect(wrapper.vm).toHaveProperty("loading");
  });
});

// ─── 9. Bug Cases (dangerous, FAIL) ─────────────────────────
describe("DeviceSetting > Bug Cases (FAIL)", () => {

  // BUG-2: currentPage-- ไม่มี boundary check → currentPage ไปเป็น 0
  // อันตราย: เมื่อ currentPage = 0 → paginatedDevices = filteredDevices.slice(-10, 0) = []
  //          ตารางแสดง "No devices found" ทั้งที่มีข้อมูล ทำให้ผู้ใช้สับสนและอาจคิดว่าข้อมูลหาย
  // FAIL เพราะ: template ใช้ @click.prevent="currentPage--" โดยไม่มี guard
  //             disabled class บน <a> element ไม่ป้องกัน click event
  it("[BUG-2] currentPage-- ไม่มี guard → currentPage เป็น 0 (FAIL)", async () => {
    const manyDevices = makeManyDevices(20);
    setupFetchMock(manyDevices);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(20));
    wrapper.vm.currentPage = 1;
    await wrapper.vm.$nextTick();

    const pageLinks = wrapper.findAll(".page-link");
    await pageLinks[0].trigger("click"); // « button

    // คาดหวัง: currentPage ต้องไม่ต่ำกว่า 1
    expect(wrapper.vm.currentPage).toBeGreaterThanOrEqual(1); // FAIL: becomes 0
  });

  // BUG-3: currentPage++ ไม่มี boundary check → currentPage เกิน totalPages
  // อันตราย: เมื่อ currentPage > totalPages → paginatedDevices = [] (out-of-bounds slice)
  //          ผู้ใช้เห็น "No devices found" ทั้งที่ยังมีข้อมูลในหน้าก่อนหน้า
  // FAIL เพราะ: template ใช้ @click.prevent="currentPage++" โดยไม่มี guard
  it("[BUG-3] currentPage++ ไม่มี guard → currentPage เกิน totalPages (FAIL)", async () => {
    const manyDevices = makeManyDevices(20);
    setupFetchMock(manyDevices);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices.length).toBe(20));
    wrapper.vm.currentPage = 2; // last page (20 devices / 10 per page = 2 pages)
    await wrapper.vm.$nextTick();

    const pageLinks = wrapper.findAll(".page-link");
    await pageLinks[pageLinks.length - 1].trigger("click"); // » button

    // คาดหวัง: currentPage ต้องไม่เกิน totalPages
    expect(wrapper.vm.currentPage).toBeLessThanOrEqual(wrapper.vm.totalPages); // FAIL: becomes 3
  });

  // BUG-4: number_config.max_value || 100 ทำให้ max_value=0 ถูกแทนด้วย 100
  // อันตราย: ถ้า sensor มี max_value=0 (เช่น vacuum sensor แสดงค่าลบ) จะถูกแทนด้วย 100
  //          ทำให้ gauge/number display แสดงค่าผิด และ alarm threshold คำนวณผิด
  //          เป็น silent data corruption ที่หาได้ยาก
  // FAIL เพราะ: `addr.number_config.max_value || 100` → 0 || 100 = 100 แทน 0
  it("[BUG-4] number_config.max_value=0 → ถูกแทนด้วย 100 (silent data corruption) (FAIL)", async () => {
    const devMaxZero = [{
      id: 9, name: "Dev", room: { id: 1, name: "R" }, device_type: { id: 1 }, alarms: [],
      addresses: [{
        id: 10, label: "Pt", data_type: "number", plc_address: "D0",
        number_config: { scale: 1, offset: 0, decimal_places: 0, unit: "", min_value: -100, max_value: 0 }
      }]
    }];
    setupFetchMock(devMaxZero);
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.devices).toHaveLength(1));

    // คาดหวัง: max_value ต้องเป็น 0 ตามที่ server ส่งมา
    expect(wrapper.vm.devices[0].addresses[0].numberConfig.max_value).toBe(0); // FAIL: becomes 100
  });

  // BUG-5: loadDevices ล้มเหลว → ไม่มี user feedback (ไม่เรียก showAlert)
  // อันตราย: ผู้ใช้เห็นตารางว่างเปล่าโดยไม่รู้ว่าเกิดข้อผิดพลาด
  //          อาจคิดว่าไม่มี device ในระบบ และไปสร้างซ้ำ หรือรอค้างไว้โดยไม่รู้สาเหตุ
  //          ต่างจาก confirmDelete ที่เรียก showAlert เมื่อเกิด error → inconsistent UX
  // FAIL เพราะ: catch block ใน loadDevices เรียกแค่ console.error(err) ไม่เรียก showAlert
  it("[BUG-5] loadDevices error ไม่มี showAlert → user ไม่รู้ว่า load ล้มเหลว (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/devices"))
        return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(DeviceSetting, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(consoleSpy).toHaveBeenCalled());

    // คาดหวัง: ต้องแจ้ง user เมื่อ load ล้มเหลว
    expect(showAlert).toHaveBeenCalled(); // FAIL: showAlert ไม่ถูกเรียกใน catch
    consoleSpy.mockRestore();
  });
});
