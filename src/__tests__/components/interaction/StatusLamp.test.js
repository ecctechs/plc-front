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

// ─── Bug Cases (ตั้งใจให้ FAIL) ───────────────────────────────

describe("StatusLamp > Bug Cases", () => {

  // ── BUG-1 ─────────────────────────────────────────────────
  // toggleLamp ไม่มี debounce / guard ด้วย isClicking
  // อันตราย: operator คลิกเร็ว ๆ → emit toggle หลายครั้งภายใน 300ms
  //          ถ้า addressId ตรงกับ solenoid valve หรือ motor relay
  //          → PLC ได้รับ ON/OFF สลับกันเร็ว ๆ → motor เสียหาย / valve chattering
  // FAIL เพราะ: toggleLamp ไม่ตรวจ `if (this.isClicking) return`
  it("[BUG-1] คลิกเร็ว ๆ ระหว่าง isClicking=true → ควร block emit ซ้ำ", async () => {
    vi.useFakeTimers();
    const wrapper = mount(StatusLamp, { props: defaultProps });
    await wrapper.find(".status-lamp").trigger("click"); // isClicking=true
    await wrapper.find(".status-lamp").trigger("click"); // ควร block
    await wrapper.find(".status-lamp").trigger("click"); // ควร block
    // ควร: 1 emit (debounce/guard 300ms)
    expect(wrapper.emitted("toggle")).toHaveLength(1); // FAIL: actual 3
    vi.useRealTimers();
  });

  // ── BUG-2 ─────────────────────────────────────────────────
  // inactiveColor fallback ในโค้ด (L80) ≠ prop default
  // prop default = '#6b7280' (gray) แต่ fallback ใน lightStyle = '#FF0000' (red!)
  // อันตราย: ถ้า parent ส่ง inactiveColor='' (blank string = falsy)
  //          lamp จะแสดงสีแดงแทนสีเทา → operator เข้าใจว่า lamp ติดอยู่ (ON)
  //          ทั้งที่จริง device อยู่ใน OFF state → อาจไม่ไป diagnose ที่ควรทำ
  // FAIL เพราะ: `this.inactiveColor || '#FF0000'` hardcode สีผิด
  it("[BUG-2] inactiveColor='' → ควรใช้สี default '#6b7280' ไม่ใช่ '#FF0000'", () => {
    const wrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: false, inactiveColor: "" },
    });
    // prop default คือ '#6b7280' (gray) แต่ fallback คือ '#FF0000' (red)
    expect(wrapper.vm.lightStyle.background).not.toBe("#FF0000"); // FAIL: actual '#FF0000'
  });

  // ── BUG-3 ─────────────────────────────────────────────────
  // StatusLamp.vue มี `addressId` prop ถูก define สองครั้ง (L51-53 และ L59-62)
  // อันตราย: JavaScript object literal ที่มี duplicate key → last definition wins (silent)
  //          ถ้า dev แก้ addressId ตัวแรก (เช่น เพิ่ม validator) แต่ลืมตัวที่สอง
  //          → Vue ใช้ตัวที่สอง (ไม่มี validator) โดยไม่มี error/warning
  //          → PLC address validation ถูก bypass → write ไปผิด address
  // FAIL เพราะ: Vue ไม่ warn เมื่อมี duplicate prop key ในนิยาม component
  it("[BUG-3] addressId define สองครั้งใน props → ควรมี warn แต่ไม่มี", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(StatusLamp, { props: defaultProps });
    // ควร: Vue/ESLint warn ว่า duplicate prop definition
    expect(warnSpy).toHaveBeenCalled(); // FAIL: Vue ไม่ warn (silent duplicate)
    warnSpy.mockRestore();
  });

  // ── BUG-4 ─────────────────────────────────────────────────
  // bgColor fallback ในโค้ด (L80) ≠ prop default
  // prop default = '#22c55e' (green) และ fallback = '#22c55e' (ตรงกัน)
  // แต่ inactiveColor prop default = '#6b7280' และ fallback = '#FF0000' (ไม่ตรง!)
  // อันตราย: ถ้า parent ส่ง bgColor='' (ON state) → lamp แสดงสีเขียว (บังเอิญถูก)
  //          แต่ถ้า parent ส่ง inactiveColor='' (OFF state) → lamp แสดงสีแดง (ผิด!)
  //          ระบบที่ใช้ red = danger/alarm → operator เข้าใจสถานะ OFF ว่าเป็น alarm
  // FAIL เพราะ: fallback สีสำหรับ inactive ต่างจาก prop default
  it("[BUG-4] bgColor='' ขณะ isOn=true → ควรใช้ prop default '#22c55e' (บังเอิญถูก)", () => {
    const wrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: true, bgColor: "" },
    });
    // bgColor fallback ตรงกับ prop default (ถูก) — แต่ logic ไม่ consistent กับ inactiveColor
    // ทดสอบให้ fail ด้วยการยืนยันว่า fallback ควรเป็น prop default ไม่ใช่ hardcode
    const defaultBgColor = "#22c55e";
    expect(wrapper.vm.lightStyle.background).toBe(defaultBgColor); // PASS (บังเอิญถูก)
    // test จริงที่ควร fail: ตรวจว่า fallback logic ไม่ consistent
    // เมื่อ bgColor fallback ถูก แต่ inactiveColor fallback ผิด → logic ไม่ consistent
    // ถ้า component ถูกแก้ให้ใช้ prop default → inactiveColor fallback จะเปลี่ยนเป็น '#6b7280'
    const inactiveWrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: false, inactiveColor: "" },
    });
    // ควร: '#6b7280' (prop default) — FAIL: actual '#FF0000'
    expect(inactiveWrapper.vm.lightStyle.background).toBe("#6b7280"); // FAIL: actual '#FF0000'
  });

  // ── BUG-5 ─────────────────────────────────────────────────
  // toggle emit ส่งแค่ !isOn ไม่ส่ง addressId
  // อันตราย: ถ้า parent มี StatusLamp หลาย ตัว และ handler ไม่ได้ bind addressId ไว้
  //          → parent ไม่รู้ว่า lamp ไหนถูก toggle → write ค่าไปผิด address ใน PLC
  //          เช่น toggle Pump-A แต่ PLC update Pump-B
  // FAIL เพราะ: $emit('toggle', !this.isOn) ไม่รวม addressId
  it("[BUG-5] emit 'toggle' ควรรวม addressId เพื่อให้ parent รู้ว่า lamp ไหนถูก toggle", async () => {
    const wrapper = mount(StatusLamp, {
      props: { ...defaultProps, isOn: false, addressId: 42 },
    });
    await wrapper.find(".status-lamp").trigger("click");
    const emittedPayload = wrapper.emitted("toggle")[0][0];
    // ควร: emit object { value: true, addressId: 42 } หรืออย่างน้อยมี addressId
    expect(typeof emittedPayload).toBe("object"); // FAIL: actual boolean (true)
  });
});
