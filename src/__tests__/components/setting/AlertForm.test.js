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

// ─── 9. Default Prop Factories ─────────────────────────────
describe("AlertForm > Default Prop Factories", () => {
  // fn1 L126, fn2 L128, fn3 L130: default: () => [] ถูกเรียกเมื่อไม่ส่ง prop
  it("mount ไม่ส่ง modelValue/levelLabels/levels → default [] ทุกอัน", () => {
    const { mount: m } = require("@vue/test-utils");
    const wrapper = m(AlertForm, { props: {} });
    expect(Array.isArray(wrapper.vm.modelValue)).toBe(true);
    expect(Array.isArray(wrapper.vm.levelLabels)).toBe(true);
    expect(Array.isArray(wrapper.vm.levels)).toBe(true);
  });
});

// ─── 10. validateWithError ────────────────────────────────
describe("AlertForm > validateWithError", () => {
  // b3[0]: isValid=false → throw
  it("validateWithError: alarm ไม่ valid → throw", () => {
    const wrapper = mountForm({ modelValue: [{ ...baseAlarm, name: "" }] });
    expect(() => wrapper.vm.validateWithError()).toThrow("การตั้งค่า Alarm ไม่ถูกต้อง");
  });

  // b3[1]: isValid=true → ไม่ throw
  it("validateWithError: alarm valid → ไม่ throw", () => {
    const wrapper = mountForm({ modelValue: [{ ...baseAlarm }] });
    expect(() => wrapper.vm.validateWithError()).not.toThrow();
  });
});

// ─── 11. saveAllConfigs ────────────────────────────────────
describe("AlertForm > saveAllConfigs", () => {
  // b4[0]+b5[0]: dataType=number + numberConfig → POST number-config
  it("dataType=number + numberConfig → POST number-config", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm }],
      dataType: "number",
      numberConfig: { decimals: 2 },
    });
    await wrapper.vm.saveAllConfigs(10);
    const call = mockFetch.mock.calls.find(([url]) => url.includes("number-config"));
    expect(call).toBeTruthy();
  });

  // b5[1]: dataType=number_gauge → POST number-config
  it("dataType=number_gauge + numberConfig → POST number-config", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm }],
      dataType: "number_gauge",
      numberConfig: { decimals: 1 },
    });
    await wrapper.vm.saveAllConfigs(11);
    const call = mockFetch.mock.calls.find(([url]) => url.includes("number-config"));
    expect(call).toBeTruthy();
  });

  // b4[0] false: dataType=number แต่ numberConfig=null → skip
  it("dataType=number, numberConfig=null → ไม่ POST number-config", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mountForm({ modelValue: [], dataType: "number", numberConfig: null });
    await wrapper.vm.saveAllConfigs(12);
    const call = mockFetch.mock.calls.find(([url]) => url.includes("number-config"));
    expect(call).toBeFalsy();
  });

  // b6[0]: dataType=level + levels → POST levels + GET levels + map alarms
  it("dataType=level → POST levels, GET levels, map level_index, emit update", async () => {
    const savedLevels = [{ label: "High", level_index: 2 }];
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })   // POST levels
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(savedLevels) }) // GET levels
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });  // POST alarm
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, level_label: "High" }],
      dataType: "level",
      levels: [{ label: "High", min_value: 80 }],
    });
    await wrapper.vm.saveAllConfigs(20);
    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0][0].level_index).toBe(2);
  });

  // b8[0] false: modelValue ว่างขณะ level → ไม่ map ไม่ emit
  it("dataType=level, modelValue=[] → ไม่ emit update:modelValue", async () => {
    const savedLevels = [{ label: "High", level_index: 2 }];
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(savedLevels) });
    const wrapper = mountForm({ modelValue: [], dataType: "level", levels: [{ label: "High" }] });
    await wrapper.vm.saveAllConfigs(21);
    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
  });

  // b10[1]: alarm ไม่มี level_label → return alarm ตัวเดิม
  it("dataType=level, alarm ไม่มี level_label → level_index ไม่เปลี่ยน", async () => {
    const savedLevels = [{ label: "High", level_index: 2 }];
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(savedLevels) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm }], // ไม่มี level_label
      dataType: "level",
      levels: [{ label: "High" }],
    });
    await wrapper.vm.saveAllConfigs(22);
    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted[0][0][0].level_index).toBeUndefined();
  });

  // b11[1]: level_label มีแต่ไม่ match saved levels → return alarm ตัวเดิม
  it("dataType=level, level_label ไม่ match saved → ไม่อัป level_index", async () => {
    const savedLevels = [{ label: "Low", level_index: 1 }];
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(savedLevels) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, level_label: "High" }], // "High" ไม่ match "Low"
      dataType: "level",
      levels: [{ label: "High" }],
    });
    await wrapper.vm.saveAllConfigs(23);
    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted[0][0][0].level_index).toBeUndefined();
  });
});

