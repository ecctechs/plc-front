import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import GaugeDisplay from "../../../components/interaction/GaugeDisplay.vue";

// ─── Mock canvas-gauges ─────────────────────────────────────
const { mockDraw, mockDestroy, mockUpdate } = vi.hoisted(() => ({
  mockDraw: vi.fn(),
  mockDestroy: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("canvas-gauges", () => {
  class MockRadialGauge {
    constructor() {
      this.value = 0;
      this.draw = mockDraw;
      this.destroy = mockDestroy;
      this.update = mockUpdate;
    }
  }
  return { RadialGauge: MockRadialGauge };
});

// ─── Helper ─────────────────────────────────────────────────
const defaultProps = {
  x_percent: 50,
  y_percent: 30,
  value: 75,
  unit: "°C",
  decimals: 1,
  size: 5,
  minValue: 0,
  maxValue: 100,
};

function mountGauge(propsOverride = {}) {
  return mount(GaugeDisplay, {
    props: { ...defaultProps, ...propsOverride },
    global: { stubs: { transition: false } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("GaugeDisplay > Render", () => {
  it("render component สำเร็จ", () => {
    const wrapper = mountGauge();
    expect(wrapper.find(".gauge-display").exists()).toBe(true);
    expect(wrapper.find("canvas").exists()).toBe(true);
  });

  it("แสดงค่า value + unit", () => {
    const wrapper = mountGauge();
    expect(wrapper.find(".gauge-value").text()).toContain("75.0");
    expect(wrapper.find(".gauge-unit").text()).toBe("°C");
  });

  it("แสดง name เมื่อส่ง prop", () => {
    const wrapper = mountGauge({ name: "Temp Sensor" });
    expect(wrapper.find(".gauge-name").text()).toBe("Temp Sensor");
  });

  it("ไม่แสดง name เมื่อไม่ส่ง prop", () => {
    const wrapper = mountGauge({ name: "" });
    expect(wrapper.find(".gauge-name").exists()).toBe(false);
  });

  it("showValue = false → ซ่อนค่า", () => {
    const wrapper = mountGauge({ showValue: false });
    expect(wrapper.find(".gauge-value").exists()).toBe(false);
  });
});

// ─── 2. Position & Style ────────────────────────────────────
describe("GaugeDisplay > Position & Style", () => {
  it("containerStyle มี left/top ตาม x_percent/y_percent", () => {
    const wrapper = mountGauge();
    const style = wrapper.vm.containerStyle;
    expect(style.left).toBe("50%");
    expect(style.top).toBe("30%");
  });

  it("containerStyle มี background ตาม bgColor", () => {
    const wrapper = mountGauge({ bgColor: "red" });
    expect(wrapper.vm.containerStyle.background).toBe("red");
  });

  it("textStyle มี color ตาม textColor", () => {
    const wrapper = mountGauge({ textColor: "#ff0000" });
    expect(wrapper.vm.textStyle.color).toBe("#ff0000");
  });

  it("editable = true → มี class is-editable", () => {
    const wrapper = mountGauge({ editable: true });
    expect(wrapper.find(".gauge-display").classes()).toContain("is-editable");
  });
});

// ─── 3. Computed Values ─────────────────────────────────────
describe("GaugeDisplay > Computed", () => {
  it("displayValue คำนวณ scale + offset ถูกต้อง", () => {
    const wrapper = mountGauge({ value: 10, scale: 2, offset: 5, decimals: 0 });
    expect(wrapper.vm.displayValue).toBe("25");
  });

  it("canvasId ใช้ addressId", () => {
    const wrapper = mountGauge({ addressId: 42 });
    expect(wrapper.vm.canvasId).toBe("gauge-42");
  });

  it("canvasId ใช้ 'default' เมื่อไม่มี addressId", () => {
    const wrapper = mountGauge({ addressId: null });
    expect(wrapper.vm.canvasId).toBe("gauge-default");
  });

  it("majorTicks สร้าง 6 จุด (0-100 แบ่ง 5 ช่วง)", () => {
    const wrapper = mountGauge({ minValue: 0, maxValue: 100 });
    expect(wrapper.vm.majorTicks).toHaveLength(6);
    expect(wrapper.vm.majorTicks[0]).toBe("0");
    expect(wrapper.vm.majorTicks[5]).toBe("100");
  });

  it("highlights จาก alarms", () => {
    const alarms = [
      { severity: "warning", type: "BTW", min: 60, max: 80 },
      { severity: "critical", type: "MTE", min: 80 },
    ];
    const wrapper = mountGauge({ alarms });
    expect(wrapper.vm.highlights).toHaveLength(2);
    expect(wrapper.vm.highlights[0].color).toBe("#ffc107");
    expect(wrapper.vm.highlights[1].color).toBe("#dc3545");
  });

  it("highlights ว่างเมื่อไม่มี alarms", () => {
    const wrapper = mountGauge({ alarms: [] });
    expect(wrapper.vm.highlights).toHaveLength(0);
  });
});

// ─── 4. Editable Mode ───────────────────────────────────────
describe("GaugeDisplay > Editable", () => {
  it("คลิกเมื่อ editable = false → ไม่เข้า edit mode", async () => {
    const wrapper = mountGauge({ editable: false });
    await wrapper.find(".gauge-display").trigger("click");
    expect(wrapper.vm.editing).toBe(false);
  });

  it("คลิกเมื่อ editable = true → เข้า edit mode", async () => {
    const wrapper = mountGauge({ editable: true });
    await wrapper.find(".gauge-display").trigger("click");
    expect(wrapper.vm.editing).toBe(true);
    expect(wrapper.find(".edit-input").exists()).toBe(true);
  });

  it("กด Enter → emit update-value + ออก edit mode", async () => {
    const wrapper = mountGauge({ editable: true, addressId: 5 });
    await wrapper.find(".gauge-display").trigger("click");

    const input = wrapper.find(".edit-input");
    await input.setValue(88);
    await input.trigger("keyup.enter");

    expect(wrapper.vm.editing).toBe(false);
    const emitted = wrapper.emitted("update-value");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].addressId).toBe(5);
  });

  it("กด Escape → ยกเลิก edit, ค่ากลับเป็นเดิม", async () => {
    const wrapper = mountGauge({ editable: true, value: 50 });
    await wrapper.find(".gauge-display").trigger("click");

    const input = wrapper.find(".edit-input");
    await input.setValue(99);
    await input.trigger("keyup.escape");

    expect(wrapper.vm.editing).toBe(false);
    expect(wrapper.vm.inputValue).toBe(50);
  });
});

// ─── 5. Gauge Methods ───────────────────────────────────────
describe("GaugeDisplay > Methods", () => {
  it("getDisplayValue คำนวณ scale + offset", () => {
    const wrapper = mountGauge({ scale: 2, offset: 10, decimals: 1 });
    expect(wrapper.vm.getDisplayValue(5)).toBe("20.0");
  });

  it("generateTicks สร้าง ticks ถูกต้อง", () => {
    const wrapper = mountGauge();
    const ticks = wrapper.vm.generateTicks(0, 50);
    expect(ticks).toHaveLength(6);
    expect(ticks[0]).toBe("0");
    expect(ticks[5]).toBe("50");
  });
});

// ─── 6. Bug Cases (FAIL จนกว่าจะแก้ GaugeDisplay.vue) ──────
//
//  กติกา: ห้ามแก้ test — ต้องแก้ GaugeDisplay.vue เท่านั้น

describe("GaugeDisplay > Bug Cases", () => {

  // ── BUG-1 ─────────────────────────────────────────────────
  // finishEditing() ไม่ clamp ค่าให้อยู่ใน min/max
  // ผู้ใช้พิมพ์ 999 ทั้งที่ maxValue = 100 → ส่งค่าเกิน max ออกไป
  // ควร clamp ค่าก่อน emit
  it("[BUG-1] พิมพ์ค่าเกิน maxValue → ค่าที่ emit ต้องไม่เกิน max", async () => {
    const wrapper = mountGauge({ editable: true, minValue: 0, maxValue: 100 });
    await wrapper.find(".gauge-display").trigger("click");

    const input = wrapper.find(".edit-input");
    await input.setValue(999);
    await input.trigger("keyup.enter");

    const emitted = wrapper.emitted("update-value");
    expect(emitted[0][0].value).toBeLessThanOrEqual(100);
  });

  // ── BUG-2 ─────────────────────────────────────────────────
  // finishEditing() ไม่ clamp ค่าต่ำกว่า min
  // ผู้ใช้พิมพ์ -50 ทั้งที่ minValue = 0 → ส่งค่าติดลบออกไป
  it("[BUG-2] พิมพ์ค่าต่ำกว่า minValue → ค่าที่ emit ต้องไม่ต่ำกว่า min", async () => {
    const wrapper = mountGauge({ editable: true, minValue: 0, maxValue: 100 });
    await wrapper.find(".gauge-display").trigger("click");

    const input = wrapper.find(".edit-input");
    await input.setValue(-50);
    await input.trigger("keyup.enter");

    const emitted = wrapper.emitted("update-value");
    expect(emitted[0][0].value).toBeGreaterThanOrEqual(0);
  });
});

// ─── 7. Additional Coverage ──────────────────────────────────
describe("GaugeDisplay > Additional Coverage", () => {

  // displayValue: value = null → raw = 0 (covers ?? 0 null guard)
  it("displayValue: value=null → แสดง 0", () => {
    const wrapper = mountGauge({ value: null, decimals: 1 });
    expect(wrapper.vm.displayValue).toBe("0.0");
  });

  // value watcher: editing=true → inputValue ไม่อัปเดต (false branch of !this.editing)
  it("value watcher: เมื่อ editing=true → inputValue ไม่เปลี่ยน", async () => {
    const wrapper = mountGauge({ editable: true, value: 50 });
    await wrapper.find(".gauge-display").trigger("click");
    expect(wrapper.vm.editing).toBe(true);
    await wrapper.setProps({ value: 99 });
    expect(wrapper.vm.inputValue).toBe(50);
  });

  // minValue watcher → initGauge
  it("minValue watcher → เรียก initGauge", async () => {
    const wrapper = mountGauge();
    const spy = vi.spyOn(wrapper.vm, "initGauge");
    await wrapper.setProps({ minValue: 10 });
    expect(spy).toHaveBeenCalled();
  });

  // maxValue watcher → initGauge
  it("maxValue watcher → เรียก initGauge", async () => {
    const wrapper = mountGauge();
    const spy = vi.spyOn(wrapper.vm, "initGauge");
    await wrapper.setProps({ maxValue: 200 });
    expect(spy).toHaveBeenCalled();
  });

  // beforeUnmount: gauge มีอยู่ → destroy + gauge=null
  it("beforeUnmount: gauge ไม่ใช่ null → destroy ถูกเรียก", async () => {
    const wrapper = mountGauge();
    await flushPromises();
    expect(wrapper.vm.gauge).not.toBeNull();
    wrapper.unmount();
    expect(mockDestroy).toHaveBeenCalled();
  });

  // beforeUnmount: gauge = null → ไม่ throw
  it("beforeUnmount: gauge=null → ไม่ throw", () => {
    const wrapper = mountGauge();
    wrapper.vm.gauge = null;
    expect(() => wrapper.unmount()).not.toThrow();
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  // initGauge re-init: มี gauge อยู่แล้ว → destroy ก่อนสร้างใหม่
  it("initGauge: มี gauge อยู่แล้ว → destroy ก่อน", async () => {
    const wrapper = mountGauge();
    await flushPromises();
    mockDestroy.mockClear();
    wrapper.vm.initGauge();
    expect(mockDestroy).toHaveBeenCalled();
  });

  // initGauge: viewport < 480 → gaugeSize = 150
  describe("initGauge viewport sizes", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("viewport < 480 → gaugeSize = 150 (baseSize<480 branches)", async () => {
      vi.stubGlobal("innerWidth", 400);
      vi.stubGlobal("innerHeight", 400);
      const wrapper = mountGauge();
      await flushPromises();
      expect(mockDraw).toHaveBeenCalled();
      expect(wrapper.vm.gauge).not.toBeNull();
    });

    it("viewport 480-767 → gaugeSize = 180 (baseSize<768 branch)", async () => {
      vi.stubGlobal("innerWidth", 600);
      vi.stubGlobal("innerHeight", 600);
      const wrapper = mountGauge();
      await flushPromises();
      expect(mockDraw).toHaveBeenCalled();
    });

    it("viewport >= 768 → gaugeSize = 200 (default branch)", async () => {
      vi.stubGlobal("innerWidth", 1024);
      vi.stubGlobal("innerHeight", 768);
      const wrapper = mountGauge();
      await flushPromises();
      expect(mockDraw).toHaveBeenCalled();
    });
  });

  // getGaugeHighlights: alarm type MT (right side of MTE || MT)
  it("highlights: type=MT → from=al.min, to=maxGauge", () => {
    const alarms = [{ severity: "warning", type: "MT", min: 70 }];
    const wrapper = mountGauge({ alarms, maxValue: 100 });
    const h = wrapper.vm.highlights;
    expect(h[0].from).toBe(70);
    expect(h[0].to).toBe(100);
  });

  // getGaugeHighlights: alarm type LTE
  it("highlights: type=LTE → from=minGauge, to=al.min", () => {
    const alarms = [{ severity: "critical", type: "LTE", min: 20 }];
    const wrapper = mountGauge({ alarms, minValue: 0 });
    const h = wrapper.vm.highlights;
    expect(h[0].from).toBe(0);
    expect(h[0].to).toBe(20);
    expect(h[0].color).toBe("#dc3545");
  });

  // getGaugeHighlights: alarm type LT (right side of LTE || LT)
  it("highlights: type=LT → from=minGauge, to=al.min", () => {
    const alarms = [{ severity: "warning", type: "LT", min: 10 }];
    const wrapper = mountGauge({ alarms });
    const h = wrapper.vm.highlights;
    expect(h[0].from).toBe(0);
    expect(h[0].to).toBe(10);
  });

  // getGaugeHighlights: severity 'Warning' (capital W)
  it("highlights: severity='Warning' (capital) → color yellow", () => {
    const alarms = [{ severity: "Warning", type: "BTW", min: 50, max: 80 }];
    const wrapper = mountGauge({ alarms });
    expect(wrapper.vm.highlights[0].color).toBe("#ffc107");
  });

  // getGaugeHighlights: severity 'Error' (capital E)
  it("highlights: severity='Error' → color red", () => {
    const alarms = [{ severity: "Error", type: "BTW", min: 80, max: 100 }];
    const wrapper = mountGauge({ alarms });
    expect(wrapper.vm.highlights[0].color).toBe("#dc3545");
  });

  // getGaugeHighlights: minValue = null → minGauge = 0 (covers ?? 0)
  it("highlights: minValue=null → minGauge fallback 0", () => {
    const alarms = [{ severity: "warning", type: "LT", min: 10 }];
    const wrapper = mountGauge({ alarms, minValue: null });
    expect(wrapper.vm.highlights[0].from).toBe(0);
  });

  // getGaugeHighlights: maxValue = null → maxGauge = 100 (covers ?? 100)
  it("highlights: maxValue=null → maxGauge fallback 100", () => {
    const alarms = [{ severity: "warning", type: "MT", min: 70 }];
    const wrapper = mountGauge({ alarms, maxValue: null });
    expect(wrapper.vm.highlights[0].to).toBe(100);
  });

  // finishEditing: editable=false → early return (ไม่ emit)
  it("finishEditing: editable=false → early return ไม่ emit", () => {
    const wrapper = mountGauge({ editable: false });
    wrapper.vm.finishEditing();
    expect(wrapper.emitted("update-value")).toBeFalsy();
  });

  // onInput: NaN → inputValue = 0 (covers || 0 path)
  it("onInput: input ที่ไม่ใช่ตัวเลข → inputValue = 0", async () => {
    const wrapper = mountGauge({ editable: true });
    await wrapper.find(".gauge-display").trigger("click");
    wrapper.vm.onInput({ target: { value: "abc" } });
    expect(wrapper.vm.inputValue).toBe(0);
  });

  // updateGauge: gauge=null → เรียก initGauge
  it("updateGauge: gauge=null → initGauge ถูกเรียก", async () => {
    const wrapper = mountGauge();
    await flushPromises();
    wrapper.vm.gauge = null;
    const spy = vi.spyOn(wrapper.vm, "initGauge");
    wrapper.vm.updateGauge(50);
    expect(spy).toHaveBeenCalled();
  });

  // updateGauge: string value → parseFloat
  it("updateGauge: value เป็น string → gauge.update ถูกเรียก", async () => {
    const wrapper = mountGauge();
    await flushPromises();
    mockUpdate.mockClear();
    wrapper.vm.updateGauge("42");
    expect(mockUpdate).toHaveBeenCalled();
  });

  // @blur="finishEditing" template handler
  it("blur บน input → finishEditing (ออก edit mode)", async () => {
    const wrapper = mountGauge({ editable: true });
    await wrapper.find(".gauge-display").trigger("click");
    expect(wrapper.vm.editing).toBe(true);
    await wrapper.find(".edit-input").trigger("blur");
    expect(wrapper.vm.editing).toBe(false);
    expect(wrapper.emitted("update-value")).toBeTruthy();
  });

  // @click.stop template handler on input
  it("click บน input (@click.stop) → ไม่ bubble ไปเรียก startEditing", async () => {
    const wrapper = mountGauge({ editable: true });
    await wrapper.find(".gauge-display").trigger("click");
    await wrapper.find(".edit-input").setValue(77);
    await wrapper.find(".edit-input").trigger("click");
    // editing ยังคงเป็น true และ inputValue ไม่ถูก reset
    expect(wrapper.vm.editing).toBe(true);
    expect(wrapper.vm.inputValue).toBe(77);
  });

  // line 213 if[1]: alarm type ไม่ตรงกับ BTW/MTE/MT/LTE/LT → from=0, to=0
  it("highlights: alarm type ไม่รู้จัก → from=0, to=0 (default)", () => {
    const alarms = [{ severity: "warning", type: "NONE", min: 10, max: 90 }];
    const wrapper = mountGauge({ alarms });
    expect(wrapper.vm.highlights[0].from).toBe(0);
    expect(wrapper.vm.highlights[0].to).toBe(0);
  });

  // line 236: `this.unit || ''` right side (unit falsy) + lines 251,255,266-268: `this.textColor || '#00ff00'`
  it("initGauge: unit='' และ textColor='' → fallback defaults ถูกใช้ (covers || branches)", async () => {
    const wrapper = mountGauge({ unit: "", textColor: "" });
    await flushPromises();
    expect(mockDraw).toHaveBeenCalled();
    expect(wrapper.vm.gauge).not.toBeNull();
  });

  // line 288 if[1]: $refs.inputField = null ใน $nextTick callback → ไม่ throw
  // Strategy: override $refs.inputField getter to return null BEFORE Vue re-render sets it
  // so when startEditing's $nextTick callback reads the ref, it's null
  it("startEditing: $refs.inputField null ใน nextTick → ไม่ throw (defensive guard)", async () => {
    const wrapper = mountGauge({ editable: true });
    await flushPromises(); // ensure mounted initGauge is done

    // startEditing() sets editing=true (triggers re-render M2) then queues nextTick callback (M1)
    // M2 runs first (re-render), M1 runs second → by M1, $refs.inputField is normally non-null
    // Workaround: define inputField with a getter that always returns null
    //   → Vue's re-render setter still fires (we capture the value) but getter returns null
    //   → M1 reads null → if (input) false branch covered
    wrapper.vm.startEditing();
    Object.defineProperty(wrapper.vm.$refs, 'inputField', {
      get: () => null,
      set: () => {},
      configurable: true,
    });
    await flushPromises();

    // editing stays true because focus/select were skipped (null ref guard)
    expect(wrapper.vm.editing).toBe(true);
  });

  // line 320 binary-expr[1]: parseFloat(NaN-string) || 0 → numVal = 0
  it("updateGauge: string ที่ไม่ใช่ตัวเลข → numVal = 0 (|| 0 path)", async () => {
    const wrapper = mountGauge();
    await flushPromises();
    mockUpdate.mockClear();
    wrapper.vm.updateGauge("notanumber");
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 0 }));
  });
});

// ─── 8. New Bug Cases (ตั้งใจให้ FAIL) ──────────────────────
//
//  กติกา: ห้ามแก้ test — ต้องแก้ GaugeDisplay.vue เท่านั้น

describe("GaugeDisplay > New Bug Cases", () => {

  // ── BUG-3 ─────────────────────────────────────────────────
  // onInput: พิมพ์ non-numeric → inputValue reset เป็น 0 ทันที
  // อันตราย: PLC จะได้รับคำสั่งเซ็ตค่า 0 ทันทีที่ user พิมพ์ผิด
  //          เช่น ค่า pressure ที่ 50 → user กด 'a' → ส่ง 0 ไป PLC
  // FAIL เพราะ: component ทำ `parseFloat("abc") || 0` = 0
  //             แทนที่จะ ignore input ที่ไม่ใช่ตัวเลขและคง inputValue เดิม
  it("[BUG-3] onInput: พิมพ์ตัวอักษร → ควรคง inputValue เดิม ไม่ reset เป็น 0", async () => {
    const wrapper = mountGauge({ editable: true, value: 50 });
    await wrapper.find(".gauge-display").trigger("click");
    wrapper.vm.inputValue = 50;
    wrapper.vm.onInput({ target: { value: "abc" } });
    // component ทำ inputValue = 0 → FAIL
    expect(wrapper.vm.inputValue).toBe(50); // FAIL: actual 0
  });

  // ── BUG-4 ─────────────────────────────────────────────────
  // updateGauge: gauge=null → เรียก initGauge แล้ว return เลย
  // อันตราย: ค่าใหม่จาก PLC (newVal) ไม่ถูก apply ไปที่ gauge ที่เพิ่ง init
  //          gauge จะแสดงค่า this.value เดิม แม้ PLC ส่งค่าใหม่มา
  // FAIL เพราะ: หลัง initGauge() component return ทันที
  //             ไม่ได้ update gauge ด้วย newVal จึงไม่เรียก gauge.update
  it("[BUG-4] updateGauge: gauge=null → หลัง initGauge ค่า newVal ควรถูก apply", async () => {
    const wrapper = mountGauge({ value: 10, scale: 1, offset: 0 });
    await flushPromises();
    wrapper.vm.gauge = null;
    mockUpdate.mockClear();
    wrapper.vm.updateGauge(99);
    // component ทำ initGauge() แล้ว return ทันที → mockUpdate ไม่ถูกเรียก
    // FAIL เพราะ gauge.update ควรถูกเรียกด้วย { value: 99 } แต่ไม่เกิดขึ้น
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ value: 99 })); // FAIL
  });

  // ── BUG-5 ─────────────────────────────────────────────────
  // startEditing: ไม่ guard ว่า editing=true อยู่แล้ว → รีเซ็ต inputValue
  // อันตราย: user กำลังพิมพ์ค่าอยู่ แล้ว click ส่วนอื่นของ gauge (เช่น canvas wrapper)
  //          → startEditing ถูกเรียกอีก → inputValue ถูก reset เป็น this.value
  //          → user สูญเสียค่าที่พิมพ์ไปโดยไม่รู้ตัว
  // FAIL เพราะ: startEditing ไม่ check `if (this.editing) return`
  it("[BUG-5] startEditing ขณะ editing อยู่ → ควร guard ไม่ reset inputValue", async () => {
    const wrapper = mountGauge({ editable: true, value: 50 });
    await wrapper.find(".gauge-display").trigger("click");
    await wrapper.find(".edit-input").setValue(88);
    // simulate second click on gauge container (not on input — outside the input)
    await wrapper.find(".gauge-display").trigger("click");
    // component รีเซ็ต inputValue = this.value = 50 → FAIL
    expect(wrapper.vm.inputValue).toBe(88); // FAIL: actual 50
  });
});
