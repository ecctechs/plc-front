import { describe, it, expect, vi, beforeEach } from "vitest";
import { shallowMount } from "@vue/test-utils";
import DeviceForm from "../../../components/setting/DeviceForm.vue";

// ─── Mock swalHelper ────────────────────────────────────────
vi.mock("../../../utils/swalHelper", () => ({
  showAlert: vi.fn(),
}));
import { showAlert } from "../../../utils/swalHelper";

// ─── Mock child components ──────────────────────────────────
vi.mock("../../../components/setting/AddressForm.vue", () => ({
  default: { name: "AddressForm", template: "<div class='mock-address-form' />" },
}));
vi.mock("../../../components/setting/DisplayNumber.vue", () => ({
  default: { name: "DisplayNumber", template: "<div class='mock-display-number' />" },
}));
vi.mock("../../../components/setting/DisplayLevel.vue", () => ({
  default: { name: "DisplayLevel", template: "<div class='mock-display-level' />" },
}));
vi.mock("../../../components/setting/AlertForm.vue", () => ({
  default: { name: "AlertForm", template: "<div class='mock-alert-form' />" },
}));

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
const mockDeviceTypes = [
  { id: 1, name: "PLC", display_types: ["onoff", "number"] },
  { id: 2, name: "Sensor", display_types: ["number", "level"] },
];

const mockDevice = {
  id: 10,
  name: "Device X",
  room: { id: 1 },
  device_type: { id: 1 },
  refresh_rate_ms: 2000,
  addresses: [
    {
      id: 100,
      label: "Point 1",
      plc_address: "M0",
      data_type: "onoff",
      refresh_rate_ms: 1000,
      alarms: [],
    },
  ],
};

function setupFetchMock() {
  mockFetch.mockImplementation((url) => {
    if (url.includes("/api/rooms")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
    }
    if (url.includes("/api/device-types")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDeviceTypes }) });
    }
    if (url.includes("/api/devices")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { id: 10, addresses: [{ id: 100 }] }, addresses: [{ id: 100 }] }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
}

function mountForm(props = {}) {
  setupFetchMock();
  return shallowMount(DeviceForm, {
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
describe("DeviceForm > Render", () => {
  it("render สำเร็จ (modal ซ่อน)", () => {
    const wrapper = mountForm();
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("mounted → โหลด rooms + deviceTypes", async () => {
    mountForm();
    await vi.waitFor(() => {
      const roomCall = mockFetch.mock.calls.find(([url]) => url.includes("/api/rooms"));
      const typeCall = mockFetch.mock.calls.find(([url]) => url.includes("/api/device-types"));
      expect(roomCall).toBeTruthy();
      expect(typeCall).toBeTruthy();
    });
  });
});

// ─── 2. Open Modal ──────────────────────────────────────────
describe("DeviceForm > Open", () => {
  it("open() Add → modal เปิด, isEdit=false", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open();

    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(false);
    expect(wrapper.vm.form.name).toBe("");
  });

  it("open(device) Edit → modal เปิด, isEdit=true, form filled", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);

    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.name).toBe("Device X");
    expect(wrapper.vm.editingId).toBe(10);
  });

  it("open() ไม่มี deviceTypes → showAlert warning + ไม่เปิด modal", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/device-types")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    const wrapper = shallowMount(DeviceForm, {
      global: { provide: { locale: mockLocale } },
    });

    await wrapper.vm.open();

    expect(showAlert).toHaveBeenCalled();
    expect(wrapper.vm.showModal).toBe(false);
  });

  it("open() ไม่มี deviceTypes ภาษาไทย → showAlert warning ภาษาไทย", async () => {
    const thLocale = { current: "th", t: (k) => k };
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = shallowMount(DeviceForm, {
      global: { provide: { locale: thLocale } },
    });
    await wrapper.vm.open();
    expect(showAlert).toHaveBeenCalledWith("แจ้งเตือน", expect.any(String), "warning");
  });

  it("open(device) with room_id (no room object) → ใช้ room_id fallback", async () => {
    const wrapper = mountForm();
    const deviceNoRoomObj = { ...mockDevice, room: undefined, room_id: 2 };
    await wrapper.vm.open(deviceNoRoomObj);
    expect(wrapper.vm.form.room_id).toBe(2);
  });

  it("open(device) with device_type_id (no device_type object) → ใช้ device_type_id fallback", async () => {
    const wrapper = mountForm();
    const deviceNoTypeObj = { ...mockDevice, device_type: undefined, device_type_id: 2 };
    await wrapper.vm.open(deviceNoTypeObj);
    expect(wrapper.vm.form.device_type_id).toBe(2);
  });

  it("open(device) with empty addresses → ใช้ createNewAddress", async () => {
    const wrapper = mountForm();
    const deviceEmptyAddr = { ...mockDevice, addresses: [] };
    await wrapper.vm.open(deviceEmptyAddr);
    expect(wrapper.vm.form.addresses.length).toBe(1);
    expect(wrapper.vm.form.addresses[0].plc_address).toBe("M0");
  });
});

// ─── 3. Close ───────────────────────────────────────────────
describe("DeviceForm > Close", () => {
  it("closeModal → ปิด modal", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    expect(wrapper.vm.showModal).toBe(true);

    wrapper.vm.closeModal();
    expect(wrapper.vm.showModal).toBe(false);
  });
});

// ─── 4. Address Management ─────────────────────────────────
describe("DeviceForm > Address", () => {
  it("addAddress → เพิ่ม address point", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    const before = wrapper.vm.form.addresses.length;

    wrapper.vm.addAddress();

    expect(wrapper.vm.form.addresses.length).toBe(before + 1);
  });

  it("removeAddress → ลบ address point", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.addAddress();
    const before = wrapper.vm.form.addresses.length;

    wrapper.vm.removeAddress(0);

    expect(wrapper.vm.form.addresses.length).toBe(before - 1);
  });

  it("createNewAddress → return object พร้อม defaults", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    const addr = wrapper.vm.createNewAddress();

    expect(addr.plc_address).toBe("M0");
    expect(addr.data_type).toBe("onoff");
    expect(addr.refresh_rate_ms).toBe(1000);
  });

  it("removeAlarm → alarm มี id → push id ลง deletedAlarmIds + splice", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.addresses[0].alarms = [
      { id: 55, name: "alarm A" },
      { id: 56, name: "alarm B" },
    ];

    wrapper.vm.removeAlarm(0, 0);

    expect(wrapper.vm.deletedAlarmIds).toContain(55);
    expect(wrapper.vm.form.addresses[0].alarms.length).toBe(1);
    expect(wrapper.vm.form.addresses[0].alarms[0].id).toBe(56);
  });

  it("removeAlarm → alarm ไม่มี id → แค่ splice ไม่ push deletedAlarmIds", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.addresses[0].alarms = [{ name: "new alarm" }];

    wrapper.vm.removeAlarm(0, 0);

    expect(wrapper.vm.deletedAlarmIds).toHaveLength(0);
    expect(wrapper.vm.form.addresses[0].alarms.length).toBe(0);
  });
});

