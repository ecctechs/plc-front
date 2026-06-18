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

// ─── 10. Bug Cases ──────────────────────────────────────────
describe("DeviceForm > Bug Cases", () => {
  // BUG-1: open(device) ไม่ reset deletedAlarmIds
  // ถ้าเปิด edit Device A → ลบ alarm → ไม่ save → เปิด edit Device B
  // deletedAlarmIds จาก Device A ยังค้างอยู่ → save Device B จะลบ alarm ของ A ด้วย
  it("[BUG-1] open() ต้อง reset deletedAlarmIds", async () => {
    const wrapper = mountForm();
    wrapper.vm.deletedAlarmIds = [1, 2, 3];

    await wrapper.vm.open(mockDevice);

    expect(wrapper.vm.deletedAlarmIds).toEqual([]);
  });

  // BUG-2: save() ชื่อที่เป็น space ล้วน "   " → ผ่าน validation
  // validateBeforeSave เช็ค !this.form.name → "   " is truthy → ผ่าน
  // ควร trim ก่อน
  it("[BUG-2] ชื่อ device เป็น space ล้วน → ต้อง throw error", async () => {
    const wrapper = mountForm();
    await wrapper.vm.open(mockDevice);
    wrapper.vm.form.name = "   ";

    expect(() => wrapper.vm.validateBeforeSave()).toThrow("กรุณาระบุชื่อ Device");
  });
});
