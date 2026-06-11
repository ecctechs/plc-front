import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
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
});