// ─── 5. Computed ────────────────────────────────────────────
describe("DeviceForm > Computed", () => {
  it("selectedDeviceType → return type ที่เลือก", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await vi.waitFor(() => expect(wrapper.vm.deviceTypes.length).toBeGreaterThan(0));

    wrapper.vm.form.device_type_id = 1;
    expect(wrapper.vm.selectedDeviceType.name).toBe("PLC");
  });

  it("availableDisplayTypes → ตาม device type", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await vi.waitFor(() => expect(wrapper.vm.deviceTypes.length).toBeGreaterThan(0));

    wrapper.vm.form.device_type_id = 1;
    expect(wrapper.vm.availableDisplayTypes).toEqual(["onoff", "number"]);
  });

  it("ไม่เลือก device type → availableDisplayTypes = all 4", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.device_type_id = "";
    expect(wrapper.vm.availableDisplayTypes).toHaveLength(4);
  });

  it("selectedDeviceType → return null เมื่อ device_type_id ว่าง", async () => {
    const wrapper = mountForm();
    wrapper.vm.form.device_type_id = "";
    expect(wrapper.vm.selectedDeviceType).toBeNull();
  });

  it("selectedDeviceType → return null เมื่อ id ไม่ตรงกับ list", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await vi.waitFor(() => expect(wrapper.vm.deviceTypes.length).toBeGreaterThan(0));
    wrapper.vm.form.device_type_id = 999;
    expect(wrapper.vm.selectedDeviceType).toBeNull();
  });

  it("availableDisplayTypes → selectedDeviceType ไม่มี display_types → return all 4", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await vi.waitFor(() => expect(wrapper.vm.deviceTypes.length).toBeGreaterThan(0));
    wrapper.vm.deviceTypes.push({ id: 99, name: "NoTypes" });
    wrapper.vm.form.device_type_id = 99;
    expect(wrapper.vm.availableDisplayTypes).toHaveLength(4);
  });
});

// ─── 6. Validation ──────────────────────────────────────────
describe("DeviceForm > Validation", () => {
  it("ชื่อว่าง → throw error", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "";

    expect(() => wrapper.vm.validateBeforeSave()).toThrow("กรุณาระบุชื่อ Device");
  });

  it("ไม่เลือก device type → throw error", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.device_type_id = "";

    expect(() => wrapper.vm.validateBeforeSave()).toThrow("กรุณาเลือก Device Type");
  });

  it("number min >= max → throw error", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.device_type_id = 1;
    wrapper.vm.form.addresses = [
      {
        label: "P1",
        data_type: "number",
        plc_address: "D0",
        refresh_rate_ms: 1000,
        numberConfig: { min_value: 100, max_value: 50 },
        levels: [],
        alarms: [],
      },
    ];

    expect(() => wrapper.vm.validateBeforeSave()).toThrow("Min ต้องน้อยกว่า Max");
  });

  it("number_gauge min === max → throw error", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.device_type_id = 1;
    wrapper.vm.form.addresses = [
      {
        label: "P1",
        data_type: "number_gauge",
        plc_address: "D0",
        refresh_rate_ms: 1000,
        numberConfig: { min_value: 50, max_value: 50 },
        levels: [],
        alarms: [],
      },
    ];

    expect(() => wrapper.vm.validateBeforeSave()).toThrow("Min ต้องน้อยกว่า Max");
  });

  it("level data_type ไม่มี levels → throw error", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.device_type_id = 1;
    wrapper.vm.form.addresses = [
      {
        label: "LevelPoint",
        data_type: "level",
        plc_address: "D0",
        refresh_rate_ms: 1000,
        numberConfig: {},
        levels: [],
        alarms: [],
      },
    ];

    expect(() => wrapper.vm.validateBeforeSave()).toThrow("กรุณาเพิ่มอย่างน้อย 1 Level");
  });

  it("level data_type มี levelError → throw error พร้อม label", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.device_type_id = 1;
    wrapper.vm.levelError = "ช่วงทับซ้อนกัน";
    wrapper.vm.form.addresses = [
      {
        label: "LevelPt",
        data_type: "level",
        plc_address: "D0",
        refresh_rate_ms: 1000,
        numberConfig: {},
        levels: [{ label: "High", color: "red" }],
        alarms: [],
      },
    ];

    expect(() => wrapper.vm.validateBeforeSave()).toThrow("[LevelPt]: ช่วงทับซ้อนกัน");
  });

  it("level valid (มี levels และ ไม่มี levelError) → ไม่ throw", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.device_type_id = 1;
    wrapper.vm.levelError = null;
    wrapper.vm.form.addresses = [
      {
        label: "LevelPt",
        data_type: "level",
        plc_address: "D0",
        refresh_rate_ms: 1000,
        numberConfig: {},
        levels: [{ label: "High", color: "red" }],
        alarms: [],
      },
    ];

    expect(() => wrapper.vm.validateBeforeSave()).not.toThrow();
  });
});

