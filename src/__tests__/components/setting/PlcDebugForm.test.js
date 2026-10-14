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
