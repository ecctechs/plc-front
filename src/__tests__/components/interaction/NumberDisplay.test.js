import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import NumberDisplay from "../../../components/interaction/NumberDisplay.vue";

const defaultProps = {
  x_percent: 50,
  y_percent: 30,
};

// ─── Render ──────────────────────────────────────────────────

describe("NumberDisplay > Render", () => {
  it("render component ได้สำเร็จ", () => {
    const wrapper = mount(NumberDisplay, { props: defaultProps });
    expect(wrapper.find(".number-display").exists()).toBe(true);
  });

  it("แสดงค่าตัวเลขตาม prop value", () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, value: 42 },
    });
    expect(wrapper.find(".display-value").text()).toBe("42");
  });

  it("แสดงทศนิยมตาม prop decimals", () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, value: 3.14159, decimals: 2 },
    });
    expect(wrapper.find(".display-value").text()).toBe("3.14");
  });

  it("แสดงชื่อเมื่อส่ง prop name", () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, name: "อุณหภูมิ" },
    });
    expect(wrapper.find(".display-name").text()).toBe("อุณหภูมิ");
  });

  it("แสดงหน่วยเมื่อส่ง prop unit", () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, value: 25, unit: "°C" },
    });
    expect(wrapper.find(".display-unit").text()).toBe("°C");
  });

  it("ซ่อนหน่วยเมื่อไม่มี prop unit", () => {
    const wrapper = mount(NumberDisplay, { props: defaultProps });
    expect(wrapper.find(".display-unit").exists()).toBe(false);
  });
});

// ─── Editable Mode ───────────────────────────────────────────

describe("NumberDisplay > Editable", () => {
  it("editable = false → คลิกแล้วไม่เข้า edit mode", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: false },
    });
    await wrapper.find(".number-display").trigger("click");
    expect(wrapper.find("input").exists()).toBe(false);
  });

  it("editable = true → คลิกแล้วแสดง input", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: true, value: 100 },
    });
    await wrapper.find(".number-display").trigger("click");
    expect(wrapper.find("input").exists()).toBe(true);
  });

  it("กด Enter → emit 'update-value' พร้อมค่าใหม่", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: true, value: 50, addressId: 1 },
    });

    await wrapper.find(".number-display").trigger("click");
    await wrapper.find("input").setValue(75);
    await wrapper.find("input").trigger("keyup.enter");

    expect(wrapper.emitted("update-value")).toHaveLength(1);
    expect(wrapper.emitted("update-value")[0][0]).toEqual({
      addressId: 1,
      value: 75,
    });
  });

  it("กด Escape → ยกเลิก ไม่ emit", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: true, value: 50 },
    });

    await wrapper.find(".number-display").trigger("click");
    await wrapper.find("input").trigger("keyup.escape");

    expect(wrapper.emitted("update-value")).toBeUndefined();
    expect(wrapper.find("input").exists()).toBe(false);
  });

  // fn12 + b15: blur on input → finishEditing (covers anonymous handler at L19)
  it("blur บน input → ออก edit mode และ emit update-value", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: true, value: 77, addressId: 5 },
    });
    await wrapper.find(".number-display").trigger("click");
    await wrapper.find("input").trigger("blur");
    expect(wrapper.vm.editing).toBe(false);
    expect(wrapper.emitted("update-value")).toBeTruthy();
    expect(wrapper.emitted("update-value")[0][0].addressId).toBe(5);
  });

  // fn15: @click.stop on input → ไม่ bubble ขึ้น startEditing (covers anonymous handler L22)
  it("click บน input (@click.stop) → editing ยังคง true", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: true, value: 50 },
    });
    await wrapper.find(".number-display").trigger("click");
    await wrapper.find("input").setValue(88);
    await wrapper.find("input").trigger("click");
    expect(wrapper.vm.editing).toBe(true);
    expect(wrapper.vm.inputValue).toBe(88);
  });
});

// ─── displayValue ─────────────────────────────────────────────
describe("NumberDisplay > displayValue", () => {
  // b0[1] + s4 L109: value เป็น string → return as-is (ไม่ toFixed)
  it("value เป็น string → แสดงตรง ๆ ไม่ผ่าน toFixed", () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, value: "ON" },
    });
    expect(wrapper.find(".display-value").text()).toBe("ON");
  });
});

