import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import PlcDebugForm from "../../../components/setting/PlcDebugForm.vue";

// ─── Mock fetch & localStorage ──────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("localStorage", {
  getItem: () => "fake-token",
  setItem: () => {},
});

function mountForm() {
  return mount(PlcDebugForm);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("PlcDebugForm > Render", () => {
  it("render สำเร็จ", () => {
    const wrapper = mountForm();
    expect(wrapper.find(".card").exists()).toBe(true);
    expect(wrapper.text()).toContain("PLC Debug");
  });

  it("แสดง input address default = M0", () => {
    const wrapper = mountForm();
    expect(wrapper.vm.address).toBe("M0");
  });

  it("แสดง input interval default = 1000", () => {
    const wrapper = mountForm();
    expect(wrapper.vm.interval).toBe(1000);
  });

  it("แสดงปุ่ม Test และ Poll", () => {
    const wrapper = mountForm();
    expect(wrapper.text()).toContain("Test");
    expect(wrapper.text()).toContain("Poll");
  });

  it("ไม่แสดง result block เมื่อ result = null", () => {
    const wrapper = mountForm();
    expect(wrapper.find(".alert-light").exists()).toBe(false);
  });

  it("ไม่แสดง error block เมื่อ error = ''", () => {
    const wrapper = mountForm();
    expect(wrapper.find(".alert-danger").exists()).toBe(false);
  });

  it("แสดง result block เมื่อมี result", async () => {
    const wrapper = mountForm();
    wrapper.vm.result = { value: 42, time: "10:00:00" };
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".alert-light").exists()).toBe(true);
    expect(wrapper.text()).toContain("42");
    expect(wrapper.text()).toContain("10:00:00");
  });

  it("แสดง error block เมื่อมี error", async () => {
    const wrapper = mountForm();
    wrapper.vm.error = "PLC offline";
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".alert-danger").exists()).toBe(true);
    expect(wrapper.text()).toContain("PLC offline");
  });
});

// ─── 2. DOM Interactions ───────────────────────────────────
describe("PlcDebugForm > DOM Interactions", () => {
  it("DOM: input address → v-model setter ทำงาน", async () => {
    const wrapper = mountForm();
    const addressInput = wrapper.find('input[placeholder="M0, D10"]');
    await addressInput.setValue("D100");
    expect(wrapper.vm.address).toBe("D100");
  });

  it("DOM: input interval → v-model.number setter ทำงาน", async () => {
    const wrapper = mountForm();
    const intervalInput = wrapper.find('input[type="number"]');
    await intervalInput.setValue("2000");
    expect(wrapper.vm.interval).toBe(2000);
  });

  it("DOM: คลิกปุ่ม Test → readOnce ถูกเรียก", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 55 }),
    });
    const wrapper = mountForm();
    const readSpy = vi.spyOn(wrapper.vm, "readOnce");
    await wrapper.find(".btn-outline-primary").trigger("click");
    expect(readSpy).toHaveBeenCalled();
  });

  it("DOM: คลิกปุ่ม Poll → togglePolling ถูกเรียก", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 0 }),
    });
    const wrapper = mountForm();
    const toggleSpy = vi.spyOn(wrapper.vm, "togglePolling");
    await wrapper.find(".btn-outline-secondary").trigger("click");
    expect(toggleSpy).toHaveBeenCalled();
  });

  it("ปุ่ม Test ถูก disabled เมื่อ loading", async () => {
    const wrapper = mountForm();
    wrapper.vm.loading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".btn-outline-primary").attributes("disabled")).toBeDefined();
  });

  it("ปุ่ม Poll ถูก disabled เมื่อ loading", async () => {
    const wrapper = mountForm();
    wrapper.vm.loading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".btn-outline-secondary").attributes("disabled")).toBeDefined();
  });

  it("ปุ่ม Poll แสดง 'Stop' เมื่อ timer กำลังทำงาน", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 0 }),
    });
    const wrapper = mountForm();
    wrapper.vm.startPolling();
    wrapper.vm.loading = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Stop");
  });

  it("ปุ่ม Poll แสดง 'Poll' เมื่อ timer = null", async () => {
    const wrapper = mountForm();
    expect(wrapper.text()).toContain("Poll");
  });
});

