import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import LevelProgressBar from "../../../components/interaction/LevelProgressBar.vue";

// ─── Mock Data ──────────────────────────────────────────────
const mockLevels = [
  { mode: "criteria", label: "Low", condition_type: "BTW", min_value: 0, max_value: 30, include_min: true, include_max: false },
  { mode: "criteria", label: "Medium", condition_type: "BTW", min_value: 30, max_value: 70, include_min: true, include_max: false },
  { mode: "criteria", label: "High", condition_type: "BTW", min_value: 70, max_value: 100, include_min: true, include_max: true },
];

const defaultProps = {
  x_percent: 40,
  y_percent: 60,
  value: 50,
  unit: "%",
  decimals: 0,
  size: 5,
  levels: mockLevels,
};

function mountBar(propsOverride = {}) {
  return mount(LevelProgressBar, {
    props: { ...defaultProps, ...propsOverride },
    global: { stubs: { transition: false } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("LevelProgressBar > Render", () => {
  it("render component สำเร็จ", () => {
    const wrapper = mountBar();
    expect(wrapper.find(".level-progress-bar").exists()).toBe(true);
    expect(wrapper.find(".progress-track").exists()).toBe(true);
  });

  it("แสดงค่า value + unit", () => {
    const wrapper = mountBar();
    expect(wrapper.find(".current-value").text()).toBe("50");
    expect(wrapper.find(".unit").text()).toBe("%");
  });

  it("แสดง name เมื่อส่ง prop", () => {
    const wrapper = mountBar({ name: "Tank Level" });
    expect(wrapper.find(".bar-name").text()).toBe("Tank Level");
  });

  it("ไม่แสดง name เมื่อไม่ส่ง prop", () => {
    const wrapper = mountBar({ name: "" });
    expect(wrapper.find(".bar-name").exists()).toBe(false);
  });

  it("showValue = false → ซ่อนค่า", () => {
    const wrapper = mountBar({ showValue: false });
    expect(wrapper.find(".value-display").exists()).toBe(false);
  });

  it("แสดง decimals ถูกต้อง", () => {
    const wrapper = mountBar({ value: 50.567, decimals: 2 });
    expect(wrapper.find(".current-value").text()).toBe("50.57");
  });
});

// ─── 2. Position & Style ────────────────────────────────────
describe("LevelProgressBar > Position & Style", () => {
  it("containerStyle มี left/top ตาม x_percent/y_percent", () => {
    const wrapper = mountBar();
    const style = wrapper.vm.containerStyle;
    expect(style.left).toBe("40%");
    expect(style.top).toBe("60%");
  });

  it("containerStyle มี background ตาม bgColor", () => {
    const wrapper = mountBar({ bgColor: "#111" });
    expect(wrapper.vm.containerStyle.background).toBe("#111");
  });

  it("trackStyle มี height ตาม barHeight", () => {
    const wrapper = mountBar({ barHeight: 30 });
    expect(wrapper.vm.trackStyle.height).toBe("30px");
  });

  it("editable = true → มี class is-editable", () => {
    const wrapper = mountBar({ editable: true });
    expect(wrapper.find(".level-progress-bar").classes()).toContain("is-editable");
  });
});

// ─── 3. Levels & Computed ───────────────────────────────────
describe("LevelProgressBar > Levels", () => {
  it("sortedLevels กรอง mode=criteria เท่านั้น", () => {
    const levels = [
      ...mockLevels,
      { mode: "action", label: "Alert" },
    ];
    const wrapper = mountBar({ levels });
    expect(wrapper.vm.sortedLevels).toHaveLength(3);
  });

  it("overallMin/overallMax คำนวณจาก levels", () => {
    const wrapper = mountBar();
    expect(wrapper.vm.overallMin).toBe(0);
    expect(wrapper.vm.overallMax).toBe(100);
  });

  it("ไม่มี levels → overallMin=0, overallMax=100", () => {
    const wrapper = mountBar({ levels: [] });
    expect(wrapper.vm.overallMin).toBe(0);
    expect(wrapper.vm.overallMax).toBe(100);
  });

  it("currentLevelIndex หา level ที่ค่าอยู่ในช่วง", () => {
    const wrapper = mountBar({ value: 50 });
    expect(wrapper.vm.currentLevelIndex).toBe(1); // Medium (30-70)
  });

  it("value อยู่นอกทุกช่วง → currentLevelIndex = -1", () => {
    const wrapper = mountBar({ value: -10 });
    expect(wrapper.vm.currentLevelIndex).toBe(-1);
  });

  it("currentLevelLabel แสดง label ของ level ปัจจุบัน", () => {
    const wrapper = mountBar({ value: 50 });
    expect(wrapper.vm.currentLevelLabel).toBe("Medium");
  });

  it("fillStyle width เปลี่ยนตาม level position", () => {
    const wrapper = mountBar({ value: 50 });
    const fill = wrapper.vm.fillStyle;
    expect(parseFloat(fill.width)).toBeGreaterThan(0);
  });

  it("level segments render ตามจำนวน levels", () => {
    const wrapper = mountBar();
    const segments = wrapper.findAll(".level-segment");
    expect(segments).toHaveLength(3);
  });
});

// ─── 4. Condition Types ─────────────────────────────────────
describe("LevelProgressBar > Condition Types", () => {
  it("MTE: value >= min_value → match", () => {
    const levels = [{ mode: "criteria", label: "High", condition_type: "MTE", min_value: 80, include_min: true }];
    const wrapper = mountBar({ levels, value: 80 });
    expect(wrapper.vm.currentLevelIndex).toBe(0);
  });

  it("MT: value > min_value → match", () => {
    const levels = [{ mode: "criteria", label: "High", condition_type: "MT", min_value: 80 }];
    const wrapper = mountBar({ levels, value: 81 });
    expect(wrapper.vm.currentLevelIndex).toBe(0);
  });

  it("LTE: value <= min_value → match", () => {
    const levels = [{ mode: "criteria", label: "Low", condition_type: "LTE", min_value: 20 }];
    const wrapper = mountBar({ levels, value: 20 });
    expect(wrapper.vm.currentLevelIndex).toBe(0);
  });

  it("EQ: value === min_value → match", () => {
    const levels = [{ mode: "criteria", label: "Exact", condition_type: "EQ", min_value: 50 }];
    const wrapper = mountBar({ levels, value: 50 });
    expect(wrapper.vm.currentLevelIndex).toBe(0);
  });
});

// ─── 5. Editable Mode ───────────────────────────────────────
describe("LevelProgressBar > Editable", () => {
  it("คลิกเมื่อ editable = false → ไม่เข้า edit mode", async () => {
    const wrapper = mountBar({ editable: false });
    await wrapper.find(".level-progress-bar").trigger("click");
    expect(wrapper.vm.editing).toBe(false);
  });

  it("คลิกเมื่อ editable = true → เข้า edit mode", async () => {
    const wrapper = mountBar({ editable: true });
    await wrapper.find(".level-progress-bar").trigger("click");
    expect(wrapper.vm.editing).toBe(true);
    expect(wrapper.find(".edit-input").exists()).toBe(true);
  });

  it("กด Enter → emit update-value", async () => {
    const wrapper = mountBar({ editable: true, addressId: 10 });
    await wrapper.find(".level-progress-bar").trigger("click");

    const input = wrapper.find(".edit-input");
    await input.setValue(88);
    await input.trigger("keyup.enter");

    expect(wrapper.vm.editing).toBe(false);
    const emitted = wrapper.emitted("update-value");
    expect(emitted).toBeTruthy();
    expect(emitted[0][0].addressId).toBe(10);
  });

  it("กด Escape → ยกเลิก edit", async () => {
    const wrapper = mountBar({ editable: true, value: 50 });
    await wrapper.find(".level-progress-bar").trigger("click");

    await wrapper.find(".edit-input").trigger("keyup.escape");
    expect(wrapper.vm.editing).toBe(false);
    expect(wrapper.vm.inputValue).toBe(50);
  });
});

// ─── 6. Bug Cases (FAIL จนกว่าจะแก้ LevelProgressBar.vue) ──
//
//  กติกา: ห้ามแก้ test — ต้องแก้ LevelProgressBar.vue เท่านั้น

describe("LevelProgressBar > Bug Cases", () => {

  // ── BUG-1 ─────────────────────────────────────────────────
  // finishEditing() ไม่ clamp ค่าให้อยู่ใน overallMin/overallMax
  // ผู้ใช้พิมพ์ 500 ทั้งที่ max = 100 → emit ค่า 500 ออกไป
  // ควร clamp ค่าก่อน emit เหมือน input[min][max]
  it("[BUG-1] พิมพ์ค่าเกิน max → ค่าที่ emit ต้องไม่เกิน overallMax", async () => {
    const wrapper = mountBar({ editable: true });
    await wrapper.find(".level-progress-bar").trigger("click");

    const input = wrapper.find(".edit-input");
    await input.setValue(500);
    await input.trigger("keyup.enter");

    const emitted = wrapper.emitted("update-value");
    expect(emitted[0][0].value).toBeLessThanOrEqual(100);
  });

  // ── BUG-2 ─────────────────────────────────────────────────
  // finishEditing() ไม่มี guard ป้องกัน double-submit
  // กด Enter 2 ครั้งรวด → emit update-value 2 รอบ
  // ครั้งที่ 2 ไม่ควรเกิดเพราะ editing เป็น false แล้ว
  // แต่ blur event ยังสามารถ fire ได้หลัง enter
  it("[BUG-2] กด Enter แล้ว blur ตาม → ต้อง emit แค่ 1 ครั้ง", async () => {
    const wrapper = mountBar({ editable: true, addressId: 10 });
    await wrapper.find(".level-progress-bar").trigger("click");

    const input = wrapper.find(".edit-input");
    await input.setValue(50);
    await input.trigger("keyup.enter");
    await input.trigger("blur");

    const emitted = wrapper.emitted("update-value");
    expect(emitted).toHaveLength(1);
  });
});