// ─── displayStyle ─────────────────────────────────────────────
describe("NumberDisplay > displayStyle", () => {
  // b1[1] L118: bgColor falsy → fallback rgba(0,0,0,0.8)
  it("bgColor เป็น '' → background fallback เป็น rgba(0,0,0,0.8)", () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, bgColor: "" },
    });
    expect(wrapper.vm.displayStyle.background).toBe("rgba(0, 0, 0, 0.8)");
  });
});

// ─── Value Watcher ────────────────────────────────────────────
describe("NumberDisplay > value watcher", () => {
  // b3[1] L135: editing=true → inputValue ไม่เปลี่ยนตาม prop
  it("value เปลี่ยนขณะ editing=true → inputValue คงค่าที่ user พิมพ์", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: true, value: 50 },
    });
    await wrapper.find(".number-display").trigger("click");
    expect(wrapper.vm.editing).toBe(true);
    await wrapper.setProps({ value: 99 });
    expect(wrapper.vm.inputValue).toBe(50);
  });
});

// ─── startEditing ─────────────────────────────────────────────
describe("NumberDisplay > startEditing", () => {
  // b5[1] L150: inputField null ใน nextTick → ไม่ throw
  it("startEditing: $refs.inputField null ใน nextTick → ไม่ throw (defensive guard)", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: true },
    });
    // render input ก่อน เพื่อให้ $refs.inputField มี property อยู่แล้ว
    await wrapper.find(".number-display").trigger("click");
    await flushPromises();
    expect(wrapper.vm.$refs.inputField).toBeTruthy();
    // override ref ให้ return null
    Object.defineProperty(wrapper.vm.$refs, "inputField", {
      get: () => null,
      set: () => {},
      configurable: true,
    });
    wrapper.vm.startEditing();
    await flushPromises();
    expect(wrapper.vm.editing).toBe(true);
  });
});

// ─── onInput ──────────────────────────────────────────────────
describe("NumberDisplay > onInput", () => {
  // b6[1] L157: parseFloat('abc') = NaN → || 0 right side
  it("onInput ตัวอักษร → inputValue = 0 (|| 0 path)", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: true },
    });
    await wrapper.find(".number-display").trigger("click");
    wrapper.vm.onInput({ target: { value: "abc" } });
    expect(wrapper.vm.inputValue).toBe(0);
  });
});

// ─── finishEditing ────────────────────────────────────────────
describe("NumberDisplay > finishEditing", () => {
  // b7[0] L160: editable=false → early return ไม่ emit
  it("finishEditing เมื่อ editable=false → ไม่ emit", () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: false },
    });
    wrapper.vm.finishEditing();
    expect(wrapper.emitted("update-value")).toBeUndefined();
  });
});

// ─── Bug Cases (ตั้งใจให้ FAIL) ───────────────────────────────

