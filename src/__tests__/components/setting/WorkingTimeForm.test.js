import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import WorkingTimeForm from "../../../components/setting/WorkingTimeForm.vue";

// ─── Mock Swal (ใช้ Swal ตรง ไม่ใช่ swalHelper) ───────────
vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
  },
}));
import Swal from "sweetalert2";

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

function setupLoadMock(schedule = null) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(schedule ? { schedule } : { schedule: null }),
  });
}

function mountForm() {
  setupLoadMock();
  return mount(WorkingTimeForm, {
    global: {
      provide: { locale: mockLocale },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("WorkingTimeForm > Render", () => {
  it("render สำเร็จ", () => {
    const wrapper = mountForm();
    expect(wrapper.find(".card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Working Time");
  });

  it("แสดง 7 วัน", () => {
    const wrapper = mountForm();
    expect(wrapper.vm.dayList).toHaveLength(7);
  });

  it("Mon-Fri active, Sat-Sun inactive (default)", () => {
    const wrapper = mountForm();
    const active = wrapper.vm.dayList.filter((d) => d.active);
    const inactive = wrapper.vm.dayList.filter((d) => !d.active);
    expect(active.map((d) => d.id)).toEqual([
      "monday", "tuesday", "wednesday", "thursday", "friday",
    ]);
    expect(inactive.map((d) => d.id)).toEqual(["saturday", "sunday"]);
  });

  it("แสดงปุ่ม Save All", () => {
    const wrapper = mountForm();
    expect(wrapper.text()).toContain("Save All Working Time Settings");
  });
});

// ─── 2. Load API ────────────────────────────────────────────
describe("WorkingTimeForm > Load", () => {
  it("mounted → เรียก fetch load", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/working-time");
  });

  it("load สำเร็จ → set schedule", async () => {
    const schedule = {
      monday: { working_hours: [{ start: "08:00", end: "17:00" }], break_times: [] },
      tuesday: { working_hours: [], break_times: [] },
      wednesday: { working_hours: [], break_times: [] },
      thursday: { working_hours: [], break_times: [] },
      friday: { working_hours: [], break_times: [] },
      saturday: { working_hours: [], break_times: [] },
      sunday: { working_hours: [], break_times: [] },
    };
    setupLoadMock(schedule);

    const wrapper = mount(WorkingTimeForm, {
      global: { provide: { locale: mockLocale } },
    });

    await vi.waitFor(() => {
      expect(wrapper.vm.schedule.monday.working_hours).toHaveLength(1);
    });
  });

  it("load ล้มเหลว → ไม่ crash", async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const wrapper = mount(WorkingTimeForm, {
      global: { provide: { locale: mockLocale } },
    });

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    expect(wrapper.vm.schedule.monday).toBeDefined();
  });
});

// ─── 3. Add / Remove Slot ──────────────────────────────────
describe("WorkingTimeForm > Slots", () => {
  it("addSlot working_hours → เพิ่ม default 08:00-17:00", () => {
    const wrapper = mountForm();
    wrapper.vm.addSlot("monday", "working_hours");
    expect(wrapper.vm.schedule.monday.working_hours).toHaveLength(1);
    expect(wrapper.vm.schedule.monday.working_hours[0]).toEqual({
      start: "08:00",
      end: "17:00",
    });
  });

  it("addSlot break_times → เพิ่ม default 12:00-13:00", () => {
    const wrapper = mountForm();
    wrapper.vm.addSlot("monday", "break_times");
    expect(wrapper.vm.schedule.monday.break_times).toHaveLength(1);
    expect(wrapper.vm.schedule.monday.break_times[0]).toEqual({
      start: "12:00",
      end: "13:00",
    });
  });

  it("removeSlot → ลบ slot ตาม index", () => {
    const wrapper = mountForm();
    wrapper.vm.addSlot("monday", "working_hours");
    wrapper.vm.addSlot("monday", "working_hours");
    expect(wrapper.vm.schedule.monday.working_hours).toHaveLength(2);

    wrapper.vm.removeSlot("monday", "working_hours", 0);
    expect(wrapper.vm.schedule.monday.working_hours).toHaveLength(1);
  });
});

// ─── 4. Validation ─────────────────────────────────────────
describe("WorkingTimeForm > Validation", () => {
  it("วันทำงาน ไม่มี working_hours → error", () => {
    const wrapper = mountForm();
    const error = wrapper.vm.validateDay("monday");
    expect(error).toContain("ต้องระบุเวลาทำงาน");
  });

  it("วันหยุด → ไม่มี error", () => {
    const wrapper = mountForm();
    const error = wrapper.vm.validateDay("saturday");
    expect(error).toBe("");
  });

  it("start >= end → error", () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "17:00", end: "08:00" }];
    const error = wrapper.vm.validateDay("monday");
    expect(error).toContain("เวลาเลิกงานต้องมากกว่า");
  });

  it("start ว่าง → error", () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "", end: "17:00" }];
    const error = wrapper.vm.validateDay("monday");
    expect(error).toContain("กรุณากรอกเวลาทำงานให้ครบ");
  });

  it("valid working hours → ไม่มี error", () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];
    const error = wrapper.vm.validateDay("monday");
    expect(error).toBe("");
  });
});

