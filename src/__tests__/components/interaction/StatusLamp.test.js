import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import StatusLamp from "../../../components/interaction/StatusLamp.vue";

// props เริ่มต้นที่ใช้ทุก test
const defaultProps = {
  x_percent: 50,
  y_percent: 30,
};

// ─── Render ──────────────────────────────────────────────────

describe("StatusLamp > Render", () => {
  it("render component ได้สำเร็จ", () => {
    const wrapper = mount(StatusLamp, { props: defaultProps });
    expect(wrapper.find(".status-lamp").exists()).toBe(true);
  });

  it("แสดงชื่อเมื่อส่ง prop name", () => {
    const wrapper = mount(StatusLamp, {
      props: { ...defaultProps, name: "Pump-01" },
    });
    expect(wrapper.find(".lamp-name").text()).toBe("Pump-01");
  });

  it("ซ่อนชื่อเมื่อไม่มี prop name", () => {
    const wrapper = mount(StatusLamp, { props: defaultProps });
    expect(wrapper.find(".lamp-name").exists()).toBe(false);
  });
});

// ─── Props: ตำแหน่งและขนาด ───────────────────────────────────

describe("StatusLamp > Position & Size", () => {
  it("ตั้งตำแหน่งตาม x_percent และ y_percent", () => {
    const wrapper = mount(StatusLamp, {
      props: { x_percent: 25, y_percent: 75 },
    });
    const style = wrapper.find(".status-lamp").attributes("style");
    expect(style).toContain("left: 25%");
    expect(style).toContain("top: 75%");
  });

  it("ขนาดเปลี่ยนตาม prop size", () => {
    const wrapper = mount(StatusLamp, {
      props: { ...defaultProps, size: 5 },
    });
    // jsdom ไม่ render clamp() — ตรวจผ่าน computed lampStyle แทน
    const lampStyle = wrapper.vm.lampStyle;
    expect(lampStyle.width).toContain("5vw");
    expect(lampStyle.height).toContain("5vw");
  });
});

// ─── Props: สถานะ ON / OFF ───────────────────────────────────

describe("StatusLamp > ON / OFF", () => {
  it("เมื่อ isOn = true → มี class is-on และแสดง glow", () => {
    const wrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: true },
    });
    expect(wrapper.find(".status-lamp").classes()).toContain("is-on");
    expect(wrapper.find(".lamp-glow").exists()).toBe(true);
  });

  it("เมื่อ isOn = false → ไม่มี class is-on และไม่มี glow", () => {
    const wrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: false },
    });
    expect(wrapper.find(".status-lamp").classes()).not.toContain("is-on");
    expect(wrapper.find(".lamp-glow").exists()).toBe(false);
  });

  it("สี light เปลี่ยนตาม isOn", () => {
    const onWrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: true, bgColor: "#ff0000" },
    });
    const offWrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: false, inactiveColor: "#999999" },
    });

    const onStyle = onWrapper.find(".lamp-light").attributes("style");
    const offStyle = offWrapper.find(".lamp-light").attributes("style");

    // jsdom แปลง hex เป็น rgb เช่น #ff0000 → rgb(255, 0, 0)
    expect(onStyle).toContain("rgb(255, 0, 0)");
    expect(offStyle).toContain("rgb(153, 153, 153)");
  });
});

// ─── Event: คลิก toggle ──────────────────────────────────────

describe("StatusLamp > Toggle Event", () => {
  it("คลิกแล้ว emit 'toggle' พร้อมค่าตรงข้าม", async () => {
    const wrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: false },
    });

    await wrapper.find(".status-lamp").trigger("click");

    expect(wrapper.emitted("toggle")).toHaveLength(1);
    expect(wrapper.emitted("toggle")[0]).toEqual([true]);
  });

  it("คลิกตอน ON → emit false", async () => {
    const wrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: true },
    });

    await wrapper.find(".status-lamp").trigger("click");

    expect(wrapper.emitted("toggle")[0]).toEqual([false]);
  });

  it("คลิกแล้วมี class is-clicking (animation)", async () => {
    const wrapper = mount(StatusLamp, { props: defaultProps });

    await wrapper.find(".status-lamp").trigger("click");

    expect(wrapper.find(".status-lamp").classes()).toContain("is-clicking");
  });

  // fn4 + s8: setTimeout callback → isClicking กลับเป็น false หลัง 300ms
  it("หลัง 300ms → isClicking กลับเป็น false (covers setTimeout callback)", async () => {
    vi.useFakeTimers();
    const wrapper = mount(StatusLamp, { props: defaultProps });
    await wrapper.find(".status-lamp").trigger("click");
    expect(wrapper.vm.isClicking).toBe(true);
    vi.advanceTimersByTime(300);
    await flushPromises();
    expect(wrapper.vm.isClicking).toBe(false);
    vi.useRealTimers();
  });

  // แสดง lamp-ripple ขณะ isClicking=true
  it("ขณะ isClicking=true → มี .lamp-ripple", async () => {
    const wrapper = mount(StatusLamp, { props: defaultProps });
    await wrapper.find(".status-lamp").trigger("click");
    expect(wrapper.find(".lamp-ripple").exists()).toBe(true);
  });
});

// ─── lightStyle fallbacks ──────────────────────────────────────
describe("StatusLamp > lightStyle fallbacks", () => {
  // b1[1] L80 col33: bgColor falsy → fallback '#22c55e'
  it("isOn=true, bgColor='' → color fallback '#22c55e'", () => {
    const wrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: true, bgColor: "" },
    });
    expect(wrapper.vm.lightStyle.background).toBe("#22c55e");
  });

  // b2[1] L80 col63: inactiveColor falsy → fallback '#FF0000'
  it("isOn=false, inactiveColor='' → color fallback '#FF0000'", () => {
    const wrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: false, inactiveColor: "" },
    });
    expect(wrapper.vm.lightStyle.background).toBe("#FF0000");
  });

  // isOn=false, boxShadow = 'none'
  it("isOn=false → boxShadow เป็น 'none'", () => {
    const wrapper = mount(StatusLamp, { props: { ...defaultProps, isOn: false } });
    expect(wrapper.vm.lightStyle.boxShadow).toBe("none");
  });
});

