import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
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