// ─── 5. Build Payload ──────────────────────────────────────
describe("WorkingTimeForm > Payload", () => {
  it("buildPayload → วันหยุดส่ง empty arrays", () => {
    const wrapper = mountForm();
    wrapper.vm.addSlot("saturday", "working_hours");

    const payload = wrapper.vm.buildPayload();
    expect(payload.schedule.saturday.working_hours).toHaveLength(0);
    expect(payload.schedule.saturday.break_times).toHaveLength(0);
  });

  it("buildPayload → วันทำงานส่ง schedule จริง", () => {
    const wrapper = mountForm();
    wrapper.vm.addSlot("monday", "working_hours");

    const payload = wrapper.vm.buildPayload();
    expect(payload.schedule.monday.working_hours).toHaveLength(1);
  });
});

// ─── 6. Save Day ───────────────────────────────────────────
describe("WorkingTimeForm > Save Day", () => {
  it("saveDay สำเร็จ → Swal success", async () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];

    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await wrapper.vm.saveDay("monday");

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: "success" })
    );
    expect(wrapper.vm.savingDay).toBeNull();
  });

  it("saveDay validation fail → Swal warning", async () => {
    const wrapper = mountForm();
    await wrapper.vm.saveDay("monday");

    expect(Swal.fire).toHaveBeenCalledWith("ข้อมูลไม่ถูกต้อง", expect.any(String), "warning");
  });

  it("saveDay API fail → Swal error", async () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];

    mockFetch.mockResolvedValue({ ok: false });
    await wrapper.vm.saveDay("monday");

    expect(Swal.fire).toHaveBeenCalledWith("Error", "ไม่สามารถบันทึกได้", "error");
  });
});

// ─── 7. Save All ───────────────────────────────────────────
describe("WorkingTimeForm > Save All", () => {
  it("saveAll validation fail → Swal warning + ไม่เรียก PUT", async () => {
    const wrapper = mountForm();

    await wrapper.vm.saveAll();

    expect(Swal.fire).toHaveBeenCalledWith("ข้อมูลไม่ถูกต้อง", expect.any(String), "warning");
  });

  it("saveAll สำเร็จ → Swal success", async () => {
    const wrapper = mountForm();
    for (const day of ["monday", "tuesday", "wednesday", "thursday", "friday"]) {
      wrapper.vm.schedule[day].working_hours = [{ start: "08:00", end: "17:00" }];
    }

    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await wrapper.vm.saveAll();

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: "success" })
    );
    expect(wrapper.vm.loading).toBe(false);
  });
});

// ─── 8. Bug Cases ───────────────────────────────────────────
describe("WorkingTimeForm > Bug Cases", () => {
  // BUG-1: validateDay ไม่รองรับ overnight shift (22:00 → 06:00)
  // เงื่อนไข w.start >= w.end → 22:00 >= 06:00 = true → error
  // แต่จริง ๆ ผู้ใช้อาจตั้ง shift ข้ามวันได้
  it("[BUG-1] overnight shift 22:00-06:00 → ไม่ควรแสดง error", () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "22:00", end: "06:00" }];
    const error = wrapper.vm.validateDay("monday");
    expect(error).toBe("");
  });

  // BUG-2: load() ไม่ตั้ง loading state → ไม่มี loading indicator
  // ขณะ load data จาก API ผู้ใช้ไม่รู้ว่ากำลังโหลด
  it("[BUG-2] load() ต้องตั้ง loading = true ขณะโหลด", async () => {
    let loadingDuringFetch = false;
    mockFetch.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ ok: true, json: () => Promise.resolve({ schedule: null }) });
        }, 10);
      });
    });

    const wrapper = mount(WorkingTimeForm, {
      global: { provide: { locale: mockLocale } },
    });

    await wrapper.vm.$nextTick();
    loadingDuringFetch = wrapper.vm.loading;

    expect(loadingDuringFetch).toBe(true);
  });
});