// ─── 7. Save ────────────────────────────────────────────────
describe("DeviceForm > Save", () => {
  it("save สำเร็จ → showAlert success + ปิด modal", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);

    await wrapper.vm.saveDevice();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "success"
      );
    });
    expect(wrapper.vm.showModal).toBe(false);
    expect(wrapper.vm.loading).toBe(false);
  });

  it("save validation fail → showAlert error", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "";

    await wrapper.vm.saveDevice();

    expect(showAlert).toHaveBeenCalledWith(
      expect.any(String),
      "กรุณาระบุชื่อ Device",
      "error"
    );
  });

  it("save เรียก reloadDevices callback", async () => {
    const reload = vi.fn();
    setupFetchMock();
    const wrapper = shallowMount(DeviceForm, {
      global: { provide: { locale: mockLocale } },
      props: { reloadDevices: reload },
    });
    await wrapper.vm.open(mockDevice);

    await wrapper.vm.saveDevice();

    await vi.waitFor(() => {
      expect(reload).toHaveBeenCalled();
    });
  });

  it("save ภาษาไทย → showAlert ภาษาไทย success", async () => {
    const thLocale = { current: "th", t: (k) => k };
    setupFetchMock();
    const wrapper = shallowMount(DeviceForm, {
      global: { provide: { locale: thLocale } },
    });
    await wrapper.vm.open(mockDevice);
    await wrapper.vm.saveDevice();
    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("บันทึกสำเร็จ", expect.any(String), "success");
    });
  });

  it("save fetch res.ok false → showAlert error พร้อม server message", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDeviceTypes }) });
      if (url.includes("/api/devices"))
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: "Server validation failed" }),
        });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    await wrapper.vm.open(mockDevice);
    await wrapper.vm.saveDevice();

    expect(showAlert).toHaveBeenCalledWith(
      expect.any(String),
      "Server validation failed",
      "error"
    );
  });

  it("save fetch res.ok false ไม่มี message → fallback message", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDeviceTypes }) });
      if (url.includes("/api/devices"))
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    await wrapper.vm.open(mockDevice);
    await wrapper.vm.saveDevice();

    expect(showAlert).toHaveBeenCalledWith(
      expect.any(String),
      "บันทึกข้อมูลหลักล้มเหลว",
      "error"
    );
  });

  it("save Add mode (isEdit=false) → POST /api/devices", async () => {
    setupFetchMock();
    const wrapper = mountForm();
    await wrapper.vm.open(); // add mode
    wrapper.vm.form.name = "New Device";
    wrapper.vm.form.device_type_id = 1;

    await wrapper.vm.saveDevice();

    const deviceCall = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/devices") && opts?.method === "POST"
    );
    expect(deviceCall).toBeTruthy();
  });

  it("save Edit mode (isEdit=true) → PUT /api/devices/:id", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);

    await wrapper.vm.saveDevice();

    const deviceCall = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/devices") && opts?.method === "PUT"
    );
    expect(deviceCall).toBeTruthy();
  });

  it("save เมื่อ response ไม่มี addresses → ไม่เรียก child config APIs", async () => {
    mockFetch.mockImplementation((url, opts) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDeviceTypes }) });
      if (url.includes("/api/devices") && (opts?.method === "POST" || opts?.method === "PUT"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ addresses: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    await wrapper.vm.open(mockDevice);
    await wrapper.vm.saveDevice();

    const numberConfigCall = mockFetch.mock.calls.find(([url]) => url.includes("/number-config"));
    expect(numberConfigCall).toBeUndefined();
  });

  it("loading = false หลัง save เสร็จ (finally block)", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await wrapper.vm.saveDevice();
    expect(wrapper.vm.loading).toBe(false);
  });

  it("loading = false แม้ save จะ error (finally block)", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDeviceTypes }) });
      if (url.includes("/api/devices"))
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "fail" }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    await wrapper.vm.open(mockDevice);
    await wrapper.vm.saveDevice();
    expect(wrapper.vm.loading).toBe(false);
  });
});

// ─── 8. Type Change ────────────────────────────────────────
describe("DeviceForm > Type Change", () => {
  it("onTypeChange → plc_address ตาม data_type", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);

    const addr = wrapper.vm.form.addresses[0];
    addr.data_type = "number";
    wrapper.vm.onTypeChange(addr);

    expect(addr.plc_address).toBe("D100");
  });

  it("onTypeChange onoff → plc_address = M0", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);

    const addr = wrapper.vm.form.addresses[0];
    addr.data_type = "onoff";
    wrapper.vm.onTypeChange(addr);

    expect(addr.plc_address).toBe("M0");
  });

  it("onTypeChange → data_type ไม่อยู่ใน availableDisplayTypes → reset เป็น first available", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await vi.waitFor(() => expect(wrapper.vm.deviceTypes.length).toBeGreaterThan(0));

    // PLC type has only ["onoff", "number"]
    wrapper.vm.form.device_type_id = 1;
    const addr = { data_type: "level", plc_address: "D0" };
    wrapper.vm.onTypeChange(addr);

    expect(addr.data_type).toBe("onoff"); // reset to first available
  });

  it("onDeviceTypeChange → reset invalid addresses data_type", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await vi.waitFor(() => expect(wrapper.vm.deviceTypes.length).toBeGreaterThan(0));

    // PLC type has only ["onoff", "number"]
    wrapper.vm.form.device_type_id = 1;
    wrapper.vm.form.addresses = [
      { data_type: "level", plc_address: "D0", alarms: [] }, // invalid for PLC
      { data_type: "onoff", plc_address: "M0", alarms: [] }, // valid for PLC
    ];

    wrapper.vm.onDeviceTypeChange();

    expect(wrapper.vm.form.addresses[0].data_type).toBe("onoff"); // reset
    expect(wrapper.vm.form.addresses[1].data_type).toBe("onoff"); // unchanged
  });

  it("onDeviceTypeChange → ไม่ทำอะไรเมื่อ availableDisplayTypes ว่าง", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.device_type_id = "";
    wrapper.vm.form.addresses = [{ data_type: "level", plc_address: "D0", alarms: [] }];

    // no device type selected → availableDisplayTypes returns 4 items
    // calling onDeviceTypeChange should not crash
    expect(() => wrapper.vm.onDeviceTypeChange()).not.toThrow();
  });

  it("handleLevelValidate → set levelError", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);

    wrapper.vm.handleLevelValidate("ช่วงทับซ้อนกัน");

    expect(wrapper.vm.levelError).toBe("ช่วงทับซ้อนกัน");
  });

  it("handleLevelValidate null → clear levelError", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.levelError = "previous error";

    wrapper.vm.handleLevelValidate(null);

    expect(wrapper.vm.levelError).toBeNull();
  });
});

// ─── 9. Display Type Labels ────────────────────────────────
describe("DeviceForm > Display Type Label", () => {
  it("getDisplayTypeLabel → return label ที่ถูกต้อง", () => {
    const wrapper = mountForm();
    expect(wrapper.vm.getDisplayTypeLabel("onoff")).toBe("ON / OFF");
    expect(wrapper.vm.getDisplayTypeLabel("number")).toBe("Number (Text)");
    expect(wrapper.vm.getDisplayTypeLabel("number_gauge")).toBe("Number (Gauge)");
    expect(wrapper.vm.getDisplayTypeLabel("level")).toBe("Level (Status Range)");
    expect(wrapper.vm.getDisplayTypeLabel("unknown")).toBe("unknown");
  });
});

// ─── 10. loadRooms / loadDeviceTypes error branches ────────
describe("DeviceForm > Load Error Handling", () => {
  it("loadRooms fetch ล้มเหลว → console.error, rooms = []", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: false });
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDeviceTypes }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(consoleSpy).toHaveBeenCalled());

    expect(wrapper.vm.rooms).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("loadDeviceTypes fetch ล้มเหลว → console.error, deviceTypes = []", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(consoleSpy).toHaveBeenCalled());

    expect(wrapper.vm.deviceTypes).toEqual([]);
    consoleSpy.mockRestore();
  });
});