// ─── 3. readOnce ────────────────────────────────────────────
describe("PlcDebugForm > Read Once", () => {
  it("readOnce สำเร็จ → แสดงผลลัพธ์", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 42 }),
    });

    const wrapper = mountForm();
    await wrapper.vm.readOnce();

    expect(mockFetch).toHaveBeenCalled();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/plc/read?address=M0");
    expect(wrapper.vm.result.value).toBe(42);
    expect(wrapper.vm.loading).toBe(false);
  });

  it("readOnce สำเร็จ → result.time เป็น string เวลา", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 99 }),
    });
    const wrapper = mountForm();
    await wrapper.vm.readOnce();
    expect(typeof wrapper.vm.result.time).toBe("string");
    expect(wrapper.vm.result.time.length).toBeGreaterThan(0);
  });

  it("readOnce → ล้าง error ก่อน fetch", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 1 }),
    });
    const wrapper = mountForm();
    wrapper.vm.error = "previous error";
    await wrapper.vm.readOnce();
    expect(wrapper.vm.error).toBe("");
  });

  it("readOnce ล้มเหลว → แสดง error (API message)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "PLC offline" }),
    });

    const wrapper = mountForm();
    await wrapper.vm.readOnce();

    expect(wrapper.vm.error).toBe("PLC offline");
    expect(wrapper.vm.loading).toBe(false);
  });

  it("readOnce ล้มเหลว ไม่มี message → fallback 'Read failed'", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}), // no message field
    });

    const wrapper = mountForm();
    await wrapper.vm.readOnce();

    expect(wrapper.vm.error).toBe("Read failed");
  });

  it("readOnce network error → แสดง error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const wrapper = mountForm();
    await wrapper.vm.readOnce();

    expect(wrapper.vm.error).toBe("Network error");
  });

  it("readOnce → loading = true ระหว่าง fetch แล้ว false หลังจบ", async () => {
    let resolveJson;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => new Promise(r => { resolveJson = r; }),
    });

    const wrapper = mountForm();
    const promise = wrapper.vm.readOnce();
    // loading ถูก set ก่อน await fetch() → ตรวจได้ทันที
    expect(wrapper.vm.loading).toBe(true);
    // flush microtask: ให้ await fetch() resolve ก่อน → readOnce เรียก res.json() → resolveJson ถูก set
    await Promise.resolve();
    resolveJson({ value: 0 });
    await promise;
    expect(wrapper.vm.loading).toBe(false);
  });

  it("ส่ง Authorization header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 0 }),
    });

    const wrapper = mountForm();
    await wrapper.vm.readOnce();

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers.Authorization).toContain("Bearer");
  });

  it("address encode ใน URL ถูกต้อง", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 0 }),
    });
    const wrapper = mountForm();
    wrapper.vm.address = "D 10";
    await wrapper.vm.readOnce();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("D%2010");
    expect(url).not.toContain(" ");
  });
});

// ─── 4. Polling ─────────────────────────────────────────────
describe("PlcDebugForm > Polling", () => {
  it("startPolling → เรียก readOnce ทันที + setInterval", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 1 }),
    });

    const wrapper = mountForm();
    wrapper.vm.startPolling();

    expect(wrapper.vm.timer).not.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("startPolling → interval timer ทำงานหลังผ่านเวลา", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 1 }),
    });
    const wrapper = mountForm();
    wrapper.vm.startPolling();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    await Promise.resolve(); // flush microtasks
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("stopPolling → clearInterval + timer = null", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 1 }),
    });

    const wrapper = mountForm();
    wrapper.vm.startPolling();
    expect(wrapper.vm.timer).not.toBeNull();

    wrapper.vm.stopPolling();
    expect(wrapper.vm.timer).toBeNull();
  });

  it("stopPolling เมื่อ timer = null → no-op (ไม่ crash)", () => {
    const wrapper = mountForm();
    expect(wrapper.vm.timer).toBeNull();
    expect(() => wrapper.vm.stopPolling()).not.toThrow();
    expect(wrapper.vm.timer).toBeNull();
  });

  it("togglePolling → สลับ start/stop", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 0 }),
    });

    const wrapper = mountForm();
    wrapper.vm.togglePolling();
    expect(wrapper.vm.timer).not.toBeNull();

    wrapper.vm.togglePolling();
    expect(wrapper.vm.timer).toBeNull();
  });

  it("ปุ่ม Poll แสดง Stop เมื่อ polling", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 0 }),
    });

    const wrapper = mountForm();
    wrapper.vm.startPolling();
    wrapper.vm.loading = false;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Stop");
  });
});