// ─── 12. getRange switch cases ────────────────────────────
describe("AlertForm > getRange", () => {
  // b29[1]: MT → min = v1+0.0001, max = Infinity
  it("getRange MT → min exclusive", () => {
    const wrapper = mountForm();
    const r = wrapper.vm.getRange({ condition_type: "MT", min_value: 50, max_value: 0 });
    expect(r.min).toBeCloseTo(50.0001);
    expect(r.max).toBe(Infinity);
  });

  // b29[2]: MTE → min = v1
  it("getRange MTE → min inclusive", () => {
    const wrapper = mountForm();
    const r = wrapper.vm.getRange({ condition_type: "MTE", min_value: 50, max_value: 0 });
    expect(r.min).toBe(50);
    expect(r.max).toBe(Infinity);
  });

  // b29[3]: LT → max = v2-0.0001
  it("getRange LT → max exclusive", () => {
    const wrapper = mountForm();
    const r = wrapper.vm.getRange({ condition_type: "LT", min_value: 0, max_value: 30 });
    expect(r.min).toBe(-Infinity);
    expect(r.max).toBeCloseTo(29.9999);
  });

  // b29[4]: LTE → max = v2
  it("getRange LTE → max inclusive", () => {
    const wrapper = mountForm();
    const r = wrapper.vm.getRange({ condition_type: "LTE", min_value: 0, max_value: 30 });
    expect(r.min).toBe(-Infinity);
    expect(r.max).toBe(30);
  });

  // b29[6]: default → null
  it("getRange unknown condition_type → return null", () => {
    const wrapper = mountForm();
    const r = wrapper.vm.getRange({ condition_type: "UNKNOWN", min_value: 0, max_value: 0 });
    expect(r).toBeNull();
  });

  // b27[1]: min_value undefined → ?? 0
  it("getRange min_value undefined → fallback 0", () => {
    const wrapper = mountForm();
    const r = wrapper.vm.getRange({ condition_type: "EXACT", min_value: undefined, max_value: 0 });
    expect(r.min).toBe(0);
    expect(r.max).toBeCloseTo(0.0001);
  });

  // b28[1]: max_value undefined → ?? 0
  it("getRange max_value undefined → fallback 0", () => {
    const wrapper = mountForm();
    const r = wrapper.vm.getRange({ condition_type: "LTE", min_value: 0, max_value: undefined });
    expect(r.max).toBe(0);
  });
});

// ─── 13. isOverlapping ────────────────────────────────────
describe("AlertForm > isOverlapping", () => {
  // b24[0]: getRange null → return false
  it("isOverlapping: unknown condition_type → return false", () => {
    const wrapper = mountForm();
    expect(wrapper.vm.isOverlapping(
      { condition_type: "UNKNOWN", min_value: 0, max_value: 0 },
      { condition_type: "MT",      min_value: 0, max_value: 0 }
    )).toBe(false);
  });
});

// ─── 14. validateAlarms extra branches ───────────────────
describe("AlertForm > validateAlarms extra", () => {
  // b19[1]: dataType ไม่ใช่ number → ไม่ตรวจ overlap
  it("dataType=onoff → ไม่ตรวจ overlap ถึงแม้ค่าทับกัน", () => {
    const wrapper = mountForm({
      modelValue: [
        { ...baseAlarm, name: "A", condition_type: "EXACT", min_value: 1 },
        { ...baseAlarm, name: "B", condition_type: "EXACT", min_value: 1 },
      ],
      dataType: "onoff",
    });
    const result = wrapper.vm.validateAlarms();
    const overlapErrors = wrapper.vm.errors.filter((e) => e.field === "threshold");
    expect(overlapErrors).toHaveLength(0);
    expect(result).toBe(true); // ไม่มี error เลย (ชื่อไม่ซ้ำ, ไม่ตรวจ overlap)
  });

  // b23[1]: alarm ที่ทับซ้อนไม่มีชื่อ → ใช้ j+1 ใน message
  it("overlap alarm ไม่มีชื่อ → message ใช้ index+1", () => {
    const wrapper = mountForm({
      modelValue: [
        { ...baseAlarm, name: "A", condition_type: "BTW", min_value: 0, max_value: 50 },
        { ...baseAlarm, name: "", condition_type: "BTW", min_value: 30, max_value: 80 },
      ],
    });
    wrapper.vm.validateAlarms();
    const overlapErrs = wrapper.vm.errors.filter((e) => e.field === "threshold");
    expect(overlapErrs.some((e) => e.message.includes("2"))).toBe(true);
  });
});