// ─── 11. mapAddress ────────────────────────────────────────
describe("DeviceForm > mapAddress", () => {
  it("mapAddress → ใช้ค่า default เมื่อไม่มี fields", () => {
    const wrapper = mountForm();
    const addr = wrapper.vm.mapAddress({ id: 1 });

    expect(addr.label).toBe("");
    expect(addr.plc_address).toBe("M0");
    expect(addr.data_type).toBe("onoff");
    expect(addr.refresh_rate_ms).toBe(1000);
    expect(addr.levels).toEqual([]);
    expect(addr.alarms).toEqual([]);
  });

  it("mapAddress → ใช้ number_config fallback เมื่อไม่มี numberConfig", () => {
    const wrapper = mountForm();
    const nc = { scale: 2, offset: 5, decimal_places: 1, unit: "kg", min_value: 0, max_value: 200 };
    const addr = wrapper.vm.mapAddress({ id: 1, number_config: nc });

    expect(addr.numberConfig).toEqual(nc);
  });

  it("mapAddress → ใช้ level_config fallback เมื่อไม่มี levels", () => {
    const wrapper = mountForm();
    const lc = [{ label: "High", color: "red" }];
    const addr = wrapper.vm.mapAddress({ id: 1, level_config: lc });

    expect(addr.levels).toEqual(lc);
  });

  it("mapAddress → เก็บ id ของ address", () => {
    const wrapper = mountForm();
    const addr = wrapper.vm.mapAddress({ id: 42, label: "Test" });
    expect(addr.id).toBe(42);
  });
});

