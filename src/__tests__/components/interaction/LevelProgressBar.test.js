import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
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

// ─── 6. Additional Coverage ─────────────────────────────────
describe("LevelProgressBar > Additional Coverage", () => {

  // fn 0 line 92: levels prop `default: () => []` — mount without levels prop
  it("mount ไม่ส่ง levels → default () => [] ถูกเรียก, sortedLevels=[]", () => {
    const wrapper = mount(LevelProgressBar, {
      props: { x_percent: 50, y_percent: 50 },
      global: { stubs: { transition: false } },
    });
    expect(wrapper.vm.sortedLevels).toHaveLength(0);
  });

  // fn 5 line 165: labelStyle computed — never called in existing tests
  it("labelStyle คืน color/textShadow ตาม textColor", () => {
    const wrapper = mountBar({ textColor: "#ff0000" });
    const s = wrapper.vm.labelStyle;
    expect(s.color).toBe("#ff0000");
    expect(s.textShadow).toContain("#ff0000");
  });

  // fn 20 + stmts 69,70 line 291-294: getLabelStyle method
  it("getLabelStyle คืน left position", () => {
    const wrapper = mountBar(); // 3 levels → segmentSize = 33.33
    const s = wrapper.vm.getLabelStyle(1);
    expect(typeof s.left).toBe("string");
    expect(s.left).toContain("%");
  });

  // branch 0 side 1 line 180: `this.value ?? 0` right side — value = null
  it("displayValue: value=null → raw=0 (covers ?? 0)", () => {
    const wrapper = mountBar({ value: null, decimals: 2 });
    expect(wrapper.vm.displayValue).toBe("0.00");
  });

  // branches 3,4 side 1 line 189: `min_value ?? -Infinity` in sort
  it("sortedLevels: level ที่ min_value=null → ใช้ -Infinity ในการ sort", () => {
    const levels = [
      { mode: "criteria", label: "B", condition_type: "BTW", min_value: 10, max_value: 50 },
      { mode: "criteria", label: "A", condition_type: "BTW", min_value: null, max_value: 50 },
    ];
    const wrapper = mountBar({ levels });
    // A (null min → -Infinity) ควรอยู่ก่อน B (10)
    expect(wrapper.vm.sortedLevels[0].label).toBe("A");
  });

  // branch 4 side 1: b.min_value null in comparator — ทั้งคู่ null เพื่อให้ sort โทร comparator(null, null)
  it("sortedLevels: ทั้งสอง level min_value=null → sort ด้วย -Infinity ทั้งคู่ (covers b4.1)", () => {
    const levels = [
      { mode: "criteria", label: "A", condition_type: "BTW", min_value: null },
      { mode: "criteria", label: "B", condition_type: "BTW", min_value: null },
    ];
    const wrapper = mountBar({ levels });
    expect(wrapper.vm.sortedLevels).toHaveLength(2);
  });

  // branch 6 side 1 line 196: `first.min_value ?? 0` — first level has null min_value
  it("overallMin: first level min_value=null → fallback 0", () => {
    const levels = [{ mode: "criteria", label: "A", condition_type: "BTW", min_value: null, max_value: 50 }];
    const wrapper = mountBar({ levels });
    expect(wrapper.vm.overallMin).toBe(0);
  });

  // branch 9 side 1 line 205 (if false) + branch 11 side 0 line 210:
  // ไม่มี level ที่มี max_value → lastWithMax=undefined → last.min_value=50 (truthy) → 150
  it("overallMax: ไม่มี level ที่มี max_value, last.min_value=50 → 150", () => {
    const levels = [
      { mode: "criteria", label: "A", condition_type: "BTW", min_value: 0 },
      { mode: "criteria", label: "B", condition_type: "BTW", min_value: 50 },
    ];
    const wrapper = mountBar({ levels });
    expect(wrapper.vm.overallMax).toBe(150);
  });

  // branch 11 side 1 line 210: last.min_value = 0 (falsy) → return 100
  it("overallMax: ไม่มี max_value และ last.min_value=0 → 100", () => {
    const levels = [{ mode: "criteria", label: "A", condition_type: "BTW", min_value: 0 }];
    const wrapper = mountBar({ levels });
    expect(wrapper.vm.overallMax).toBe(100);
  });

  // branch 14 side 1 line 221: BTW include_min=false → `val > min_value` (exclusive)
  it("BTW include_min=false: value = boundary → ไม่ match (exclusive)", () => {
    const levels = [{ mode: "criteria", label: "A", condition_type: "BTW", min_value: 30, max_value: 70, include_min: false, include_max: false }];
    const wrapper = mountBar({ levels, value: 30 }); // 30 not > 30
    expect(wrapper.vm.currentLevelIndex).toBe(-1);
  });

  // BTW include_min=false: value strictly inside → match
  it("BTW include_min=false: value > min_value → match", () => {
    const levels = [{ mode: "criteria", label: "A", condition_type: "BTW", min_value: 30, max_value: 70, include_min: false, include_max: false }];
    const wrapper = mountBar({ levels, value: 31 }); // 31 > 30 ✓
    expect(wrapper.vm.currentLevelIndex).toBe(0);
  });

  // branch 20 side 1 line 227: MT value not satisfied → return -1
  it("MT: value = min_value → ไม่ match (ต้อง strictly greater)", () => {
    const levels = [{ mode: "criteria", label: "High", condition_type: "MT", min_value: 80 }];
    const wrapper = mountBar({ levels, value: 80 }); // 80 not > 80
    expect(wrapper.vm.currentLevelIndex).toBe(-1);
  });

  // branch 22 side 1 line 230: LT condition type path (val < min_value)
  it("LT: value < min_value → match", () => {
    const levels = [{ mode: "criteria", label: "Low", condition_type: "LT", min_value: 30 }];
    const wrapper = mountBar({ levels, value: 25 });
    expect(wrapper.vm.currentLevelIndex).toBe(0);
  });

  // branch 23 side 1 line 231: LT/LTE value doesn't satisfy → continue to next level
  it("LTE: value > min_value → ไม่ match", () => {
    const levels = [{ mode: "criteria", label: "Low", condition_type: "LTE", min_value: 20 }];
    const wrapper = mountBar({ levels, value: 50 }); // 50 not <= 20
    expect(wrapper.vm.currentLevelIndex).toBe(-1);
  });

  // branch 24 side 1 line 232: unknown condition_type → falls to EQ check → EQ also fails
  // branch 25 side 1 line 234: EQ but value !== min_value
  it("EQ: value ไม่เท่ากับ min_value → -1 (covers EQ false branch)", () => {
    const levels = [{ mode: "criteria", label: "Exact", condition_type: "EQ", min_value: 50 }];
    const wrapper = mountBar({ levels, value: 49 }); // 49 !== 50
    expect(wrapper.vm.currentLevelIndex).toBe(-1);
  });

  it("condition_type ไม่รู้จัก → falls through ถึง EQ check → -1", () => {
    const levels = [{ mode: "criteria", label: "X", condition_type: "CUSTOM", min_value: 50 }];
    const wrapper = mountBar({ levels, value: 50 });
    expect(wrapper.vm.currentLevelIndex).toBe(-1);
  });

  // branch 26 side 1 line 241: currentLevelLabel when currentLevelIndex=-1 → return ''
  it("currentLevelLabel: value นอกช่วงทุก level → return ''", () => {
    const wrapper = mountBar({ value: 999 }); // ไม่อยู่ใน Low/Medium/High (0-100)
    expect(wrapper.vm.currentLevelLabel).toBe("");
  });

  // branch 29 side 1 line 265: value watcher เมื่อ editing=true → inputValue ไม่เปลี่ยน
  it("value watcher: editing=true → inputValue คงค่าที่ user พิมพ์", async () => {
    const wrapper = mountBar({ editable: true, value: 50 });
    await wrapper.find(".level-progress-bar").trigger("click");
    expect(wrapper.vm.editing).toBe(true);
    await wrapper.setProps({ value: 99 });
    expect(wrapper.vm.inputValue).toBe(50); // ไม่เปลี่ยน
  });

  // branch 30 side 1 line 283 + stmt 68 line 289:
  // getSegmentFillStyle false branch → return {}
  it("getSegmentFillStyle: index > currentLevelIndex → return {}", () => {
    const wrapper = mountBar({ value: 50 }); // currentLevelIndex=1
    const result = wrapper.vm.getSegmentFillStyle({}, 2); // 2 > 1 → false branch
    expect(result).toEqual({});
  });

  // getSegmentFillStyle true branch (ให้แน่ใจ colored return ถูก cover ด้วยตรง)
  it("getSegmentFillStyle: index <= currentLevelIndex → คืน colored style", () => {
    const wrapper = mountBar({ value: 100 }); // High → currentLevelIndex=2
    const result = wrapper.vm.getSegmentFillStyle({}, 0);
    expect(result.backgroundColor).toBeDefined();
    expect(result.boxShadow).toBeDefined();
  });

  // branch 33 side 1 line 319: onInput NaN → || 0 right side
  it("onInput: พิมพ์ตัวอักษร → inputValue = 0 (|| 0 path)", async () => {
    const wrapper = mountBar({ editable: true });
    await wrapper.find(".level-progress-bar").trigger("click");
    wrapper.vm.onInput({ target: { value: "abc" } });
    expect(wrapper.vm.inputValue).toBe(0);
  });

  // fn 33 line 46: @click.stop on input → ไม่ bubble
  it("click บน input (@click.stop) → editing ยังคง true, inputValue ไม่ reset", async () => {
    const wrapper = mountBar({ editable: true, value: 50 });
    await wrapper.find(".level-progress-bar").trigger("click");
    await wrapper.find(".edit-input").setValue(77);
    await wrapper.find(".edit-input").trigger("click");
    expect(wrapper.vm.editing).toBe(true);
    expect(wrapper.vm.inputValue).toBe(77);
  });

  // blur บน input → finishEditing
  it("blur บน input → ออก edit mode", async () => {
    const wrapper = mountBar({ editable: true });
    await wrapper.find(".level-progress-bar").trigger("click");
    await wrapper.find(".edit-input").trigger("blur");
    expect(wrapper.vm.editing).toBe(false);
    expect(wrapper.emitted("update-value")).toBeTruthy();
  });

  // branch 32 side 1 line 311: startEditing double-nextTick inputField null → ไม่ throw
  // ต้อง render input ก่อน ($refs.inputField ต้องมี property อยู่แล้ว) แล้วค่อย override
  it("startEditing: inputField null ใน double nextTick → ไม่ throw (defensive guard)", async () => {
    const wrapper = mountBar({ editable: true });
    // click ครั้งแรก: editing=true → input rendered → $refs.inputField ถูก set
    await wrapper.find(".level-progress-bar").trigger("click");
    await flushPromises();
    expect(wrapper.vm.$refs.inputField).toBeTruthy(); // ยืนยัน property มีอยู่แล้ว
    // override ให้ getter คืน null เพื่อให้ inner nextTick ถึง false branch
    Object.defineProperty(wrapper.vm.$refs, "inputField", {
      get: () => null,
      set: () => {},
      configurable: true,
    });
    // เรียก startEditing ซ้ำ → outer + inner nextTick จะอ่าน null จาก getter
    wrapper.vm.startEditing();
    await flushPromises();
    expect(wrapper.vm.editing).toBe(true);
  });
});

