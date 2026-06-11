import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ControlButton from "../../../components/interaction/ControlButton.vue";

const defaultProps = {
  x_percent: 50,
  y_percent: 30,
};

// ─── Render ──────────────────────────────────────────────────

describe("ControlButton > Render", () => {
  it("render component ได้สำเร็จ", () => {
    const wrapper = mount(ControlButton, { props: defaultProps });
    expect(wrapper.find(".control-button").exists()).toBe(true);
  });

  it("แสดง label ตาม prop (default = 'BTN')", () => {
    const wrapper = mount(ControlButton, { props: defaultProps });
    expect(wrapper.find(".button-text").text()).toBe("BTN");
  });

  it("แสดง label ตามที่กำหนด", () => {
    const wrapper = mount(ControlButton, {
      props: { ...defaultProps, label: "START" },
    });
    expect(wrapper.find(".button-text").text()).toBe("START");
  });

  it("แสดงชื่อเมื่อส่ง prop name", () => {
    const wrapper = mount(ControlButton, {
      props: { ...defaultProps, name: "Motor-01" },
    });
    expect(wrapper.find(".button-name").text()).toBe("Motor-01");
  });

  it("ซ่อนชื่อเมื่อไม่มี prop name", () => {
    const wrapper = mount(ControlButton, { props: defaultProps });
    expect(wrapper.find(".button-name").exists()).toBe(false);
  });
});

// ─── สถานะ Pressed ───────────────────────────────────────────

describe("ControlButton > Pressed State", () => {
  it("isPressed = true → มี class 'is-pressed'", () => {
    const wrapper = mount(ControlButton, {
      props: { ...defaultProps, isPressed: true },
    });
    expect(wrapper.find(".control-button").classes()).toContain("is-pressed");
  });

  it("isPressed = false → ไม่มี class 'is-pressed'", () => {
    const wrapper = mount(ControlButton, {
      props: { ...defaultProps, isPressed: false },
    });
    expect(wrapper.find(".control-button").classes()).not.toContain("is-pressed");
  });

  it("สีเปลี่ยนตาม isPressed", () => {
    const on = mount(ControlButton, {
      props: { ...defaultProps, isPressed: true },
    });
    const off = mount(ControlButton, {
      props: { ...defaultProps, isPressed: false },
    });
    const onBg = on.vm.buttonStyle.background;
    const offBg = off.vm.buttonStyle.background;
    expect(onBg).not.toBe(offBg);
  });
});

// ─── Disabled ────────────────────────────────────────────────

describe("ControlButton > Disabled", () => {
  it("disabled = true → ปุ่ม disabled", () => {
    const wrapper = mount(ControlButton, {
      props: { ...defaultProps, disabled: true },
    });
    expect(wrapper.find("button").element.disabled).toBe(true);
  });

  it("disabled = true → คลิกแล้วไม่ emit", async () => {
    const wrapper = mount(ControlButton, {
      props: { ...defaultProps, disabled: true },
    });
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("click")).toBeUndefined();
  });
});

// ─── Click Event ─────────────────────────────────────────────

describe("ControlButton > Click Event", () => {
  // root element เป็น <button> ทำให้ Vue Test Utils จับ click ซ้ำ
  // (native click + $emit click) จึงนับทีละ 2
  it("คลิกแล้ว emit 'click'", async () => {
    const wrapper = mount(ControlButton, { props: defaultProps });
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("click").length).toBeGreaterThanOrEqual(1);
  });

  it("คลิก 3 ครั้ง → emit เพิ่มขึ้นทุกครั้ง", async () => {
    const wrapper = mount(ControlButton, { props: defaultProps });

    await wrapper.find("button").trigger("click");
    const afterOne = wrapper.emitted("click").length;

    await wrapper.find("button").trigger("click");
    const afterTwo = wrapper.emitted("click").length;

    await wrapper.find("button").trigger("click");
    const afterThree = wrapper.emitted("click").length;

    expect(afterTwo).toBeGreaterThan(afterOne);
    expect(afterThree).toBeGreaterThan(afterTwo);
  });
});
