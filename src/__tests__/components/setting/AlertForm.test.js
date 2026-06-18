import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import AlertForm from "../../../components/setting/AlertForm.vue";

// ─── Mock fetch & localStorage ──────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("localStorage", {
  getItem: () => "fake-token",
  setItem: () => {},
});

const baseAlarm = {
  name: "High Temp",
  condition_type: "MTE",
  min_value: 80,
  max_value: 0,
  severity: "Warning",
  notify_email: false,
  email_recipients: [],
  is_active: true,
};

function mountForm(props = {}) {
  return mount(AlertForm, {
    props: {
      modelValue: [],
      dataType: "number",
      levelLabels: [],
      numberConfig: null,
      levels: [],
      ...props,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("AlertForm > Render", () => {
  it("render สำเร็จ — ไม่มี alarm", () => {
    const wrapper = mountForm();
    expect(wrapper.find(".card").exists()).toBe(true);
    expect(wrapper.text()).toContain("Alarm Settings");
  });

  it("แสดงปุ่ม เพิ่มเงื่อนไขการเตือน", () => {
    const wrapper = mountForm();
    expect(wrapper.text()).toContain("เพิ่มเงื่อนไขการเตือน");
  });

  it("มี alarm → แสดง alarm rows", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm }, { ...baseAlarm, name: "Low Temp" }],
    });
    const rows = wrapper.findAll(".border-bottom");
    expect(rows.length).toBe(2);
  });
});

// ─── 2. Add / Remove ───────────────────────────────────────
describe("AlertForm > Add / Remove", () => {
  it("addAlarm → emit update:modelValue พร้อม alarm ใหม่", async () => {
    const wrapper = mountForm({ modelValue: [] });
    await wrapper.find("button").trigger("click");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0]).toHaveLength(1);
    expect(emitted[0][0][0].name).toBe("");
  });

  it("addAlarm (onoff) → condition_type = EXACT, min_value = 1", async () => {
    const wrapper = mountForm({ modelValue: [], dataType: "onoff" });
    wrapper.vm.addAlarm();

    const emitted = wrapper.emitted("update:modelValue");
    const newAlarm = emitted[0][0][0];
    expect(newAlarm.condition_type).toBe("EXACT");
    expect(newAlarm.min_value).toBe(1);
  });

  it("removeAlarm → emit update:modelValue ลบ alarm + emit remove-alarm ถ้ามี id", () => {
    const alarms = [
      { ...baseAlarm, id: 10 },
      { ...baseAlarm, name: "Low", id: 20 },
    ];
    const wrapper = mountForm({ modelValue: alarms });
    wrapper.vm.removeAlarm(0);

    const emitUpdate = wrapper.emitted("update:modelValue");
    expect(emitUpdate[0][0]).toHaveLength(1);
    expect(emitUpdate[0][0][0].name).toBe("Low");

    const emitRemove = wrapper.emitted("remove-alarm");
    expect(emitRemove[0][0]).toBe(10);
  });

  it("removeAlarm ไม่มี id → ไม่ emit remove-alarm", () => {
    const wrapper = mountForm({ modelValue: [{ ...baseAlarm }] });
    wrapper.vm.removeAlarm(0);

    expect(wrapper.emitted("remove-alarm")).toBeFalsy();
  });
});

// ─── 3. Validation ─────────────────────────────────────────
describe("AlertForm > Validation", () => {
  it("ชื่อว่าง → error", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, name: "" }],
    });
    const result = wrapper.vm.validateAlarms();
    expect(result).toBe(false);
    expect(wrapper.vm.errors.length).toBeGreaterThan(0);
    expect(wrapper.vm.errors[0].field).toBe("name");
  });

  it("ชื่อซ้ำกัน → error", () => {
    const wrapper = mountForm({
      modelValue: [
        { ...baseAlarm, name: "Same" },
        { ...baseAlarm, name: "Same" },
      ],
    });
    const result = wrapper.vm.validateAlarms();
    expect(result).toBe(false);
    const nameErrors = wrapper.vm.errors.filter((e) => e.field === "name");
    expect(nameErrors.length).toBe(2);
  });

  it("BTW: min >= max → error", () => {
    const wrapper = mountForm({
      modelValue: [
        { ...baseAlarm, condition_type: "BTW", min_value: 100, max_value: 50 },
      ],
    });
    const result = wrapper.vm.validateAlarms();
    expect(result).toBe(false);
    expect(wrapper.vm.errors.some((e) => e.field === "threshold")).toBe(true);
  });

  it("valid alarms → ไม่มี error", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, name: "Alarm1" }],
    });
    const result = wrapper.vm.validateAlarms();
    expect(result).toBe(true);
    expect(wrapper.vm.errors).toHaveLength(0);
  });
});