// ─── 5. Lifecycle ───────────────────────────────────────────
describe("PlcDebugForm > Lifecycle", () => {
  it("beforeUnmount → stopPolling ถูกเรียก + timer cleared", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 0 }),
    });

    const wrapper = mountForm();
    wrapper.vm.startPolling();
    expect(wrapper.vm.timer).not.toBeNull();

    wrapper.unmount();
    // timer should be cleared (beforeUnmount calls stopPolling)
    expect(wrapper.vm.timer).toBeNull();
  });

  it("beforeUnmount เมื่อไม่มี timer → ไม่ crash", () => {
    const wrapper = mountForm();
    expect(wrapper.vm.timer).toBeNull();
    expect(() => wrapper.unmount()).not.toThrow();
  });
});

// ─── 6. Bug Cases (PASS) ───────────────────────────────────
describe("PlcDebugForm > Bug Cases (PASS)", () => {
  it("[BUG-1] address มี space → URL ต้อง encode ถูกต้อง (encodeURIComponent)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 0 }),
    });

    const wrapper = mountForm();
    wrapper.vm.address = "M 10";
    await wrapper.vm.readOnce();

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain(" ");
  });
});

// ─── 7. Bug Cases (FAIL — อันตราย) ─────────────────────────
describe("PlcDebugForm > Bug Cases (FAIL)", () => {

  // BUG-2: readOnce เรียก res.json() ก่อนตรวจ res.ok
  //        ถ้า server ส่ง 500 กับ HTML body (non-JSON) → res.json() throw SyntaxError
  //        catch block จะได้ SyntaxError นั้น ทำให้ this.error เป็น JSON parse error message
  //        แทนที่จะแสดง "Read failed" (fallback ที่ developer ตั้งใจไว้)
  // อันตราย: ผู้ใช้เห็น error เช่น "SyntaxError: Unexpected token < in JSON at position 0"
  //          แทนที่จะเห็น "Read failed" ที่ user-friendly
  //          ยิ่งร้ายถ้า HTML error page มี stack trace หรือ server info → information leakage
  // FAIL เพราะ: code ทำ `const data = await res.json()` ก่อน if (!res.ok)
  //             ถ้า json() throw → ค่า fallback "Read failed" ใน `data.message || "Read failed"` ไม่ถูกใช้เลย
  //             catch ได้ SyntaxError จาก json() แทน
  it("[BUG-2] readOnce res.ok=false + non-JSON body → error ควรเป็น 'Read failed' ไม่ใช่ SyntaxError (FAIL)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new SyntaxError("Unexpected token < in JSON at position 0")),
    });

    const wrapper = mountForm();
    await wrapper.vm.readOnce();

    // คาดหวัง: แสดง fallback "Read failed" เพราะ res.ok=false
    expect(wrapper.vm.error).toBe("Read failed"); // FAIL: จะได้ "Unexpected token < in JSON at position 0"
  });

  // BUG-3: startPolling() ไม่ตรวจว่ามี timer อยู่แล้ว → เรียก 2 ครั้ง = 2 intervals
  // อันตราย: interval เดิม LEAK ไม่ถูก clear เมื่อ override ด้วย timer ใหม่
  //          2 intervals ทำงานพร้อมกัน → 2x fetch calls ทุก tick → สร้าง load ให้ PLC/backend ผิดปกติ
  //          หลังจาก stopPolling() → interval ใหม่ถูก clear แต่ interval เดิมยังทำงาน (leaked)
  //          ยิ่ง startPolling N ครั้ง → N intervals leak ไปเรื่อยๆ
  // FAIL เพราะ: startPolling ไม่มี `if (this.timer) this.stopPolling()` ก่อน set interval ใหม่
  //             this.timer = setInterval(...) ทับของเดิมโดยไม่ clearInterval ก่อน
  it("[BUG-3] startPolling() เรียก 2 ครั้ง → interval เดิม leak ยังทำงานอยู่ (FAIL)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 1 }),
    });

    const wrapper = mountForm();
    wrapper.vm.startPolling(); // เรียกครั้งแรก → timer1
    const firstTimer = wrapper.vm.timer;

    wrapper.vm.startPolling(); // เรียกครั้งสอง → timer2, timer1 ถูก LEAK

    // advance time เพื่อนับ calls
    vi.advanceTimersByTime(1000);
    await Promise.resolve();

    // คาดหวัง: ควรมี timer ใดเดิมทำงาน 1 ชุดเท่านั้น (ไม่นับ readOnce ตอน start)
    // ถ้า 2 intervals ทำงาน → calls หลัง 1000ms จะเป็น 2 แทนที่จะเป็น 1
    const callsAfterTick = mockFetch.mock.calls.length - 2; // หัก 2 calls จาก startPolling x2

    // คาดหวัง: หลัง 1 tick ควรมี fetch เพิ่มแค่ 1 ครั้ง (1 interval)
    expect(callsAfterTick).toBeLessThanOrEqual(1); // FAIL: จะเป็น 2 (leaked interval ยังทำงาน)
  });

  // BUG-4: interval ไม่มี minimum enforcement ใน JavaScript
  // อันตราย: input HTML มี min="500" แต่ไม่มี JS guard → ผู้ใช้ set wrapper.vm.interval = 1
  //          setInterval(readOnce, 1) → fetch ทุก 1ms → request flooding: 1000+ req/sec
  //          backend, PLC อาจรับไม่ไหว, crash หรือ rate-limit
  //          ยิ่งร้ายถ้า readOnce เป็น write/toggle command ไม่ใช่แค่ read
  // FAIL เพราะ: startPolling ทำ `this.timer = setInterval(this.readOnce, this.interval)` โดยตรง
  //             ไม่มี `const safe = Math.max(500, this.interval)` หรือ guard ใดๆ
  it("[BUG-4] interval=1 → setInterval ด้วย 1ms → API flooding (FAIL)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 1 }),
    });

    const wrapper = mountForm();
    wrapper.vm.interval = 1; // ต่ำกว่า min="500" มาก
    wrapper.vm.startPolling();

    vi.advanceTimersByTime(10); // เลื่อน 10ms: interval=1 → ~10 ticks, interval=500 → 0 ticks
    await Promise.resolve();

    // คาดหวัง: ถ้า interval ถูก clamp เป็น 500 → หลัง 10ms ไม่มี tick เพิ่ม (0 extra calls)
    // FAIL: interval=1 → setInterval(readOnce, 1) → หลัง 10ms มี ~10 extra calls
    const extraCalls = mockFetch.mock.calls.length - 1; // หัก 1 จาก readOnce() ตอน start
    expect(extraCalls).toBe(0); // FAIL: จะได้ ~10
  });

  // BUG-5: readOnce ไม่มี concurrent call guard → ถ้า loading=true ยังรันได้อีก
  // อันตราย: polling interval ทำงาน, readOnce ครั้งแรกยังไม่จบ (network ช้า)
  //          interval ครั้งถัดไปเรียก readOnce อีก → 2 requests concurrent
  //          ผลลัพธ์ที่มาทีหลังอาจ override ผลที่มาก่อน (race condition)
  //          this.result แสดงค่าจาก request ที่ arrive ทีหลัง ไม่ใช่ล่าสุด
  //          ยิ่งอันตรายถ้า readOnce เป็น write/toggle command
  // FAIL เพราะ: readOnce ไม่มี `if (this.loading) return` guard
  //             loading = true ก็ยังสามารถ call readOnce ซ้ำได้
  it("[BUG-5] readOnce ไม่มี guard → loading=true ยัง fetch ได้ (race condition) (FAIL)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 1 }),
    });

    const wrapper = mountForm();
    wrapper.vm.loading = true; // simulate: first request in-flight

    // เรียก readOnce ซ้ำขณะ loading = true
    await wrapper.vm.readOnce();

    // คาดหวัง: readOnce ควร no-op เมื่อ loading=true (guard)
    expect(mockFetch).not.toHaveBeenCalled(); // FAIL: fetch ถูกเรียกแม้ loading=true
  });
});