// ─── 15. applyLevelRule ──────────────────────────────────
describe("AlertForm > applyLevelRule", () => {
  const lvl = { label: "High", min_value: 80, max_value: 100, level_index: 1, condition_type: "MTE" };

  // b32[0]: label ไม่เจอ → return ไม่ emit
  it("label ไม่มีใน levelLabels → ไม่ emit", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm }],
      levelLabels: [lvl],
    });
    wrapper.vm.applyLevelRule(0, "NotExist");
    expect(wrapper.emitted("update:modelValue")).toBeFalsy();
  });

  // b32[1]: label เจอ → emit update:modelValue
  it("label เจอ → emit update:modelValue พร้อม level data", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm }],
      levelLabels: [lvl],
    });
    wrapper.vm.applyLevelRule(0, "High");
    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0][0].level_label).toBe("High");
    expect(emitted[0][0][0].level_index).toBe(1);
    expect(emitted[0][0][0].condition_type).toBe("MTE");
  });
});

// ─── 16. Template Interactions (covers fn26-fn36) ────────
describe("AlertForm > Template Interactions", () => {
  // fn26 L14: btn-close @click="removeAlarm(index)"
  it("คลิก btn-close → removeAlarm ถูกเรียก (fn26)", async () => {
    const wrapper = mountForm({ modelValue: [{ ...baseAlarm }] });
    await wrapper.find(".btn-close").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
  });

  // fn28 L32: condition select @input → alarm.condition_type เปลี่ยน
  it("condition select @input → handler ถูกเรียก (fn28)", async () => {
    const wrapper = mountForm({ modelValue: [{ ...baseAlarm, condition_type: "MTE" }] });
    const condSelect = wrapper.findAll("select")[0];
    condSelect.element.value = "MT";
    await condSelect.trigger("input");
    expect(condSelect.exists()).toBe(true);
  });

  // fn32 L69: min_value input v-model (not LT/LTE condition)
  it("min_value input trigger → v-model handler ถูกเรียก (fn32)", async () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, condition_type: "MTE", min_value: 80 }],
    });
    const numInput = wrapper.find("input[type='number']");
    await numInput.setValue("90");
    expect(numInput.exists()).toBe(true);
  });

  // fn33 L78: max_value input (LT/LTE/BTW)
  it("max_value input render + trigger → fn33 ถูกเรียก", async () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, condition_type: "LT", max_value: 30 }],
    });
    const numInput = wrapper.find("input[type='number']");
    await numInput.setValue("20");
    expect(numInput.exists()).toBe(true);
  });

  // BTW: fn32 + fn33 (แสดงทั้ง min และ max inputs พร้อม separator)
  it("condition_type=BTW → แสดง min + separator + max inputs", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, condition_type: "BTW", min_value: 10, max_value: 50 }],
    });
    expect(wrapper.find(".input-group-text").exists()).toBe(true);
    const numInputs = wrapper.findAll("input[type='number']");
    expect(numInputs.length).toBeGreaterThanOrEqual(2);
  });

  // fn34 L89: severity select v-model
  it("severity select render → fn34 ถูกเรียก", async () => {
    const wrapper = mountForm({ modelValue: [{ ...baseAlarm, severity: "Warning" }] });
    const sevSelect = wrapper.findAll("select").find(s => s.text().includes("Warning"));
    expect(sevSelect).toBeTruthy();
    await sevSelect.setValue("Error");
  });

  // fn35 L98: notify_email checkbox v-model
  it("notify_email checkbox render → fn35 ถูกเรียก", async () => {
    const wrapper = mountForm({ modelValue: [{ ...baseAlarm, notify_email: false }] });
    const checkbox = wrapper.find("input[type='checkbox']");
    expect(checkbox.exists()).toBe(true);
    await checkbox.setValue(true);
  });

  // fn36 L108: email input @input → updateEmails
  it("email input @input → updateEmails ถูกเรียก (fn36)", async () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, notify_email: true, email_recipients: [] }],
    });
    const emailInput = wrapper.find("input[placeholder*='อีเมล']");
    emailInput.element.value = "a@b.com";
    await emailInput.trigger("input");
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
  });

  // b46[0] L55: dataType=level → v-else-if path แสดง level select
  it("dataType=level → แสดง level select (b46)", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, level_label: "" }],
      dataType: "level",
      levelLabels: [],
    });
    expect(wrapper.text()).toContain("เลือก Level");
  });

  // fn30 L60: level select @change → applyLevelRule
  // selects: [0]=condition (disabled), [1]=level threshold, [2]=severity
  it("level select @change → applyLevelRule ถูกเรียก (fn30)", async () => {
    const lvl = { label: "High", min_value: 80, max_value: 100, level_index: 1, condition_type: "MTE" };
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, level_label: "" }],
      dataType: "level",
      levelLabels: [lvl],
    });
    // index 1 = level threshold select (ไม่ใช่ condition select ที่ index 0)
    const levelSelect = wrapper.findAll("select")[1];
    levelSelect.element.value = "High";
    await levelSelect.trigger("change");
    // applyLevelRule ถูกเรียก → emit update:modelValue
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
  });

  // fn31 L63: v-for levelLabels → key function ถูกเรียก
  // b47[0,1]: levelLabels มีของ + ว่าง
  it("levelLabels มีรายการ → แสดง options (fn31, b47)", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm }],
      dataType: "level",
      levelLabels: [{ label: "High" }, { label: "Low" }],
    });
    const opts = wrapper.findAll("option");
    const labels = opts.map((o) => o.text());
    expect(labels).toContain("High");
    expect(labels).toContain("Low");
  });

  // b58[1] L107: email_recipients ไม่มี → (alarm.email_recipients || []).join()
  it("alarm ไม่มี email_recipients → ค่า input เป็น '' (b58)", () => {
    const alarmNoRecipients = { ...baseAlarm, notify_email: true };
    delete alarmNoRecipients.email_recipients;
    const wrapper = mountForm({ modelValue: [alarmNoRecipients] });
    const emailInput = wrapper.find("input[placeholder*='อีเมล']");
    expect(emailInput.attributes("value")).toBe("");
  });

  // fn27 L20: alarm name input v-model
  it("alarm name input trigger → fn27 ถูกเรียก", async () => {
    const wrapper = mountForm({ modelValue: [{ ...baseAlarm, name: "Old" }] });
    const nameInput = wrapper.find("input.form-control");
    await nameInput.setValue("New");
    expect(nameInput.exists()).toBe(true);
  });

  // fn29 L50: onoff select v-model → min_value เปลี่ยน
  it("onoff select trigger change → fn29 ถูกเรียก", async () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, min_value: 1 }],
      dataType: "onoff",
    });
    const onoffSelect = wrapper.findAll("select").find(s => s.text().includes("ON"));
    expect(onoffSelect).toBeTruthy();
    await onoffSelect.setValue("0");
  });

  // hasError แสดง error ใน template
  it("hasError → is-invalid class ปรากฏใน template", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, name: "" }],
    });
    wrapper.vm.validateAlarms();
    return wrapper.vm.$nextTick().then(() => {
      const nameInput = wrapper.find("input.form-control");
      expect(nameInput.classes()).toContain("is-invalid");
    });
  });
});

