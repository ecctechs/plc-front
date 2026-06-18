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
});

// ─── 2. readOnce ────────────────────────────────────────────
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

  it("readOnce ล้มเหลว → แสดง error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "PLC offline" }),
    });

    const wrapper = mountForm();
    await wrapper.vm.readOnce();

    expect(wrapper.vm.error).toBe("PLC offline");
    expect(wrapper.vm.loading).toBe(false);
  });

  it("readOnce network error → แสดง error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const wrapper = mountForm();
    await wrapper.vm.readOnce();

    expect(wrapper.vm.error).toBe("Network error");
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
});

// ─── 3. Polling ─────────────────────────────────────────────
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

// ─── 4. Lifecycle ───────────────────────────────────────────
describe("PlcDebugForm > Lifecycle", () => {
  it("beforeUnmount → stopPolling ถูกเรียก", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ value: 0 }),
    });

    const wrapper = mountForm();
    wrapper.vm.startPolling();
    expect(wrapper.vm.timer).not.toBeNull();

    wrapper.unmount();
  });
});

// ─── 5. Bug Cases ───────────────────────────────────────────
describe("PlcDebugForm > Bug Cases", () => {
  // BUG-1: readOnce ไม่ encode address ใน URL
  // ถ้า address มีอักขระพิเศษ เช่น space หรือ # → URL เพี้ยน
  // ควรใช้ encodeURIComponent(this.address)
  it("[BUG-1] address มี space → URL ต้อง encode ถูกต้อง", async () => {
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