// ─── 4. Overlap Detection ──────────────────────────────────
describe("AlertForm > Overlap", () => {
  it("ช่วงทับซ้อน → error", () => {
    const wrapper = mountForm({
      modelValue: [
        { ...baseAlarm, name: "A", condition_type: "BTW", min_value: 0, max_value: 50 },
        { ...baseAlarm, name: "B", condition_type: "BTW", min_value: 30, max_value: 80 },
      ],
    });
    const result = wrapper.vm.validateAlarms();
    expect(result).toBe(false);
  });

  it("ช่วงไม่ทับ → ไม่มี error", () => {
    const wrapper = mountForm({
      modelValue: [
        { ...baseAlarm, name: "A", condition_type: "BTW", min_value: 0, max_value: 30 },
        { ...baseAlarm, name: "B", condition_type: "BTW", min_value: 30, max_value: 80 },
      ],
    });
    const result = wrapper.vm.validateAlarms();
    expect(result).toBe(true);
  });

  it("getRange EXACT → range แคบมาก", () => {
    const wrapper = mountForm();
    const range = wrapper.vm.getRange({ condition_type: "EXACT", min_value: 50, max_value: 0 });
    expect(range.min).toBe(50);
    expect(range.max).toBeCloseTo(50.0001);
  });
});

// ─── 5. dataType Behavior ──────────────────────────────────
describe("AlertForm > Data Type", () => {
  it("onoff → condition select disabled", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm }],
      dataType: "onoff",
    });
    const select = wrapper.find("select");
    expect(select.attributes("disabled")).toBeDefined();
  });

  it("onoff → แสดง ON/OFF select แทน number input", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, min_value: 1 }],
      dataType: "onoff",
    });
    expect(wrapper.text()).toContain("ON");
    expect(wrapper.text()).toContain("OFF");
  });
});

// ─── 6. Email Update ───────────────────────────────────────
describe("AlertForm > Email", () => {
  it("updateEmails → แยก comma + trim", () => {
    const alarms = [{ ...baseAlarm, notify_email: true, email_recipients: [] }];
    const wrapper = mountForm({ modelValue: alarms });
    wrapper.vm.updateEmails(0, "a@b.com, c@d.com , e@f.com");

    const emitted = wrapper.emitted("update:modelValue");
    const updated = emitted[0][0][0].email_recipients;
    expect(updated).toEqual(["a@b.com", "c@d.com", "e@f.com"]);
  });

  it("updateEmails ค่าว่าง → array ว่าง", () => {
    const wrapper = mountForm({ modelValue: [{ ...baseAlarm }] });
    wrapper.vm.updateEmails(0, "");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted[0][0][0].email_recipients).toEqual([]);
  });
});

// ─── 7. Save Alarms API ────────────────────────────────────
describe("AlertForm > Save API", () => {
  it("saveAlarms → เรียก fetch POST สำหรับแต่ละ alarm", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    const wrapper = mountForm({
      modelValue: [
        { ...baseAlarm, name: "A" },
        { ...baseAlarm, name: "B" },
      ],
    });
    await wrapper.vm.saveAlarms(99);

    const postCalls = mockFetch.mock.calls.filter(
      ([url]) => url.includes("/api/addresses/99/alarms")
    );
    expect(postCalls).toHaveLength(2);
  });

  it("saveAlarms ไม่มี alarm → ไม่เรียก fetch", async () => {
    const wrapper = mountForm({ modelValue: [] });
    await wrapper.vm.saveAlarms(99);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─── 8. Bug Cases ───────────────────────────────────────────
describe("AlertForm > Bug Cases", () => {
  // BUG-1: saveAlarms ไม่เช็ค response status
  // ถ้า API return !res.ok → ไม่ throw error → alarm ถูกข้ามเงียบ ๆ
  // ควรเช็ค res.ok แล้ว throw ถ้า fail
  it("[BUG-1] saveAlarms API ล้มเหลว → ต้อง throw error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, name: "Fail" }],
    });

    await expect(wrapper.vm.saveAlarms(99)).rejects.toThrow();
  });
});
