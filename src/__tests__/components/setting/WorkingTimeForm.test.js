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

// ═══════════════════════════════════════════════════════════
// 1. Render
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 2. Load API
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 3. Add / Remove Slot
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 4. Validation
// ═══════════════════════════════════════════════════════════
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

  it("end ว่าง → error", () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "" }];
    const error = wrapper.vm.validateDay("monday");
    expect(error).toContain("กรุณากรอกเวลาทำงานให้ครบ");
  });

  it("valid working hours → ไม่มี error", () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];
    const error = wrapper.vm.validateDay("monday");
    expect(error).toBe("");
  });

  it("หลาย slots ทุก slot valid → ไม่มี error", () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [
      { start: "08:00", end: "12:00" },
      { start: "13:00", end: "17:00" },
    ];
    const error = wrapper.vm.validateDay("monday");
    expect(error).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════
// 5. Build Payload
// ═══════════════════════════════════════════════════════════
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

  it("buildPayload → ครบ 7 วัน", () => {
    const wrapper = mountForm();
    const payload = wrapper.vm.buildPayload();
    const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
    for (const day of days) {
      expect(payload.schedule[day]).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 6. Save Day
// ═══════════════════════════════════════════════════════════
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

  it("saveDay → ตั้ง savingDay ระหว่าง save", async () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];
    let savingDuringFetch = null;
    mockFetch.mockImplementation(() => {
      savingDuringFetch = wrapper.vm.savingDay;
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    await wrapper.vm.saveDay("monday");
    expect(savingDuringFetch).toBe("monday");
    expect(wrapper.vm.savingDay).toBeNull(); // reset in finally
  });

  it("saveDay → fetch PUT กับ /api/working-time", async () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await wrapper.vm.saveDay("monday");
    const putCall = mockFetch.mock.calls.find(([, opts]) => opts?.method === "PUT");
    expect(putCall[0]).toContain("/api/working-time");
  });
});

// ═══════════════════════════════════════════════════════════
// 7. Save All
// ═══════════════════════════════════════════════════════════
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

  it("saveAll API fail → Swal error + loading = false (line 224)", async () => {
    const wrapper = mountForm();
    for (const day of ["monday", "tuesday", "wednesday", "thursday", "friday"]) {
      wrapper.vm.schedule[day].working_hours = [{ start: "08:00", end: "17:00" }];
    }
    mockFetch.mockResolvedValue({ ok: false });
    await wrapper.vm.saveAll();
    expect(Swal.fire).toHaveBeenCalledWith("Error", "เกิดข้อผิดพลาด", "error");
    expect(wrapper.vm.loading).toBe(false);
  });

  it("saveAll → วน validate ทุกวัน (error วันที่ 2 ก็หยุด)", async () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];
    // tuesday active แต่ไม่มี working_hours → จะ error ที่ tuesday
    await wrapper.vm.saveAll();
    expect(Swal.fire).toHaveBeenCalledWith(
      "ข้อมูลไม่ถูกต้อง",
      expect.stringContaining("tuesday"),
      "warning"
    );
  });
});

// ═══════════════════════════════════════════════════════════
// 8. Render Additions (spinner states + off day)
// ═══════════════════════════════════════════════════════════
describe("WorkingTimeForm > Render Additions", () => {
  it("Off day (saturday inactive) → แสดง 'Weekly day off'", () => {
    const wrapper = mountForm();
    expect(wrapper.text()).toContain("Weekly day off");
  });

  it("loading = true → spinner ใน Save All button (line 98)", async () => {
    const wrapper = mountForm();
    wrapper.vm.loading = true;
    await wrapper.vm.$nextTick();
    const saveAllBtn = wrapper.find(".btn-success.w-100");
    expect(saveAllBtn.find(".spinner-border").exists()).toBe(true);
  });

  it("loading = true → text 'Saving...' ใน Save All button", async () => {
    const wrapper = mountForm();
    wrapper.vm.loading = true;
    await wrapper.vm.$nextTick();
    const saveAllBtn = wrapper.find(".btn-success.w-100");
    expect(saveAllBtn.text()).toContain("Saving...");
  });

  it("savingDay = 'monday' → spinner แสดงใน monday card (line 86)", async () => {
    const wrapper = mountForm();
    wrapper.vm.savingDay = "monday";
    await wrapper.vm.$nextTick();
    const mondayCard = wrapper.findAll(".day-row")[0];
    expect(mondayCard.find(".spinner-border").exists()).toBe(true);
  });

  it("savingDay = 'monday' → ปุ่ม monday disabled, ปุ่มอื่นไม่ disabled", async () => {
    const wrapper = mountForm();
    wrapper.vm.savingDay = "monday";
    await wrapper.vm.$nextTick();
    const saveDayBtns = wrapper.findAll(".btn-light.text-success");
    expect(saveDayBtns[0].attributes("disabled")).toBeDefined();   // monday = disabled
    expect(saveDayBtns[1].attributes("disabled")).toBeUndefined(); // tuesday = not disabled
  });

  it("loading = false → ไม่มี spinner ใน Save All button (v-else check icon)", async () => {
    const wrapper = mountForm();
    wrapper.vm.loading = false;
    await wrapper.vm.$nextTick();
    const saveAllBtn = wrapper.find(".btn-success.w-100");
    expect(saveAllBtn.find(".spinner-border").exists()).toBe(false);
    expect(saveAllBtn.text()).toContain("Save All Working Time Settings");
  });
});