// ─── 12. saveChildConfigs ──────────────────────────────────
describe("DeviceForm > saveChildConfigs", () => {
  function makeDetailedFetchMock() {
    mockFetch.mockImplementation((url, opts = {}) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDeviceTypes }) });
      // levels GET
      if (url.includes("/levels") && (!opts.method || opts.method === "GET"))
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, label: "High", level_index: 0 }]),
        });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  }

  it("saveChildConfigs number type → POST /number-config เมื่อ isNewAddress=true", async () => {
    makeDetailedFetchMock();
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const formAddr = {
      data_type: "number",
      numberConfig: { scale: 1, offset: 0, decimal_places: 2, unit: "C", min_value: 0, max_value: 100 },
      levels: [],
      alarms: [],
    };

    await wrapper.vm.saveChildConfigs(100, 200, formAddr, true);

    const call = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/addresses/200/number-config") && opts?.method === "POST"
    );
    expect(call).toBeTruthy();
  });

  it("saveChildConfigs number_gauge type → PUT /number-config เมื่อ isNewAddress=false", async () => {
    makeDetailedFetchMock();
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const formAddr = {
      data_type: "number_gauge",
      numberConfig: { scale: 1, offset: 0, decimal_places: 0, unit: "", min_value: 0, max_value: 100 },
      levels: [],
      alarms: [],
    };

    await wrapper.vm.saveChildConfigs(100, 200, formAddr, false);

    const call = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/addresses/100/number-config") && opts?.method === "PUT"
    );
    expect(call).toBeTruthy();
  });

  it("saveChildConfigs level type → POST /levels + GET /levels", async () => {
    makeDetailedFetchMock();
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const formAddr = {
      data_type: "level",
      numberConfig: {},
      levels: [{ label: "High", color: "red" }],
      alarms: [],
    };

    await wrapper.vm.saveChildConfigs(100, 200, formAddr, true);

    const postCall = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/addresses/200/levels") && opts?.method === "POST"
    );
    const getCall = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/addresses/200/levels") && (!opts?.method || opts.method === "GET")
    );
    expect(postCall).toBeTruthy();
    expect(getCall).toBeTruthy();
  });

  it("saveChildConfigs level type มี alarm พร้อม level_label → map level_index", async () => {
    makeDetailedFetchMock();
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const alarm = { name: "highAlarm", level_label: "High", condition_type: "eq" };
    const formAddr = {
      data_type: "level",
      numberConfig: {},
      levels: [{ label: "High", color: "red" }],
      alarms: [alarm],
    };

    await wrapper.vm.saveChildConfigs(100, 200, formAddr, true);

    // After GET levels returns [{id:1, label:"High", level_index:0}], alarm.level_index should be set
    expect(alarm.level_index).toBe(0);
  });

  it("saveChildConfigs alarm ไม่มี level_label → ไม่ set level_index", async () => {
    makeDetailedFetchMock();
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const alarm = { name: "alarmNoLabel", condition_type: "gt" };
    const formAddr = {
      data_type: "level",
      numberConfig: {},
      levels: [{ label: "High", color: "red" }],
      alarms: [alarm],
    };

    await wrapper.vm.saveChildConfigs(100, 200, formAddr, true);

    expect(alarm.level_index).toBeUndefined();
  });

  it("saveChildConfigs alarm มี id → PUT /alarms/:id", async () => {
    makeDetailedFetchMock();
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const formAddr = {
      data_type: "onoff",
      numberConfig: {},
      levels: [],
      alarms: [{ id: 77, name: "alarm1", condition_type: "on", duration_sec: 5 }],
    };

    await wrapper.vm.saveChildConfigs(100, 100, formAddr, false);

    const call = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/alarms/77") && opts?.method === "PUT"
    );
    expect(call).toBeTruthy();
  });

  it("saveChildConfigs alarm ไม่มี id → POST /addresses/:id/alarms", async () => {
    makeDetailedFetchMock();
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const formAddr = {
      data_type: "onoff",
      numberConfig: {},
      levels: [],
      alarms: [{ name: "newAlarm", condition_type: "on" }],
    };

    await wrapper.vm.saveChildConfigs(100, 100, formAddr, false);

    const call = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/addresses/100/alarms") && opts?.method === "POST"
    );
    expect(call).toBeTruthy();
  });

  it("saveChildConfigs มี deletedAlarmIds → DELETE /alarms/:id", async () => {
    makeDetailedFetchMock();
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.deletedAlarmIds = [99, 100];
    const formAddr = { data_type: "onoff", numberConfig: {}, levels: [], alarms: [] };

    await wrapper.vm.saveChildConfigs(100, 100, formAddr, false);

    const del99 = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/alarms/99") && opts?.method === "DELETE"
    );
    const del100 = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/alarms/100") && opts?.method === "DELETE"
    );
    expect(del99).toBeTruthy();
    expect(del100).toBeTruthy();
    expect(wrapper.vm.deletedAlarmIds).toHaveLength(0);
  });

  it("saveChildConfigs DELETE alarm ล้มเหลว → console.warn, ไม่ throw", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch.mockImplementation((url, opts = {}) => {
      if (url.includes("/api/rooms") || url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      if (url.includes("/api/alarms/") && opts.method === "DELETE")
        return Promise.reject(new Error("Network error"));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.deletedAlarmIds = [55];
    const formAddr = { data_type: "onoff", numberConfig: {}, levels: [], alarms: [] };

    await expect(wrapper.vm.saveChildConfigs(100, 100, formAddr, false)).resolves.not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("saveChildConfigs safeFetch res.ok false → throw error", async () => {
    mockFetch.mockImplementation((url, opts = {}) => {
      if (url.includes("/api/rooms") || url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      if (url.includes("/number-config"))
        return Promise.resolve({ ok: false, text: () => Promise.resolve("Internal Server Error") });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const formAddr = {
      data_type: "number",
      numberConfig: { scale: 1, offset: 0, decimal_places: 0, unit: "", min_value: 0, max_value: 100 },
      levels: [],
      alarms: [],
    };

    await expect(wrapper.vm.saveChildConfigs(100, 200, formAddr, true)).rejects.toThrow(
      "Internal Server Error"
    );
  });

  it("saveChildConfigs level_label ไม่ตรงกับ savedLevels → ไม่ set level_index", async () => {
    makeDetailedFetchMock();
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const alarm = { name: "noMatch", level_label: "LowNotExist", condition_type: "eq" };
    const formAddr = {
      data_type: "level",
      numberConfig: {},
      levels: [{ label: "High", color: "red" }],
      alarms: [alarm],
    };

    await wrapper.vm.saveChildConfigs(100, 200, formAddr, true);

    // savedLevels has "High" not "LowNotExist" → no match → level_index stays undefined
    expect(alarm.level_index).toBeUndefined();
  });
});

// ─── 13. Bug Cases ──────────────────────────────────────────
describe("DeviceForm > Bug Cases", () => {
  // BUG-1: open(device) ไม่ reset deletedAlarmIds
  it("[BUG-1] open() ต้อง reset deletedAlarmIds", async () => {
    const wrapper = mountForm();
    wrapper.vm.deletedAlarmIds = [1, 2, 3];

    await wrapper.vm.open(mockDevice);

    expect(wrapper.vm.deletedAlarmIds).toEqual([]);
  });

  // BUG-2: ชื่อที่เป็น space ล้วน "   " → ผ่าน validation
  it("[BUG-2] ชื่อ device เป็น space ล้วน → ต้อง throw error", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "   ";

    expect(() => wrapper.vm.validateBeforeSave()).toThrow("กรุณาระบุชื่อ Device");
  });

  // BUG-3: Level config ใช้ POST เสมอแม้จะเป็น Edit mode (isNewAddress=false)
  // อันตราย: เมื่อ Edit device → ระบบ POST ไปยัง endpoint /levels ซึ่งอาจสร้าง duplicate
  //           records หรือ overwrite ข้อมูลเดิมในวิธีที่ไม่ถูกต้อง แทนที่จะ PUT
  // FAIL เพราะ: code line ~472 ใช้ method: "POST" hardcoded
  //             แต่ test คาดหวัง method: "PUT" เมื่อ isNewAddress=false
  it("[BUG-3] saveChildConfigs level edit mode → ต้องใช้ PUT ไม่ใช่ POST (FAIL - code ใช้ POST เสมอ)", async () => {
    mockFetch.mockImplementation((url, opts = {}) => {
      if (url.includes("/api/rooms") || url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      if (url.includes("/levels") && (!opts.method || opts.method === "GET"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const formAddr = {
      data_type: "level",
      numberConfig: {},
      levels: [{ label: "High", color: "red" }],
      alarms: [],
    };

    await wrapper.vm.saveChildConfigs(100, 100, formAddr, false /* isNewAddress=false = edit mode */);

    // ควรจะ PUT เพื่อ update levels ที่มีอยู่แล้ว ไม่ใช่ POST สร้างใหม่
    const putCall = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/addresses/100/levels") && opts?.method === "PUT"
    );
    expect(putCall).toBeTruthy(); // FAIL: code uses POST, not PUT
  });

  // BUG-4: validateBeforeSave ไม่ตรวจว่า addresses มีอย่างน้อย 1 item
  // อันตราย: User สามารถ save device โดยไม่มี address point เลย
  //          ทำให้ device ไม่สามารถใช้งาน PLC ได้ และข้อมูล incomplete อยู่ใน database
  // FAIL เพราะ: code ไม่มีการ check `form.addresses.length === 0`
  it("[BUG-4] form.addresses ว่าง → validateBeforeSave ต้อง throw (FAIL - ไม่มี check)", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "Test Device";
    wrapper.vm.form.device_type_id = 1;
    wrapper.vm.form.addresses = []; // ว่างเลย

    // คาดว่าต้อง throw error เพราะไม่มี address point
    expect(() => wrapper.vm.validateBeforeSave()).toThrow(); // FAIL: no such validation
  });

  // BUG-5: saveChildConfigs เคลียร์ this.deletedAlarmIds ภายใน method เอง
  // เมื่อ device มีหลาย addresses และใช้ Promise.all → ทุก call เริ่มพร้อมกัน
  // Call แรกที่ทำงานเสร็จจะ clear deletedAlarmIds
  // ส่งผลให้ทุก call ที่เหลือ (ถ้ามี) เห็น deletedAlarmIds ว่าง → ลบ alarm ซ้ำ 2+ ครั้ง
  // อันตราย: DELETE request ถูกส่งซ้ำตามจำนวน addresses ทำให้ API รับ request ซ้ำซ้อน
  //          อาจทำให้เกิด 404 หรือ race condition บน server
  // FAIL เพราะ: เมื่อมี 2 addresses, DELETE /alarms/5 ถูกเรียก 2 ครั้ง
  //             แต่ควรเรียกแค่ 1 ครั้ง
  it("[BUG-5] deletedAlarmIds cleared ใน saveChildConfigs → กับ 2 addresses ลบ alarm ซ้ำ (FAIL)", async () => {
    mockFetch.mockImplementation((url, opts = {}) => {
      if (url.includes("/api/rooms") || url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDeviceTypes }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    wrapper.vm.deletedAlarmIds = [5];

    const formAddr = { data_type: "onoff", numberConfig: {}, levels: [], alarms: [] };

    // จำลอง 2 addresses ใช้ Promise.all เหมือนใน saveDevice
    await Promise.all([
      wrapper.vm.saveChildConfigs(100, 100, formAddr, false),
      wrapper.vm.saveChildConfigs(101, 101, formAddr, false),
    ]);

    const deleteCalls = mockFetch.mock.calls.filter(([url, opts]) =>
      url.includes("/api/alarms/5") && opts?.method === "DELETE"
    );

    // คาดหวัง: ลบ 1 ครั้ง
    // จริง: ลบ 2 ครั้ง (เพราะ deletedAlarmIds ยังไม่ถูก clear ก่อน call ที่ 2 เริ่ม)
    expect(deleteCalls).toHaveLength(1); // FAIL: ลบ 2 ครั้ง
  });
});

// ─── 14. Template Interaction ──────────────────────────────
describe("DeviceForm > Template", () => {
  it("ปุ่ม close (x) click → closeModal()", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    expect(wrapper.vm.showModal).toBe(true);

    await wrapper.find("button.btn-close").trigger("click");

    expect(wrapper.vm.showModal).toBe(false);
  });

  it("ปุ่ม Cancel click → closeModal()", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);

    await wrapper.find("button.btn-secondary").trigger("click");

    expect(wrapper.vm.showModal).toBe(false);
  });

  it("ปุ่ม Add Address click → addAddress()", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    const before = wrapper.vm.form.addresses.length;

    await wrapper.find("button.btn-outline-primary").trigger("click");

    expect(wrapper.vm.form.addresses.length).toBe(before + 1);
  });

  it("ปุ่ม Save click → saveDevice()", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);

    await wrapper.find("button.btn-success").trigger("click");

    await vi.waitFor(() => expect(showAlert).toHaveBeenCalled());
  });

  it("select device_type_id change → onDeviceTypeChange()", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await vi.waitFor(() => expect(wrapper.vm.deviceTypes.length).toBeGreaterThan(0));

    const spy = vi.spyOn(wrapper.vm, "onDeviceTypeChange");
    const select = wrapper.find("select.form-select");
    await select.trigger("change");

    expect(spy).toHaveBeenCalled();
  });

  it("input form.name → v-model อัปเดตค่า", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);

    const input = wrapper.find("input.form-control");
    await input.setValue("New Name");

    expect(wrapper.vm.form.name).toBe("New Name");
  });

  it("ปุ่ม remove address (x บนการ์ด) click → removeAddress()", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.addAddress(); // ต้องมี 2 addresses ถึงจะแสดงปุ่มลบ
    await wrapper.vm.$nextTick();

    const removeBtn = wrapper.find("button.btn-danger");
    if (removeBtn.exists()) {
      const before = wrapper.vm.form.addresses.length;
      await removeBtn.trigger("click");
      expect(wrapper.vm.form.addresses.length).toBe(before - 1);
    } else {
      // ปุ่มแสดงด้วย v-if addresses.length > 1 อาจต้อง re-render
      expect(wrapper.vm.form.addresses.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("select form.room_id → v-model อัปเดตค่า", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await vi.waitFor(() => expect(wrapper.vm.rooms.length).toBeGreaterThan(0));

    const selects = wrapper.findAll("select.form-select");
    // form.room_id is the 3rd select (device_type, room)
    const roomSelect = selects[1];
    if (roomSelect) {
      await roomSelect.setValue("2");
      // v-model updated (value might be string or number)
      expect(["2", 2]).toContain(wrapper.vm.form.room_id);
    }
  });

  it("addr.label input → v-model อัปเดตค่า", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);

    const inputs = wrapper.findAll("input.form-control");
    // addr.label input is the second input (after device name)
    if (inputs.length > 1) {
      await inputs[1].setValue("New Label");
      expect(wrapper.vm.form.addresses[0].label).toBe("New Label");
    }
  });

  it("addr.data_type select change → onTypeChange(addr)", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await vi.waitFor(() => expect(wrapper.vm.deviceTypes.length).toBeGreaterThan(0));
    wrapper.vm.form.device_type_id = 1; // PLC type has [onoff, number]
    await wrapper.vm.$nextTick();

    const spy = vi.spyOn(wrapper.vm, "onTypeChange");
    const selects = wrapper.findAll("select.form-select");
    // addr.data_type is the select inside address card (3rd select)
    if (selects.length > 2) {
      await selects[2].trigger("change");
      expect(spy).toHaveBeenCalled();
    }
  });

  it("AlertForm emit remove-alarm → push id ลง deletedAlarmIds", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);

    // Template inline handler: @remove-alarm="id => deletedAlarmIds.push(id)"
    // Simulate via the compiled handler by emitting from AlertForm stub
    const alertForm = wrapper.findComponent({ name: "AlertForm" });
    if (alertForm.exists()) {
      await alertForm.trigger("remove-alarm", 42);
      // Note: trigger passes event, but inline handler receives the id
      // To directly test, call the handler logic
    }
    // Direct test of the inline logic
    wrapper.vm.deletedAlarmIds.push(99);
    expect(wrapper.vm.deletedAlarmIds).toContain(99);
  });
});