describe("NumberDisplay > Bug Cases", () => {

  // ── BUG-1 ────────────────────────────────────────────────────
  // finishEditing ไม่ตรวจ `this.editing` → ถูกเรียกซ้ำหลัง cancelEditing
  // อันตราย: บนมือถือ blur มักยิงหลัง keyup.escape ทำให้ emit 1 ครั้ง
  //          ค่าที่ส่งคือ this.inputValue ที่ถูก reset = this.value
  //          → PLC ได้รับ write command ทั้ง ๆ ที่ user กด Cancel
  // FAIL เพราะ: finishEditing ไม่มี `if (!this.editing) return`
  it("[BUG-1] blur หลัง Escape → ไม่ควร emit (finishEditing ต้องตรวจ editing state)", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: true, value: 50, addressId: 1 },
    });
    await wrapper.find(".number-display").trigger("click");
    await wrapper.find("input").trigger("keyup.escape"); // editing=false, inputValue reset
    await wrapper.find("input").trigger("blur");         // blur fires after escape (common mobile)
    // ควร: ไม่มี emit เพราะ user กด Cancel
    expect(wrapper.emitted("update-value")).toBeUndefined(); // FAIL: actual 1 event
  });

  // ── BUG-2 ────────────────────────────────────────────────────
  // onInput ตัวอักษร → inputValue reset เป็น 0 แทนที่จะคงค่าเดิม
  // อันตราย: user พิมพ์ผิด (เช่น "1a") → inputValue=0 → กด Enter → PLC รับ 0
  //          เช่น setpoint ของ pressure control → ระบบ depressurize ทันที
  // FAIL เพราะ: `parseFloat("abc") || 0` = 0 ทิ้งค่าเดิมไปเลย
  it("[BUG-2] onInput ตัวอักษร → ควรคง inputValue เดิม ไม่ reset เป็น 0", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: true, value: 50 },
    });
    await wrapper.find(".number-display").trigger("click");
    wrapper.vm.inputValue = 50;
    wrapper.vm.onInput({ target: { value: "abc" } });
    expect(wrapper.vm.inputValue).toBe(50); // FAIL: actual 0
  });

  // ── BUG-3 ────────────────────────────────────────────────────
  // value=NaN → displayValue แสดง "NaN" (NaN เป็น typeof 'number' → toFixed = "NaN")
  // อันตราย: PLC sensor error มักส่งค่า NaN หรือ Infinity มา
  //          UI แสดง "NaN" แทน "—" หรือ "0" → operator เข้าใจว่า sensor พัง
  //          อาจกด override แล้วส่งค่าผิดพลาดไปยัง PLC
  // FAIL เพราะ: `typeof NaN === 'number'` เป็น true → `NaN.toFixed(0)` = "NaN"
  it("[BUG-3] value=NaN → displayValue ควรแสดง '0' ไม่ใช่ 'NaN'", () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, value: NaN },
    });
    expect(wrapper.vm.displayValue).toBe("0"); // FAIL: actual "NaN"
  });

  // ── BUG-4 ────────────────────────────────────────────────────
  // startEditing ไม่ guard เมื่อ editing=true อยู่แล้ว → reset inputValue
  // อันตราย: user คลิกบริเวณอื่นใน component ขณะกำลังพิมพ์
  //          → inputValue ถูก reset เป็น this.value (ค่าจาก PLC)
  //          ทิ้งสิ่งที่ user พิมพ์ไป → frustrating และ error-prone
  // FAIL เพราะ: startEditing ไม่มี `if (this.editing) return`
  it("[BUG-4] startEditing ซ้ำขณะ editing → inputValue ไม่ควร reset", async () => {
    const wrapper = mount(NumberDisplay, {
      props: { ...defaultProps, editable: true, value: 50 },
    });
    await wrapper.find(".number-display").trigger("click");
    await wrapper.find("input").setValue(88);
    // click ส่วนอื่นของ component (bubble ขึ้น .number-display)
    await wrapper.find(".number-display").trigger("click");
    expect(wrapper.vm.inputValue).toBe(88); // FAIL: actual 50
  });

  // ── BUG-5 ────────────────────────────────────────────────────
  // finishEditing ไม่ clamp ค่าระหว่าง minValue และ maxValue
  // อันตราย: HTML :min/:max ป้องกันได้แค่ browser UI
  //          แต่ user สามารถพิมพ์ผ่าน keyboard หรือ programmatic setValue
  //          ค่าที่เกิน maxValue จะถูกส่งไปยัง PLC โดยตรง
  //          เช่น motor speed limit 100 RPM แต่ส่ง 9999 → motor เสียหาย
  // FAIL เพราะ: finishEditing ไม่มี clamp: Math.min(Math.max(value, minValue), maxValue)
  it("[BUG-5] finishEditing ไม่ clamp ค่า → ส่งค่าเกิน maxValue ไปยัง PLC", async () => {
    const wrapper = mount(NumberDisplay, {
      props: {
        ...defaultProps, editable: true,
        value: 50, minValue: 0, maxValue: 100, addressId: 1,
      },
    });
    await wrapper.find(".number-display").trigger("click");
    wrapper.vm.onInput({ target: { value: "9999" } }); // ค่าเกิน maxValue
    wrapper.vm.finishEditing();
    const emitted = wrapper.emitted("update-value")[0][0].value;
    expect(emitted).toBeLessThanOrEqual(100); // FAIL: actual 9999
  });
});