// ═══════════════════════════════════════════════════════════
// 9. DOM Interactions (template compiled functions)
// ═══════════════════════════════════════════════════════════
describe("WorkingTimeForm > DOM Interactions", () => {
  it("DOM: checkbox day.active toggle → v-model setter (monday inactive)", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    const mondayCard = wrapper.findAll(".day-row")[0];
    const checkbox = mondayCard.find(".form-check-input");
    expect(wrapper.vm.dayList[0].active).toBe(true);
    await checkbox.setChecked(false);
    expect(wrapper.vm.dayList[0].active).toBe(false);
  });

  it("DOM: checkbox day.active toggle → v-model setter (saturday active)", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    const saturdayCard = wrapper.findAll(".day-row")[5]; // saturday = index 5
    const checkbox = saturdayCard.find(".form-check-input");
    expect(wrapper.vm.dayList[5].active).toBe(false);
    await checkbox.setChecked(true);
    expect(wrapper.vm.dayList[5].active).toBe(true);
  });

  it("DOM: คลิก 'Add Shift' button → template handler เรียก addSlot working_hours", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    const mondayCard = wrapper.findAll(".day-row")[0];
    await mondayCard.find(".btn-primary-light").trigger("click");
    expect(wrapper.vm.schedule.monday.working_hours).toHaveLength(1);
    expect(wrapper.vm.schedule.monday.working_hours[0]).toEqual({ start: "08:00", end: "17:00" });
  });

  it("DOM: คลิก 'Add Break' button → template handler เรียก addSlot break_times", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    const mondayCard = wrapper.findAll(".day-row")[0];
    await mondayCard.find(".btn-outline-secondary").trigger("click");
    expect(wrapper.vm.schedule.monday.break_times).toHaveLength(1);
    expect(wrapper.vm.schedule.monday.break_times[0]).toEqual({ start: "12:00", end: "13:00" });
  });

  it("DOM: time input working_hours start → v-model setter ทำงาน", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];
    await wrapper.vm.$nextTick();
    const mondayCard = wrapper.findAll(".day-row")[0];
    const timeInputs = mondayCard.findAll("input[type='time']");
    await timeInputs[0].setValue("09:00");
    expect(wrapper.vm.schedule.monday.working_hours[0].start).toBe("09:00");
  });

  it("DOM: time input working_hours end → v-model setter ทำงาน", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];
    await wrapper.vm.$nextTick();
    const mondayCard = wrapper.findAll(".day-row")[0];
    const timeInputs = mondayCard.findAll("input[type='time']");
    await timeInputs[1].setValue("18:00");
    expect(wrapper.vm.schedule.monday.working_hours[0].end).toBe("18:00");
  });

  it("DOM: คลิก remove working_hours button → removeSlot template handler", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];
    await wrapper.vm.$nextTick();
    const mondayCard = wrapper.findAll(".day-row")[0];
    await mondayCard.find(".btn-outline-danger").trigger("click");
    expect(wrapper.vm.schedule.monday.working_hours).toHaveLength(0);
  });

  it("DOM: time input break_times start → v-model setter ทำงาน", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    // working_hours ว่าง → break_times inputs เป็น [0] และ [1] ในการ์ดนี้
    wrapper.vm.schedule.monday.break_times = [{ start: "12:00", end: "13:00" }];
    await wrapper.vm.$nextTick();
    const mondayCard = wrapper.findAll(".day-row")[0];
    const timeInputs = mondayCard.findAll("input[type='time']");
    await timeInputs[0].setValue("11:30");
    expect(wrapper.vm.schedule.monday.break_times[0].start).toBe("11:30");
  });

  it("DOM: time input break_times end → v-model setter ทำงาน", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    wrapper.vm.schedule.monday.break_times = [{ start: "12:00", end: "13:00" }];
    await wrapper.vm.$nextTick();
    const mondayCard = wrapper.findAll(".day-row")[0];
    const timeInputs = mondayCard.findAll("input[type='time']");
    await timeInputs[1].setValue("14:00");
    expect(wrapper.vm.schedule.monday.break_times[0].end).toBe("14:00");
  });

  it("DOM: คลิก remove break_times button → removeSlot template handler", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    wrapper.vm.schedule.monday.break_times = [{ start: "12:00", end: "13:00" }];
    await wrapper.vm.$nextTick();
    const mondayCard = wrapper.findAll(".day-row")[0];
    await mondayCard.find(".btn-outline-danger").trigger("click");
    expect(wrapper.vm.schedule.monday.break_times).toHaveLength(0);
  });

  it("DOM: both working_hours and break_times slots → time inputs index ถูกต้อง", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];
    wrapper.vm.schedule.monday.break_times = [{ start: "12:00", end: "13:00" }];
    await wrapper.vm.$nextTick();
    const mondayCard = wrapper.findAll(".day-row")[0];
    const timeInputs = mondayCard.findAll("input[type='time']");
    expect(timeInputs).toHaveLength(4); // 2 working + 2 break
    await timeInputs[2].setValue("11:00"); // break_times[0].start
    expect(wrapper.vm.schedule.monday.break_times[0].start).toBe("11:00");
  });

  it("DOM: คลิก saveDay button ใน monday card → saveDay template handler", async () => {
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.method === "PUT") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ schedule: null }) });
    });
    const wrapper = mount(WorkingTimeForm, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];
    await wrapper.vm.$nextTick();
    const spy = vi.spyOn(wrapper.vm, "saveDay");
    const mondayCard = wrapper.findAll(".day-row")[0];
    await mondayCard.find(".btn-light.text-success").trigger("click");
    expect(spy).toHaveBeenCalledWith("monday");
  });

  it("DOM: คลิก 'Save All' button → saveAll template handler", async () => {
    const wrapper = mountForm();
    await vi.waitFor(() => expect(wrapper.vm.loading).toBe(false));
    const spy = vi.spyOn(wrapper.vm, "saveAll");
    await wrapper.find(".btn-success.w-100").trigger("click");
    expect(spy).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// 10. Bug Cases (PASS) — เดิม
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 11. Bug Cases (FAIL — อันตราย ยังไม่แก้ component)
// ═══════════════════════════════════════════════════════════
describe("WorkingTimeForm > Bug Cases (FAIL)", () => {

  // BUG-3: saveAll/saveDay success Swal.fire({ title: "สำเร็จ" }) hardcoded Thai ไม่ locale-aware
  // อันตราย: component มี locale inject และใช้ locale.t() ใน template ทุกข้อความ
  //          แต่ Swal success ใน saveAll: title = "สำเร็จ" hardcoded Thai ไม่ผ่าน locale
  //          → EN mode ผู้ใช้เห็น "สำเร็จ" แทน "Success"
  //          → UX inconsistent กับ component อื่น ๆ ที่ใช้ swalHelper locale-aware
  //          → ถ้าขยาย app ไปตลาด EN หรือ internationalization audit จะตรวจพบปัญหา
  //          → automated i18n test จะ fail เฉพาะใน EN mode ซึ่งอาจถูก skip ใน dev env ไทย
  // FAIL เพราะ: Swal.fire({ title: "สำเร็จ" }) ไม่ใช่ "Success" ใน EN mode
  it("[BUG-3] saveAll success Swal title ควรเป็น 'Success' ใน EN mode (FAIL)", async () => {
    const wrapper = mountForm();
    for (const day of ["monday", "tuesday", "wednesday", "thursday", "friday"]) {
      wrapper.vm.schedule[day].working_hours = [{ start: "08:00", end: "17:00" }];
    }
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await wrapper.vm.saveAll();

    // คาดหวัง: EN mode → Swal success title = "Success"
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Success" })
    );
    // FAIL: component calls Swal.fire({ title: "สำเร็จ", ... }) hardcoded Thai
  });

  // BUG-4: load() crash เมื่อ API ส่ง schedule ไม่ครบทุกวัน (partial schedule)
  // อันตราย: this.schedule = data.schedule → schedule ไม่มี wednesday
  //          → this.schedule["wednesday"].working_hours → TypeError: Cannot read properties of undefined
  //          → component พังทั้งหน้า, console error, ผู้ใช้ไม่สามารถแก้ไข working time ได้เลย
  //          → เกิดได้ถ้า: backend ทำ migration ไม่ครบ, first-time setup, partial DB record
  //          → ปัญหาจะเกิดใน production ก่อน QA จะ detect เพราะ dev env มี seed data ครบ
  //          → โรงงานไม่สามารถบันทึกเวลาทำงานได้จนกว่าจะ fix และ redeploy
  // FAIL เพราะ: this.schedule["wednesday"] = undefined → .working_hours → TypeError crash
  it("[BUG-4] load() crash เมื่อ API ส่ง schedule ไม่ครบทุกวัน (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const partialSchedule = {
      monday: { working_hours: [{ start: "08:00", end: "17:00" }], break_times: [] },
      tuesday: { working_hours: [], break_times: [] },
      // ขาด wednesday, thursday, friday, saturday, sunday
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ schedule: partialSchedule }),
    });
    const wrapper = mount(WorkingTimeForm, { global: { provide: { locale: mockLocale } } });
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // flush microtasks
    await Promise.resolve();
    await Promise.resolve();

    // คาดหวัง: component ไม่ crash, schedule ครบ 7 วัน
    expect(wrapper.vm.schedule.wednesday).toBeDefined();
    expect(wrapper.vm.schedule.friday).toBeDefined();
    // FAIL: this.schedule = partialSchedule → schedule["wednesday"] = undefined
    //       → d.active = (undefined.working_hours && ...) → TypeError
    consoleSpy.mockRestore();
  });

  // BUG-5: validateDay อนุญาต start = end = "22:00" (zero-duration shift)
  // อันตราย: condition: w.start >= w.end && w.start < "22:00"
  //          → start=end="22:00": "22:00" >= "22:00" (TRUE) && "22:00" < "22:00" (FALSE)
  //          → condition = FALSE → ไม่ throw error → ผู้ใช้ save shift ที่ duration = 0
  //          → OEE calculation: working_time_minutes = 0 → efficiency = produced / 0 → NaN/Infinity
  //          → รายงาน KPI dashboard พัง แสดงค่า NaN ใน efficiency metrics
  //          → ถ้า scheduler ใช้ working_time สำหรับ machine availability → คำนวณผิด
  //          → อาจทำให้ production planning ผิดพลาด เช่น over-schedule หรือ under-schedule
  // FAIL เพราะ: "22:00" >= "22:00" && "22:00" < "22:00" = TRUE && FALSE = FALSE → return ""
  it("[BUG-5] validateDay: start = end = '22:00' ควรให้ error (zero-duration) (FAIL)", () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "22:00", end: "22:00" }];
    const error = wrapper.vm.validateDay("monday");

    // คาดหวัง: zero-duration shift ควรให้ error (duration = 0 ชั่วโมง)
    expect(error).not.toBe("");
    // FAIL: condition (start >= end && start < "22:00") = (true && false) = false
    //       → ไม่ return error → ผู้ใช้ save shift ที่มีระยะเวลา 0
  });

  // BUG-6: saveDay(dayId) ส่ง full buildPayload() (ทุกวัน) ไม่ใช่แค่วันที่ระบุ
  // อันตราย: saveDay("monday") เรียก buildPayload() ซึ่งรวม schedule ของทุก 7 วัน
  //          → overwrite ข้อมูลวันอื่นด้วย current client state
  //          → ถ้า User A แก้ monday และ User B แก้ tuesday พร้อมกัน:
  //            User A saveDay("monday") → overwrite tuesday ของ User B ไปด้วย
  //          → Data loss ที่ไม่แสดง error ให้ผู้ใช้รู้
  //          → โรงงานที่มีหลาย admin แก้ schedule พร้อมกันจะสูญเสียข้อมูลโดยไม่รู้ตัว
  //          → ควรส่งแค่ { schedule: { [dayId]: schedule[dayId] } } หรือ endpoint per-day
  // FAIL เพราะ: buildPayload() ส่ง 7 วัน → body.schedule มีทุกวัน ไม่ใช่แค่ monday
  it("[BUG-6] saveDay('monday') ส่ง payload ทุกวัน ไม่ใช่แค่ monday (FAIL)", async () => {
    const wrapper = mountForm();
    wrapper.vm.schedule.monday.working_hours = [{ start: "08:00", end: "17:00" }];
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await wrapper.vm.saveDay("monday");

    const putCall = mockFetch.mock.calls.find(([, opts]) => opts?.method === "PUT");
    expect(putCall).toBeTruthy();
    const body = JSON.parse(putCall[1].body);

    // คาดหวัง: saveDay("monday") ส่งแค่ monday เพื่อไม่ overwrite วันอื่น
    expect(Object.keys(body.schedule)).toEqual(["monday"]);
    // FAIL: body.schedule มีทุกวัน (monday, tuesday, ..., sunday) = 7 วัน
  });
});