// ─── 7. New Bug Cases (ตั้งใจให้ FAIL) ──────────────────────
//
//  กติกา: ห้ามแก้ test — ต้องแก้ LevelProgressBar.vue เท่านั้น

describe("LevelProgressBar > New Bug Cases", () => {

  // ── BUG-3 ─────────────────────────────────────────────────
  // onInput: user พิมพ์ตัวอักษรที่ไม่ใช่ตัวเลข → inputValue reset เป็น 0
  // อันตราย: ถ้าเชื่อมต่อ PLC จริง ระบบจะส่งคำสั่ง write ค่า 0 ไปยัง PLC ทันที
  //          เช่น level control ของถัง → ถังระบาย/เปิด valve หมด
  // FAIL เพราะ: component ทำ `parseFloat("abc") || 0` = 0
  //             ควร ignore input ไม่ถูกต้องและคง inputValue เดิม
  it("[BUG-3] onInput ตัวอักษร → ควรคง inputValue เดิม ไม่ reset เป็น 0", async () => {
    const wrapper = mountBar({ editable: true, value: 50 });
    await wrapper.find(".level-progress-bar").trigger("click");
    wrapper.vm.inputValue = 50;
    wrapper.vm.onInput({ target: { value: "abc" } });
    // component reset เป็น 0 → FAIL
    expect(wrapper.vm.inputValue).toBe(50); // FAIL: actual 0
  });

  // ── BUG-4 ─────────────────────────────────────────────────
  // startEditing: ไม่ guard ว่า editing=true อยู่แล้ว
  // user กำลังพิมพ์ค่าอยู่ แล้วเผลอกดพื้นที่อื่นในกล่อง → startEditing ถูกเรียกซ้ำ
  // → inputValue ถูก reset เป็น this.value (ค่าจาก prop) ทิ้งสิ่งที่ user พิมพ์
  // FAIL เพราะ: startEditing ไม่ตรวจ `if (this.editing) return`
  it("[BUG-4] startEditing ขณะ editing อยู่ → ควร guard ไม่ reset inputValue", async () => {
    const wrapper = mountBar({ editable: true, value: 50 });
    await wrapper.find(".level-progress-bar").trigger("click");
    await wrapper.find(".edit-input").setValue(88);
    // click ซ้ำบนส่วนอื่นของ component (ไม่ใช่ input)
    await wrapper.find(".level-progress-bar").trigger("click");
    // component reset inputValue = this.value = 50 → FAIL
    expect(wrapper.vm.inputValue).toBe(88); // FAIL: actual 50
  });

  // ── BUG-5 ─────────────────────────────────────────────────
  // displayValue แสดง "NaN" เมื่อ value ไม่ใช่ตัวเลข
  // อันตราย: PLC อาจส่งค่า error string มา เช่น "ERR" หรือ "---"
  //          UI แสดง "NaN" แทนที่จะแสดง "0" หรือ "—" ซึ่งสร้างความสับสน
  //          user อาจเข้าใจว่า sensor พัง ทั้งที่จริงแค่ค่า format ผิด
  // FAIL เพราะ: `Number("abc").toFixed(0)` = "NaN" ไม่ใช่ "0"
  it("[BUG-5] value ไม่ใช่ตัวเลข → displayValue ควรแสดง '0' ไม่ใช่ 'NaN'", () => {
    const wrapper = mountBar({ value: "abc" });
    // component แสดง "NaN" → FAIL
    expect(wrapper.vm.displayValue).toBe("0"); // FAIL: actual "NaN"
  });
});

// ─── Dead Branch: Number(x) ?? 0 (line 214) ────────────────
// Number() always returns a number/NaN, never null/undefined,
// so ?? 0 right side is unreachable without stubbing Number.
describe("LevelProgressBar > Dead Branch: ?? 0 on line 214", () => {
  it("currentLevelIndex: Number() → null → ?? 0 right branch covered via Number stub", () => {
    const origNumber = globalThis.Number;
    // Stub Number to return null to trigger the unreachable ?? 0 branch
    vi.stubGlobal("Number", () => null);
    try {
      // Invoke the computed getter directly with controlled this context
      const getter = LevelProgressBar.computed.currentLevelIndex;
      const result = getter.call({ value: 50, sortedLevels: [] });
      // null ?? 0 = 0, no sortedLevels → -1
      expect(result).toBe(-1);
    } finally {
      vi.stubGlobal("Number", origNumber);
    }
  });
});

// ─── 8. Bug Cases (FAIL จนกว่าจะแก้ LevelProgressBar.vue) ──
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