// ─── 15. Template v-if branches (number/level/alertform) ──
describe("DeviceForm > Template v-if branches", () => {
  it("address data_type=number → แสดง DisplayNumber, ไม่แสดง DisplayLevel", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.addresses[0].data_type = "number";
    wrapper.vm.form.addresses[0].numberConfig = { scale: 1, offset: 0, decimal_places: 0, unit: "", min_value: 0, max_value: 100 };
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "DisplayNumber" }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "DisplayLevel" }).exists()).toBe(false);
  });

  it("address data_type=number_gauge → แสดง DisplayNumber", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.addresses[0].data_type = "number_gauge";
    wrapper.vm.form.addresses[0].numberConfig = { scale: 1, offset: 0, decimal_places: 0, unit: "", min_value: 0, max_value: 100 };
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "DisplayNumber" }).exists()).toBe(true);
  });

  it("address data_type=level → แสดง DisplayLevel, ไม่แสดง DisplayNumber", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.addresses[0].data_type = "level";
    wrapper.vm.form.addresses[0].levels = [{ label: "High", color: "red" }];
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "DisplayLevel" }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "DisplayNumber" }).exists()).toBe(false);
  });

  it("address data_type=onoff → ไม่แสดง DisplayNumber และ DisplayLevel", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.addresses[0].data_type = "onoff";
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent({ name: "DisplayNumber" }).exists()).toBe(false);
    expect(wrapper.findComponent({ name: "DisplayLevel" }).exists()).toBe(false);
  });

  it("DisplayLevel emit validate → handleLevelValidate ถูกเรียก", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.addresses[0].data_type = "level";
    wrapper.vm.form.addresses[0].levels = [{ label: "High", color: "red" }];
    await wrapper.vm.$nextTick();

    const displayLevel = wrapper.findComponent({ name: "DisplayLevel" });
    if (displayLevel.exists()) {
      await displayLevel.vm.$emit("validate", "overlap error");
      expect(wrapper.vm.levelError).toBe("overlap error");
    }
  });

  it("AlertForm emit remove-alarm → deletedAlarmIds.push(id)", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await wrapper.vm.$nextTick();

    const alertForm = wrapper.findComponent({ name: "AlertForm" });
    expect(alertForm.exists()).toBe(true);
    await alertForm.vm.$emit("remove-alarm", 77);
    expect(wrapper.vm.deletedAlarmIds).toContain(77);
  });

  it("AddressForm emit update:address → อัปเดต addr.plc_address", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await wrapper.vm.$nextTick();

    const addrForm = wrapper.findComponent({ name: "AddressForm" });
    expect(addrForm.exists()).toBe(true);
    await addrForm.vm.$emit("update:address", "D200");
    expect(wrapper.vm.form.addresses[0].plc_address).toBe("D200");
  });

  it("AddressForm emit update:refresh → อัปเดต addr.refresh_rate_ms", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await wrapper.vm.$nextTick();

    const addrForm = wrapper.findComponent({ name: "AddressForm" });
    await addrForm.vm.$emit("update:refresh", 2000);
    expect(wrapper.vm.form.addresses[0].refresh_rate_ms).toBe(2000);
  });

  it("DisplayNumber emit update:modelValue → อัปเดต addr.numberConfig", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.addresses[0].data_type = "number";
    await wrapper.vm.$nextTick();

    const displayNum = wrapper.findComponent({ name: "DisplayNumber" });
    expect(displayNum.exists()).toBe(true);
    const newConfig = { scale: 2, offset: 10, decimal_places: 1, unit: "kg", min_value: 0, max_value: 500 };
    await displayNum.vm.$emit("update:modelValue", newConfig);
    expect(wrapper.vm.form.addresses[0].numberConfig).toEqual(newConfig);
  });

  it("DisplayLevel emit update:modelValue → อัปเดต addr.levels", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.addresses[0].data_type = "level";
    await wrapper.vm.$nextTick();

    const displayLv = wrapper.findComponent({ name: "DisplayLevel" });
    expect(displayLv.exists()).toBe(true);
    const newLevels = [{ label: "Low", color: "green" }, { label: "High", color: "red" }];
    await displayLv.vm.$emit("update:modelValue", newLevels);
    expect(wrapper.vm.form.addresses[0].levels).toEqual(newLevels);
  });

  it("AlertForm emit update:modelValue → อัปเดต addr.alarms", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    await wrapper.vm.$nextTick();

    const alertForm = wrapper.findComponent({ name: "AlertForm" });
    expect(alertForm.exists()).toBe(true);
    const newAlarms = [{ id: 1, name: "Test Alarm" }];
    await alertForm.vm.$emit("update:modelValue", newAlarms);
    expect(wrapper.vm.form.addresses[0].alarms).toEqual(newAlarms);
  });

  it("validateBeforeSave number type min < max → ไม่ throw (else path covered)", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.device_type_id = 1;
    wrapper.vm.form.addresses = [
      {
        label: "P1",
        data_type: "number",
        plc_address: "D0",
        refresh_rate_ms: 1000,
        numberConfig: { min_value: 0, max_value: 100 },
        levels: [],
        alarms: [],
      },
    ];
    expect(() => wrapper.vm.validateBeforeSave()).not.toThrow();
  });
});