// ─── 17. New Bug Cases (ตั้งใจให้ FAIL) ─────────────────
describe("AlertForm > New Bug Cases", () => {

  // ── BUG-2 ─────────────────────────────────────────────
  // saveAllConfigs ไม่ตรวจ res.ok ของ POST number-config / POST levels
  // อันตราย: ถ้า backend บันทึก config ล้มเหลว (500) การ save alarm ยังดำเนินต่อ
  //          alarm ถูก save แต่ไม่มี config ที่ถูกต้อง → alarm อาจ trigger ด้วยค่าผิด
  //          เช่น decimal config ไม่ถูก save → threshold เปรียบเทียบผิดหน่วย
  // FAIL เพราะ: saveAllConfigs ไม่ throw เมื่อ POST number-config return 500
  it("[BUG-2] saveAllConfigs: POST number-config ล้มเหลว → ควร throw ไม่ใช่ continue", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 }) // POST number-config fail
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // POST alarm

    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm }],
      dataType: "number",
      numberConfig: { decimals: 2 },
    });

    // ควร: throw เพราะ number-config ไม่ถูกบันทึก
    await expect(wrapper.vm.saveAllConfigs(99)).rejects.toThrow(); // FAIL: ไม่ throw
  });

  // ── BUG-3 ─────────────────────────────────────────────
  // validateAlarms ไม่ตรวจ email เมื่อ notify_email=true แต่ email_recipients=[]
  // อันตราย: ระบบบันทึก alarm ว่า "ส่ง email" แต่ไม่มี recipient
  //          เมื่อ alarm trigger จริง → ไม่มีใครได้รับการแจ้งเตือน
  //          ใน production environment ที่ต้องการ on-call escalation → MISS CRITICAL ALERT
  // FAIL เพราะ: validateAlarms ไม่มีการตรวจสอบ email_recipients เลย
  it("[BUG-3] notify_email=true แต่ email_recipients=[] → ควร validate error", () => {
    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, notify_email: true, email_recipients: [] }],
    });
    const result = wrapper.vm.validateAlarms();
    // ควร: false (มี error: ต้องใส่ email อย่างน้อย 1)
    expect(result).toBe(false); // FAIL: actual true (ไม่มี email validation)
  });

  // ── BUG-4 ─────────────────────────────────────────────
  // saveAllConfigs สำหรับ level: emit updatedAlarms แต่ saveAlarms ยังใช้ this.modelValue เดิม
  // อันตราย: level_index ที่ถูกต้อง (จาก saved levels) ถูก emit ไปยัง parent
  //          แต่ saveAlarms POST ไปยัง backend ด้วย level_index เก่า (อาจ undefined)
  //          → DB มี alarm ที่ level_index ผิด → alarm trigger ด้วย level ผิดใน PLC
  // FAIL เพราะ: saveAlarms ใช้ this.modelValue ไม่ใช่ updatedAlarms
  it("[BUG-4] saveAllConfigs level: alarm ที่ POST ไป backend ต้องมี level_index ใหม่", async () => {
    const savedLevels = [{ label: "High", level_index: 5 }];
    const postedBodies = [];
    mockFetch.mockImplementation((url, opts) => {
      if (opts?.body) postedBodies.push(JSON.parse(opts.body));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(savedLevels) });
    });

    const wrapper = mountForm({
      modelValue: [{ ...baseAlarm, level_label: "High", level_index: undefined }],
      dataType: "level",
      levels: [{ label: "High" }],
    });
    await wrapper.vm.saveAllConfigs(50);

    // ค้นหา body ที่ POST ไปยัง /alarms
    const alarmPostBody = postedBodies.find((b) => b.level_label === "High");
    // ควร: level_index = 5 (จาก saved levels)
    expect(alarmPostBody?.level_index).toBe(5); // FAIL: actual undefined (ใช้ this.modelValue เดิม)
  });

  // ── BUG-5 ─────────────────────────────────────────────
  // validateAlarms ไม่ตรวจรูปแบบ email ที่ใส่
  // อันตราย: user พิมพ์ email ผิดรูปแบบ เช่น "not-an-email" หรือ "user@"
  //          → ถูก save ไปยัง backend → เมื่อ alarm ยิง → backend พยายามส่งไปที่ address ผิด
  //          → email failed silently, ไม่มีใครรู้ว่า alarm เกิดขึ้น
  // FAIL เพราะ: validateAlarms และ updateEmails ไม่มี email format validation
  it("[BUG-5] email รูปแบบผิด → validateAlarms ควร error", () => {
    const wrapper = mountForm({
      modelValue: [{
        ...baseAlarm,
        notify_email: true,
        email_recipients: ["not-an-email", "bad@", "@nodomain"],
      }],
    });
    const result = wrapper.vm.validateAlarms();
    // ควร: false (email format ไม่ถูกต้อง)
    expect(result).toBe(false); // FAIL: actual true (ไม่มี format check)
  });
});