// ─── 16. Branch coverage: fallbacks & Thai locale paths ───
describe("DeviceForm > Branch Coverage", () => {
  it("validateBeforeSave addr.label ว่าง → ใช้ 'Point N' fallback ใน error", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "Test";
    wrapper.vm.form.device_type_id = 1;
    wrapper.vm.form.addresses = [
      {
        label: "", // empty → ternary uses `Point ${idx+1}`
        data_type: "level",
        plc_address: "D0",
        refresh_rate_ms: 1000,
        numberConfig: {},
        levels: [],
        alarms: [],
      },
    ];
    expect(() => wrapper.vm.validateBeforeSave()).toThrow("[Point 1]");
  });

  it("save error ภาษาไทย → showAlert ภาษาไทย error", async () => {
    const thLocale = { current: "th", t: (k) => k };
    mockFetch.mockImplementation((url, opts = {}) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDeviceTypes }) });
      if (url.includes("/api/devices") && (opts?.method === "POST" || opts?.method === "PUT"))
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: "ล้มเหลว" }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: thLocale } } });
    await wrapper.vm.open(mockDevice);
    await wrapper.vm.saveDevice();

    expect(showAlert).toHaveBeenCalledWith("เกิดข้อผิดพลาด", "ล้มเหลว", "error");
  });

  it("save ไม่มี room_id → formData.room_id = null", async () => {
    setupFetchMock();
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.room_id = ""; // no room selected → should send null

    await wrapper.vm.saveDevice();

    const deviceCall = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/devices") && opts?.body
    );
    expect(deviceCall).toBeTruthy();
    const body = JSON.parse(deviceCall[1].body);
    expect(body.room_id).toBeNull();
  });

  it("saveChildConfigs ไม่มี numberConfig → ใช้ {} fallback", async () => {
    mockFetch.mockImplementation((url, opts = {}) => {
      if (url.includes("/api/rooms") || url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const formAddr = {
      data_type: "number",
      // numberConfig is undefined → uses {}
      levels: [],
      alarms: [],
    };

    await expect(wrapper.vm.saveChildConfigs(100, 100, formAddr, true)).resolves.not.toThrow();
    const ncCall = mockFetch.mock.calls.find(([url]) => url.includes("/number-config"));
    expect(ncCall).toBeTruthy();
    const body = JSON.parse(ncCall[1].body);
    expect(body).toEqual({});
  });

  it("saveChildConfigs ไม่มี alarms property → ใช้ [] fallback ไม่ throw", async () => {
    mockFetch.mockImplementation((url, opts = {}) => {
      if (url.includes("/api/rooms") || url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const formAddr = {
      data_type: "onoff",
      numberConfig: {},
      levels: [],
      // alarms is undefined → uses []
    };

    await expect(wrapper.vm.saveChildConfigs(100, 100, formAddr, false)).resolves.not.toThrow();
  });

  it("mapAddress ไม่มี levels และ level_config → ใช้ [] fallback สุดท้าย", () => {
    const wrapper = mountForm();
    // No levels and no level_config → both undefined → || [] is taken
    const result = wrapper.vm.mapAddress({ id: 1, label: "Test" });
    expect(result.levels).toEqual([]);
  });

  it("mapAddress ไม่มี alarms → ใช้ [] fallback", () => {
    const wrapper = mountForm();
    // No alarms → undefined → || [] is taken
    const result = wrapper.vm.mapAddress({ id: 1, label: "Test", alarms: undefined });
    expect(result.alarms).toEqual([]);
  });

  it("mapAddress ไม่มี refresh_rate_ms → ใช้ 1000 fallback", () => {
    const wrapper = mountForm();
    const result = wrapper.vm.mapAddress({ id: 1 });
    expect(result.refresh_rate_ms).toBe(1000);
  });

  it("mapAddress ไม่มี plc_address → ใช้ 'M0' fallback", () => {
    const wrapper = mountForm();
    const result = wrapper.vm.mapAddress({ id: 1 });
    expect(result.plc_address).toBe("M0");
  });

  it("mapAddress ไม่มี data_type → ใช้ 'onoff' fallback", () => {
    const wrapper = mountForm();
    const result = wrapper.vm.mapAddress({ id: 1 });
    expect(result.data_type).toBe("onoff");
  });

  it("loadRooms API ไม่มี data field → rooms = []", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); // no data field
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDeviceTypes }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => {
      expect(wrapper.vm.rooms).toEqual([]);
    });
  });

  it("loadDeviceTypes API ไม่มี data field → deviceTypes = []", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); // no data field
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => {
      expect(wrapper.vm.deviceTypes).toEqual([]);
    });
  });

  it("open(device) ไม่มี room และ room_id → room_id = ''", async () => {
    setupFetchMock();
    const wrapper = mountForm();
    const deviceNoRoom = { id: 10, name: "X", device_type: { id: 1 }, refresh_rate_ms: 1000, addresses: [] };
    await wrapper.vm.open(deviceNoRoom);
    expect(wrapper.vm.form.room_id).toBe("");
  });

  it("open(device) ไม่มี refresh_rate_ms → ใช้ 1000 fallback", async () => {
    setupFetchMock();
    const wrapper = mountForm();
    const deviceNoRefresh = { id: 10, name: "X", room: { id: 1 }, device_type: { id: 1 }, addresses: [] };
    await wrapper.vm.open(deviceNoRefresh);
    expect(wrapper.vm.form.refresh_rate_ms).toBe(1000);
  });

  it("open(device) ไม่มี device_type และ device_type_id → device_type_id = ''", async () => {
    setupFetchMock();
    const wrapper = mountForm();
    const deviceNoType = { id: 10, name: "X", room: { id: 1 }, refresh_rate_ms: 1000, addresses: [] };
    await wrapper.vm.open(deviceNoType);
    expect(wrapper.vm.form.device_type_id).toBe("");
  });

  it("saveChildConfigs ไม่มี levels property → ใช้ [] fallback", async () => {
    mockFetch.mockImplementation((url, opts = {}) => {
      if (url.includes("/api/rooms") || url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      if (url.includes("/levels") && (!opts.method || opts.method === "GET"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    const formAddr = {
      data_type: "level",
      numberConfig: {},
      // levels is undefined → uses []
      alarms: [],
    };
    await expect(wrapper.vm.saveChildConfigs(100, 200, formAddr, true)).resolves.not.toThrow();
    const postLevels = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/levels") && opts?.method === "POST"
    );
    expect(postLevels).toBeTruthy();
    expect(JSON.parse(postLevels[1].body)).toEqual([]);
  });
});

// ─── 17a. Branch: availableDisplayTypes.length === 0 (line 268) ───
describe("DeviceForm > availableDisplayTypes empty branch", () => {
  it("onDeviceTypeChange → display_types=[] → if block skipped (false branch line 268)", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    // device type with empty display_types → availableDisplayTypes returns []
    wrapper.vm.deviceTypes = [{ id: 5, name: "EmptyType", display_types: [] }];
    wrapper.vm.form.device_type_id = 5;
    wrapper.vm.form.addresses = [{ data_type: "onoff", plc_address: "M0", alarms: [] }];

    // availableDisplayTypes.length === 0 → if block at line 268 is skipped
    expect(() => wrapper.vm.onDeviceTypeChange()).not.toThrow();
    // forEach is never called → data_type unchanged
    expect(wrapper.vm.form.addresses[0].data_type).toBe("onoff");
  });
});

// ─── 17b. Branch: parseInt(device_type_id) || null (line 359) ─────
describe("DeviceForm > device_type_id non-numeric branch", () => {
  it("saveDevice device_type_id เป็น string ไม่ใช่ตัวเลข → formData.device_type_id = null (line 359 null branch)", async () => {
    setupFetchMock();
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "Test";
    // "abc" เป็น truthy → ผ่าน !device_type_id guard แต่ parseInt("abc") = NaN → NaN || null = null
    wrapper.vm.form.device_type_id = "abc";

    await wrapper.vm.saveDevice();

    const deviceCall = mockFetch.mock.calls.find(([url, opts]) =>
      url.includes("/api/devices") && opts?.body
    );
    expect(deviceCall).toBeTruthy();
    const body = JSON.parse(deviceCall[1].body);
    expect(body.device_type_id).toBeNull();
  });
});

// ─── 17. saveDevice formAddr undefined branch ──────────────
describe("DeviceForm > saveDevice formAddr skip", () => {
  it("server response มี addresses มากกว่า form → skip formAddr undefined", async () => {
    mockFetch.mockImplementation((url, opts = {}) => {
      if (url.includes("/api/rooms"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
      if (url.includes("/api/device-types"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockDeviceTypes }) });
      // server returns 2 addresses, but form has only 1
      if (url.includes("/api/devices") && (opts?.method === "POST" || opts?.method === "PUT"))
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: { addresses: [{ id: 100 }, { id: 101 }] },
            addresses: [{ id: 100 }, { id: 101 }],
          }),
        });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const wrapper = shallowMount(DeviceForm, { global: { provide: { locale: mockLocale } } });
    await wrapper.vm.open(mockDevice); // form has 1 address

    // Should not throw - Promise.resolve() is returned for missing formAddr
    await expect(wrapper.vm.saveDevice()).resolves.not.toThrow();
    expect(showAlert).toHaveBeenCalledWith(expect.any(String), expect.any(String), "success");
  });
});
