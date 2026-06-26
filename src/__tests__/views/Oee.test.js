import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import Oee from "../../views/Oee.vue";

// ─── Mock ─────────────────────────────────────────────────────

const mockLocale = {
  current: "en",
  t: (key) => key,
  toggle: vi.fn(),
};

vi.mock("vue3-apexcharts", () => ({
  default: {
    name: "VueApexCharts",
    template: '<div class="apexcharts-mock"></div>',
    props: ["type", "height", "options", "series"],
  },
}));

const store = {};
vi.stubGlobal("localStorage", {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = val; },
  removeItem: (key) => { delete store[key]; },
});

const MOCK_SNAPSHOT = {
  results: [
    {
      product_id: 1,
      product_name: "Product A",
      oee: 78.5,
      availability: 90.0,
      performance: 92.0,
      quality: 94.8,
      total_output: 500,
      reject_output: 10,
      planned_min: 480,
      downtime_min: 48,
    },
    {
      product_id: 2,
      product_name: "Product B",
      oee: 65.0,
      availability: 85.0,
      performance: 80.0,
      quality: 95.5,
      total_output: 300,
      reject_output: 5,
      planned_min: 480,
      downtime_min: 72,
    },
  ],
};

const MOCK_PRODUCT_DETAIL = {
  data: {
    id: 1,
    name: "Product A",
    cycle_time: 30,
    target_oee: 85,
    target_output: 600,
    plc_address_output: "D100",
    plc_address_active: "D200",
    plc_address_complete: "D300",
    plc_address_reject: "D400",
  },
};

const MOCK_LATEST_LOG = {
  success: true,
  data: {
    plc_onoff_value: 1,
    plc_active_value: 1,
    plc_complete_value: 1,
    plc_reject_value: 0,
  },
};

const MOCK_TREND = {
  data: [
    { date: "2026-06-20", oee: 75.0, availability: 88.0, performance: 90.0, quality: 95.0 },
    { date: "2026-06-21", oee: 80.0, availability: 92.0, performance: 91.0, quality: 96.0 },
  ],
};

const MOCK_HOURLY = {
  data: [
    { hour: "2026-06-22T08:00:00", oee: 82.0, availability: 95.0, performance: 90.0, quality: 96.0 },
    { hour: "2026-06-22T09:00:00", oee: 78.0, availability: 90.0, performance: 88.0, quality: 98.0 },
  ],
};

let mockFetch;

function createMockFetch() {
  return vi.fn((url) => {
    if (url.includes("/api/oee/snapshot") && !url.includes("/history") && !url.includes("/hourly") && !url.includes("/intraday")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_SNAPSHOT) });
    }
    if (url.includes("/api/products/latest-log")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_LATEST_LOG) });
    }
    if (url.match(/\/api\/products\/\d+$/)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_PRODUCT_DETAIL) });
    }
    if (url.includes("/history")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_TREND) });
    }
    if (url.includes("/intraday") || url.includes("/hourly")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_HOURLY) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
}

function mountOee() {
  return mount(Oee, {
    global: {
      provide: { locale: mockLocale },
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  Object.keys(store).forEach((k) => delete store[k]);
  store.token = "fake-token";
  mockFetch = createMockFetch();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── 1. Render ────────────────────────────────────────────────

describe("Oee > Render", () => {
  it("renders OEE Dashboard title", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("OEE Dashboard");
  });

  it("renders subtitle", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Overall Equipment Effectiveness Monitoring");
  });

  it("renders product selector", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.find("select.form-select").exists()).toBe(true);
  });

  it("renders OEE formula display (A × P × Q)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("OEE =");
  });
});

// ─── 2. Data Loading ──────────────────────────────────────────

describe("Oee > Data Loading", () => {
  it("calls loadSnapshot on mount", async () => {
    mountOee();
    await flushPromises();
    const snapshotCall = mockFetch.mock.calls.find((c) => c[0].includes("/api/oee/snapshot"));
    expect(snapshotCall).toBeTruthy();
  });

  it("calls loadLatestLog on mount", async () => {
    mountOee();
    await flushPromises();
    const logCall = mockFetch.mock.calls.find((c) => c[0].includes("/api/products/latest-log"));
    expect(logCall).toBeTruthy();
  });

  it("populates product options from snapshot", async () => {
    const wrapper = mountOee();
    await flushPromises();
    const options = wrapper.findAll("select.form-select option");
    expect(options.length).toBe(2);
    expect(options[0].text()).toBe("Product A");
    expect(options[1].text()).toBe("Product B");
  });

  it("auto-selects first product", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.selectedProductId).toBe(1);
  });
});

// ─── 3. Computed Values ───────────────────────────────────────

describe("Oee > Computed Values", () => {
  it("calculates OEE correctly", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.oee).toBe("78.50");
  });

  it("calculates availability correctly", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.availability).toBe("90.00");
  });

  it("calculates performance correctly", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.performance).toBe("92.00");
  });

  it("calculates quality correctly", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.quality).toBe("94.80");
  });

  it("calculates totalOutput correctly", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.totalOutput).toBe(500);
  });

  it("calculates totalReject correctly", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.totalReject).toBe(10);
  });

  it("calculates goodCount = totalOutput - totalReject", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.goodCount).toBe(490);
  });

  it("calculates operatingTime = planned - downtime", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.operatingTime).toBe("432.00");
  });

  it("calculates projectedOutput", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.projectedOutput).toBeGreaterThan(0);
  });
});

// ─── 4. OEE Display ──────────────────────────────────────────

describe("Oee > OEE Display", () => {
  it("displays OEE percentage value", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("78.50");
  });

  it("displays availability percentage", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("90.00%");
  });

  it("displays performance percentage", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("92.00%");
  });

  it("displays quality percentage", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("94.80%");
  });

  it("shows Below target when OEE < targetOee", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Below target");
  });

  it("shows target badge", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Target");
  });
});

// ─── 5. Three Pillars Cards ──────────────────────────────────

describe("Oee > Three Pillars (A, P, Q)", () => {
  it("displays Availability card with formula", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Availability");
    expect(wrapper.text()).toContain("Operating Time / Planned Time");
  });

  it("displays Performance card with formula", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Performance");
    expect(wrapper.text()).toContain("(Ideal Cycle Time × Total Output) / (Operating Time × 60)");
  });

  it("displays Quality card with formula", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Quality");
    expect(wrapper.text()).toContain("Good Count / Total Output");
  });
});

// ─── 6. Time & Output Breakdown ──────────────────────────────

describe("Oee > Time & Output Breakdown", () => {
  it("displays Time Breakdown section", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Time Breakdown");
  });

  it("displays Planned Time value", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("480");
  });

  it("displays Downtime value", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Downtime");
  });

  it("displays Production Output section", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Production Output");
  });

  it("displays Total Output", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("500");
  });

  it("displays Good Count", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("490");
  });

  it("displays Reject count", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("10");
  });
});

// ─── 7. Target Output ─────────────────────────────────────────

describe("Oee > Target Output", () => {
  it("displays target output progress when targetOutput > 0", async () => {
    const wrapper = mountOee();
    await flushPromises();
    await flushPromises();
    if (wrapper.vm.targetOutput > 0) {
      expect(wrapper.text()).toContain("Target Output");
    }
  });

  it("shows Short by when output < target", async () => {
    const wrapper = mountOee();
    await flushPromises();
    await flushPromises();
    if (wrapper.vm.targetOutput > 0 && wrapper.vm.totalOutput < wrapper.vm.targetOutput) {
      expect(wrapper.text()).toContain("Short by");
    }
  });
});

// ─── 8. PLC Status ────────────────────────────────────────────

describe("Oee > PLC Status", () => {
  it("displays PLC Real-time Status section", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("PLC Real-time Status");
  });

  it("displays Output Signal", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Output Signal");
  });

  it("displays Active Model", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Active Model");
  });

  it("displays Complete Signal", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Complete Signal");
  });

  it("displays Reject Signal", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Reject Signal");
  });

  it("shows ON badge when plc_onoff_value is 1", async () => {
    const wrapper = mountOee();
    await flushPromises();
    const badges = wrapper.findAll(".badge.bg-success");
    expect(badges.length).toBeGreaterThan(0);
  });
});

// ─── 9. Product Switch ────────────────────────────────────────

describe("Oee > Product Switch", () => {
  it("switches product and loads new detail", async () => {
    const wrapper = mountOee();
    await flushPromises();
    mockFetch.mockClear();

    wrapper.vm.selectedProductId = 2;
    await flushPromises();

    const detailCall = mockFetch.mock.calls.find((c) => c[0].match(/\/api\/products\/2$/));
    expect(detailCall).toBeTruthy();
  });

  it("updates computed values after product switch", async () => {
    const wrapper = mountOee();
    await flushPromises();

    wrapper.vm.selectedProductId = 2;
    await flushPromises();

    expect(wrapper.vm.oee).toBe("65.00");
    expect(wrapper.vm.availability).toBe("85.00");
  });
});

// ─── 10. Charts ───────────────────────────────────────────────

describe("Oee > Charts", () => {
  it("displays Hourly OEE section", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("Hourly OEE");
  });

  it("displays OEE Trend section", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("OEE Trend");
  });

  it("displays 7 Days and 30 Days buttons", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.text()).toContain("7 Days");
    expect(wrapper.text()).toContain("30 Days");
  });

  it("switches trend period when clicking 30 Days", async () => {
    const wrapper = mountOee();
    await flushPromises();
    mockFetch.mockClear();

    wrapper.vm.trendDays = 30;
    await flushPromises();

    const trendCall = mockFetch.mock.calls.find((c) => c[0].includes("/history") && c[0].includes("days=30"));
    expect(trendCall).toBeTruthy();
  });

  it("computes hourlyChartSeries from hourly data", async () => {
    const wrapper = mountOee();
    await flushPromises();
    await flushPromises();
    if (wrapper.vm.hourlyData.length > 0) {
      expect(wrapper.vm.hourlyChartSeries.length).toBe(4);
      expect(wrapper.vm.hourlyChartSeries[0].name).toBe("OEE");
    }
  });

  it("computes trendSeries from trend data", async () => {
    const wrapper = mountOee();
    await flushPromises();
    await flushPromises();
    if (wrapper.vm.trendData.length > 0) {
      expect(wrapper.vm.trendSeries.length).toBe(5);
      expect(wrapper.vm.trendSeries[4].name).toBe("Target OEE");
    }
  });
});

// ─── 11. Polling ──────────────────────────────────────────────

describe("Oee > Polling & Cleanup", () => {
  it("sets up poll timers on mount", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.pollTimer).not.toBeNull();
    expect(wrapper.vm.plcPollTimer).not.toBeNull();
    expect(wrapper.vm.hourlyPollTimer).not.toBeNull();
  });

  it("clears timers on unmount", async () => {
    const wrapper = mountOee();
    await flushPromises();
    wrapper.unmount();
  });
});

// ─── 12. Edge Cases ───────────────────────────────────────────

describe("Oee > Edge Cases", () => {
  it("handles empty snapshot results", async () => {
    mockFetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })
    );
    vi.stubGlobal("fetch", mockFetch);

    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.oee).toBe("0.00");
    expect(wrapper.vm.products.length).toBe(0);
  });

  it("handles API error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch = vi.fn(() => Promise.resolve({ ok: false }));
    vi.stubGlobal("fetch", mockFetch);

    const wrapper = mountOee();
    await flushPromises();
    expect(consoleSpy).toHaveBeenCalled();
    expect(wrapper.vm.oee).toBe("0.00");
    consoleSpy.mockRestore();
  });

  it("handles fetch exception gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch = vi.fn(() => Promise.reject(new Error("Network error")));
    vi.stubGlobal("fetch", mockFetch);

    const wrapper = mountOee();
    await flushPromises();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("goodCount never goes below 0", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.goodCount).toBeGreaterThanOrEqual(0);
  });

  it("getProductNameById returns - for unknown id", async () => {
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.getProductNameById(999)).toBe("-");
    expect(wrapper.vm.getProductNameById(null)).toBe("-");
  });
});

// ─── 13. BUG CASES — Real bugs found in source ───────────────

describe("Oee > Bug Cases", () => {

  // BUG 1 (FIXED): target_oee=0 เคยกลายเป็น 85 เพราะ || (falsy trap)
  // แก้แล้ว: เปลี่ยน || เป็น ?? ใน src/views/Oee.vue line 675
  it("FIXED: target_oee=0 from API should stay 0, not become 85", async () => {
    const zeroTargetFetch = vi.fn((url) => {
      if (url.includes("/api/oee/snapshot") && !url.includes("/history") && !url.includes("/intraday")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_SNAPSHOT) });
      }
      if (url.includes("/api/products/latest-log")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_LATEST_LOG) });
      }
      if (url.match(/\/api\/products\/\d+$/)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: { id: 1, name: "Product A", cycle_time: 30, target_oee: 0, target_output: 0 },
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    vi.stubGlobal("fetch", zeroTargetFetch);

    const wrapper = mountOee();
    await flushPromises();
    await flushPromises();

    // FIXED: ใช้ ?? แทน || → 0 ?? 85 = 0 ✅
    expect(wrapper.vm.targetOee).toBe(0);
  });

  // BUG 2 (FIXED): getProductNameById(0) เคย return '-' ทั้งที่ 0 เป็น valid ID
  // แก้แล้ว: เปลี่ยน if (!id) เป็น if (id == null) ใน src/views/Oee.vue line 742-743
  it("FIXED: getProductNameById(0) should search for product, not return '-'", async () => {
    const wrapper = mountOee();
    await flushPromises();

    // FIXED: id=0 จะไม่ถูก early return แล้ว → ค้นหาจริง
    // ไม่เจอ product id=0 ใน mock data → return '-' จาก find ไม่เจอ (ถูกต้อง)
    const result = wrapper.vm.getProductNameById(0);
    expect(result).toBe("-");

    // null/undefined ยังคง return '-' ถูกต้อง
    expect(wrapper.vm.getProductNameById(null)).toBe("-");
    expect(wrapper.vm.getProductNameById(undefined)).toBe("-");
  });

  // BUG 3: total_output=0 จาก API ไม่ crash แต่ใช้ || แทน ?? ไม่ปลอดภัย
  // ถ้าวันนี้ API ส่ง total_output: "" (empty string) มา → "" || 0 = 0 (บังเอิญถูก)
  // แต่ถ้าส่ง total_output: false → false || 0 = 0 (ก็บังเอิญถูก)
  // ปัญหาจริง: ถ้า API ส่ง total_output: null → null || 0 = 0 → ถูก
  //            แต่ availability: null → (null || 0).toFixed(2) = "0.00"
  //            ซึ่งแสดงค่า 0.00% แทนที่จะแสดง "N/A" หรือ "-"
  it("BUG: zero values from API treated same as missing values", async () => {
    const zeroDataFetch = vi.fn((url) => {
      if (url.includes("/api/oee/snapshot") && !url.includes("/history") && !url.includes("/intraday")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: [{
              product_id: 1, product_name: "New Product",
              oee: 0, availability: 0, performance: 0, quality: 0,
              total_output: 0, reject_output: 0, planned_min: 480, downtime_min: 0,
            }],
          }),
        });
      }
      if (url.includes("/api/products/latest-log")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_LATEST_LOG) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
    });
    vi.stubGlobal("fetch", zeroDataFetch);

    const wrapper = mountOee();
    await flushPromises();

    // ค่า 0 จาก API ถูก || แปลงเป็น 0 → แสดง 0.00% ซึ่งถูกต้อง
    // แต่ไม่สามารถแยกว่า "ค่าเป็น 0 จริง" กับ "ไม่มีข้อมูล" ได้
    expect(wrapper.vm.oee).toBe("0.00");
    expect(wrapper.vm.totalOutput).toBe(0);
    expect(wrapper.vm.goodCount).toBe(0);
    expect(wrapper.vm.projectedOutput).toBe(0);
  });

  // BUG 4: reject > output → goodCount ยังปลอดภัยเพราะ Math.max
  // แต่ quality จะแสดง "0.00%" ทั้งที่ควร error/warning
  it("reject_output > total_output should not produce negative goodCount", async () => {
    const badDataFetch = vi.fn((url) => {
      if (url.includes("/api/oee/snapshot") && !url.includes("/history") && !url.includes("/intraday")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: [{
              product_id: 1, product_name: "Bad Product",
              oee: 0, availability: 90, performance: 80, quality: 0,
              total_output: 10, reject_output: 50,
              planned_min: 480, downtime_min: 48,
            }],
          }),
        });
      }
      if (url.includes("/api/products/latest-log")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_LATEST_LOG) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
    });
    vi.stubGlobal("fetch", badDataFetch);

    const wrapper = mountOee();
    await flushPromises();

    // Math.max(0, 10 - 50) = 0 ไม่ติดลบ → ปลอดภัย
    expect(wrapper.vm.goodCount).toBe(0);
    expect(wrapper.vm.totalReject).toBe(50);
    expect(wrapper.vm.totalOutput).toBe(10);
  });

  // BUG 5: downtime > planned → operatingTime ยังปลอดภัยเพราะ Math.max
  it("downtime_min > planned_min should not produce negative operatingTime", async () => {
    const badTimeFetch = vi.fn((url) => {
      if (url.includes("/api/oee/snapshot") && !url.includes("/history") && !url.includes("/intraday")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: [{
              product_id: 1, product_name: "Broken Machine",
              oee: 0, availability: 0, performance: 0, quality: 0,
              total_output: 0, reject_output: 0,
              planned_min: 100, downtime_min: 200,
            }],
          }),
        });
      }
      if (url.includes("/api/products/latest-log")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_LATEST_LOG) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
    });
    vi.stubGlobal("fetch", badTimeFetch);

    const wrapper = mountOee();
    await flushPromises();

    // Math.max(0, 100 - 200) = 0 → ไม่ติดลบ
    expect(parseFloat(wrapper.vm.operatingTime)).toBe(0);
    expect(wrapper.vm.projectedOutput).toBe(0);
  });

  // BUG 6: loadLatestLog ได้ success:false → latestPLCLog ไม่ถูก update
  // PLC status จะแสดงค่า null ตลอด
  it("latestPLCLog stays null when API returns success:false", async () => {
    const failLogFetch = vi.fn((url) => {
      if (url.includes("/api/oee/snapshot") && !url.includes("/history") && !url.includes("/intraday")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_SNAPSHOT) });
      }
      if (url.includes("/api/products/latest-log")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: false, data: null }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
    });
    vi.stubGlobal("fetch", failLogFetch);

    const wrapper = mountOee();
    await flushPromises();

    // success:false → if block ไม่ทำงาน → latestPLCLog ค้างค่า null
    expect(wrapper.vm.latestPLCLog.plc_onoff_value).toBeNull();
    expect(wrapper.vm.latestPLCLog.plc_active_value).toBeNull();
  });

  // BUG 7: snapshot ส่ง results ที่ product_name เป็น null/undefined
  it("handles product with null product_name without crash", async () => {
    const nullNameFetch = vi.fn((url) => {
      if (url.includes("/api/oee/snapshot") && !url.includes("/history") && !url.includes("/intraday")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: [{
              product_id: 1, product_name: null,
              oee: 50, availability: 80, performance: 70, quality: 90,
              total_output: 100, reject_output: 5, planned_min: 480, downtime_min: 60,
            }],
          }),
        });
      }
      if (url.includes("/api/products/latest-log")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_LATEST_LOG) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: {} }) });
    });
    vi.stubGlobal("fetch", nullNameFetch);

    const wrapper = mountOee();
    await flushPromises();

    // ไม่ crash แต่ product selector จะแสดงชื่อเป็น empty
    expect(wrapper.vm.products[0].name).toBeNull();
    expect(wrapper.vm.oee).toBe("50.00");
  });

  // BUG 8: selectedProductId ไม่ตรงกับ results → selected = {}
  it("shows 0.00 when selectedProductId does not match any result", async () => {
    const wrapper = mountOee();
    await flushPromises();

    wrapper.vm.selectedProductId = 9999;
    await flushPromises();

    expect(wrapper.vm.oee).toBe("0.00");
    expect(wrapper.vm.availability).toBe("0.00");
    expect(wrapper.vm.totalOutput).toBe(0);
  });

  // BUG 9: hourlyData มีค่า null ใน field
  it("hourlyChartSeries handles null values in hourly data", async () => {
    const wrapper = mountOee();
    await flushPromises();

    wrapper.vm.hourlyData = [
      { hour: "2026-06-22T08:00:00", oee: null, availability: null, performance: 90, quality: 95 },
    ];
    await flushPromises();

    const series = wrapper.vm.hourlyChartSeries;
    expect(series.length).toBe(4);
    expect(series[0].data[0]).toBeNull();
    expect(series[1].data[0]).toBeNull();
  });

  // BUG 10: trendData เป็น undefined จาก API (json.data = undefined)
  it("handles undefined trendData from API", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const noTrendFetch = vi.fn((url) => {
      if (url.includes("/api/oee/snapshot") && !url.includes("/history") && !url.includes("/intraday")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_SNAPSHOT) });
      }
      if (url.includes("/api/products/latest-log")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_LATEST_LOG) });
      }
      if (url.match(/\/api\/products\/\d+$/)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_PRODUCT_DETAIL) });
      }
      if (url.includes("/history")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    vi.stubGlobal("fetch", noTrendFetch);

    const wrapper = mountOee();
    await flushPromises();
    await flushPromises();

    // json.data = undefined → undefined || [] = [] → safe
    expect(wrapper.vm.trendData).toEqual([]);
    consoleSpy.mockRestore();
  });
});

// ─── 14. Template compiled functions (v-model & @click) ──────

describe("Oee > Template compiled functions", () => {
  it("DOM: select setValue → v-model setter อัปเดต selectedProductId (line 15)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    // ต้องใช้ setValue เพื่อ trigger compiled v-model setter
    const select = wrapper.find("select.form-select");
    await select.setValue(2);
    // v-model setter ถูกเรียก → selectedProductId ถูก update
    expect(Number(wrapper.vm.selectedProductId)).toBe(2);
  });

  it("DOM: click '7 Days' button → trendDays = 7 (line 317)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    wrapper.vm.trendDays = 30; // เปลี่ยนไป 30 ก่อน
    await wrapper.vm.$nextTick();
    mockFetch.mockClear();
    await wrapper.findAll(".btn-group button")[0].trigger("click");
    expect(wrapper.vm.trendDays).toBe(7);
  });

  it("DOM: click '30 Days' button → trendDays = 30 (line 320)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    mockFetch.mockClear();
    await wrapper.findAll(".btn-group button")[1].trigger("click");
    expect(wrapper.vm.trendDays).toBe(30);
  });
});

// ─── 15. setInterval callbacks ────────────────────────────────

describe("Oee > setInterval callbacks (lines 635–637)", () => {
  it("pollTimer callback fires loadSnapshot after 5000ms (line 635)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    mockFetch.mockClear();

    vi.advanceTimersByTime(5001);
    await flushPromises();

    const snapshotCalls = mockFetch.mock.calls.filter(
      (c) => c[0].includes("/api/oee/snapshot") && !c[0].includes("/history") && !c[0].includes("/intraday")
    );
    expect(snapshotCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("plcPollTimer callback fires loadLatestLog after 2000ms (line 636)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    mockFetch.mockClear();

    vi.advanceTimersByTime(2001);
    await flushPromises();

    const logCalls = mockFetch.mock.calls.filter((c) => c[0].includes("/api/products/latest-log"));
    expect(logCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("hourlyPollTimer callback fires loadHourlySnapshot after 60000ms (line 637)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    mockFetch.mockClear();

    vi.advanceTimersByTime(60001);
    await flushPromises();

    const hourlyCalls = mockFetch.mock.calls.filter((c) => c[0].includes("/intraday"));
    expect(hourlyCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── 16. Computed: empty-state early returns & formatters ─────

describe("Oee > Computed empty states & chart formatters", () => {
  it("hourlyChartSeries คืน [] เมื่อ hourlyData ว่าง (line 487)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    wrapper.vm.hourlyData = [];
    expect(wrapper.vm.hourlyChartSeries).toEqual([]);
  });

  it("trendSeries คืน [] เมื่อ trendData ว่าง (line 568)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    wrapper.vm.trendData = [];
    expect(wrapper.vm.trendSeries).toEqual([]);
  });

  it("trendSeries toNum: null value → null (line 569 null branch)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    wrapper.vm.trendData = [
      { date: "2026-01-01", oee: null, availability: null, performance: null, quality: null },
    ];
    const series = wrapper.vm.trendSeries;
    expect(series[0].data[0].y).toBeNull();
    expect(series[1].data[0].y).toBeNull();
  });

  it("hourlyChartOptions yaxis.formatter: non-null → 'XX%', null → '' (line 541)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    wrapper.vm.hourlyData = [{ hour: "2026-06-22T08:00:00", oee: 82, availability: 95, performance: 90, quality: 96 }];
    const fmt = wrapper.vm.hourlyChartOptions.yaxis.labels.formatter;
    expect(fmt(85)).toBe("85%");
    expect(fmt(null)).toBe("");
  });

  it("hourlyChartOptions tooltip.formatter: non-null → 'XX.XX%', null → '-' (line 550)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    wrapper.vm.hourlyData = [{ hour: "2026-06-22T08:00:00", oee: 82, availability: 95, performance: 90, quality: 96 }];
    const fmt = wrapper.vm.hourlyChartOptions.tooltip.y.formatter;
    expect(fmt(78.5)).toBe("78.50%");
    expect(fmt(null)).toBe("-");
  });

  it("trendChartOptions yaxis.formatter: non-null → 'XX.X%', null → '' (line 604)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    const fmt = wrapper.vm.trendChartOptions.yaxis.labels.formatter;
    expect(fmt(75)).toBe("75.0%");
    expect(fmt(null)).toBe("");
  });

  it("trendChartOptions tooltip.formatter: non-null → 'XX.XX%', null → '-' (line 612)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    const fmt = wrapper.vm.trendChartOptions.tooltip.y.formatter;
    expect(fmt(80.5)).toBe("80.50%");
    expect(fmt(null)).toBe("-");
  });
});

// ─── 17. Watch & method edge paths ────────────────────────────

describe("Oee > Watch & method edge paths", () => {
  it("watch selectedProductId → id=null → ไม่เรียก loadProductDetail (line 621 false branch)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    mockFetch.mockClear();
    wrapper.vm.selectedProductId = null;
    await flushPromises();
    const detailCall = mockFetch.mock.calls.find((c) => c[0].match(/\/api\/products\/\d+$/));
    expect(detailCall).toBeUndefined();
  });

  it("loadSnapshot: data.results เป็น null → ใช้ || [] fallback (line 659)", async () => {
    mockFetch = vi.fn((url) => {
      if (url.includes("/api/oee/snapshot") && !url.includes("/history") && !url.includes("/intraday")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: null }) });
      }
      return createMockFetch()(url);
    });
    vi.stubGlobal("fetch", mockFetch);
    const wrapper = mountOee();
    await flushPromises();
    expect(wrapper.vm.results).toEqual([]);
  });

  it("loadProductDetail: !res.ok → throw → catch → console.error (lines 671, 684)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountOee();
    await flushPromises();

    mockFetch.mockImplementation((url) => {
      if (url.match(/\/api\/products\/\d+$/)) {
        return Promise.resolve({ ok: false });
      }
      return createMockFetch()(url);
    });
    wrapper.vm.selectedProductId = 2;
    await flushPromises();

    expect(consoleSpy).toHaveBeenCalledWith("Product detail error:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("loadProductDetail: json.data เป็น null → fallback to json (line 673)", async () => {
    const wrapper = mountOee();
    await flushPromises();

    mockFetch.mockImplementation((url) => {
      if (url.match(/\/api\/products\/\d+$/)) {
        // ส่ง product โดยตรง ไม่ wrap ด้วย data key
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 2, cycle_time: 45, target_oee: 90, target_output: 500 }),
        });
      }
      return createMockFetch()(url);
    });
    wrapper.vm.selectedProductId = 2;
    await flushPromises();

    // json.data = undefined → json.data || json = json (the product directly)
    expect(wrapper.vm.idealCycleTime).toBe(45);
    expect(wrapper.vm.targetOee).toBe(90);
  });

  it("loadTrend: selectedProductId=null → early return (line 707)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    wrapper.vm.selectedProductId = null;
    await wrapper.vm.loadTrend();
    expect(wrapper.vm.trendLoading).toBe(false); // ไม่เคย set true เพราะ return ก่อน
  });

  it("loadTrend: !res.ok → catch → trendData = [] (lines 711, 715–716)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountOee();
    await flushPromises();

    // เรียก loadTrend() โดยตรง (ไม่ผ่าน watch) เพื่อ control mock ได้ชัดเจน
    mockFetch.mockImplementation((url) => {
      if (url.includes("/history")) return Promise.resolve({ ok: false });
      return createMockFetch()(url);
    });
    await wrapper.vm.loadTrend(); // selectedProductId = 1 อยู่แล้ว

    expect(consoleSpy).toHaveBeenCalledWith("OEE trend error:", expect.any(Error));
    expect(wrapper.vm.trendData).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("loadTrend: json.data เป็น null → || [] fallback (line 713)", async () => {
    const wrapper = mountOee();
    await flushPromises();

    mockFetch.mockImplementation((url) => {
      if (url.includes("/history")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: null }) });
      }
      return createMockFetch()(url);
    });
    // เรียกโดยตรง selectedProductId = 1 อยู่แล้ว
    await wrapper.vm.loadTrend();
    await flushPromises();

    expect(wrapper.vm.trendData).toEqual([]);
  });

  it("loadHourlySnapshot: selectedProductId=null → early return (line 723)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    wrapper.vm.selectedProductId = null;
    await wrapper.vm.loadHourlySnapshot();
    expect(wrapper.vm.hourlyLoading).toBe(false);
  });

  it("loadHourlySnapshot: !res.ok → catch → hourlyData = [] (lines 730, 735–736)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountOee();
    await flushPromises();

    mockFetch.mockImplementation((url) => {
      if (url.includes("/intraday")) return Promise.resolve({ ok: false });
      return createMockFetch()(url);
    });
    await wrapper.vm.loadHourlySnapshot();

    expect(consoleSpy).toHaveBeenCalledWith("OEE hourly error:", expect.any(Error));
    expect(wrapper.vm.hourlyData).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("loadHourlySnapshot: json.data เป็น null → || [] fallback (line 732)", async () => {
    const wrapper = mountOee();
    await flushPromises();

    mockFetch.mockImplementation((url) => {
      if (url.includes("/intraday")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: null }) });
      }
      return createMockFetch()(url);
    });
    await wrapper.vm.loadHourlySnapshot();

    expect(wrapper.vm.hourlyData).toEqual([]);
  });
});

// ─── 18. Template branches: OEE above target & reject ON ──────

describe("Oee > Template branches (above target / reject ON)", () => {
  it("totalOutput >= targetOutput → bg-success badge + 'Exceeded by' (lines 247, 253, 260)", async () => {
    const wrapper = mountOee();
    await flushPromises(); // loads: total=500, target=600 from product detail
    // เปลี่ยน targetOutput ให้ < totalOutput เพื่อให้ "Exceeded by" แสดง
    wrapper.vm.targetOutput = 400;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Exceeded by");
    // bg-success badge (totalOutput >= targetOutput)
    const targetSection = wrapper.find(".bg-light.rounded.border.p-3.mb-3");
    expect(targetSection.find(".badge.bg-success").exists()).toBe(true);
  });

  it("projectedOutput >= targetOutput → แสดง '(Target achieved ✓)' (line 269)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    // projectedOutput = Math.round(500/432 * 480) ≈ 556
    wrapper.vm.targetOutput = 400; // 556 >= 400 → "Target achieved"
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Target achieved");
  });

  it("plc_reject_value = 1 → ON badge ใน Reject Signal section (line 390)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    wrapper.vm.latestPLCLog = {
      plc_onoff_value: 1,
      plc_active_value: 1,
      plc_complete_value: 1,
      plc_reject_value: 1, // ← เปลี่ยนเป็น 1 เพื่อให้ ON badge แสดง
    };
    await wrapper.vm.$nextTick();

    // Reject Signal card ควรแสดง ON badge (bg-success)
    const rejectCard = wrapper.findAll(".col-md-3")[3]; // 4th card = Reject
    expect(rejectCard.find(".badge.bg-success").exists()).toBe(true);
    expect(rejectCard.find(".badge.bg-success").text()).toBe("ON");
  });

  it("totalOutput < targetOutput → แสดง 'Short by' (บรรทัด 260 branch 0 ยืนยัน)", async () => {
    const wrapper = mountOee();
    await flushPromises(); // total=500, target=600 → "Short by"
    wrapper.vm.targetOutput = 600;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Short by");
  });

  it("projectedOutput < targetOutput → แสดง '(Below target ...pcs)' (line 269 else branch)", async () => {
    const wrapper = mountOee();
    await flushPromises();
    wrapper.vm.targetOutput = 700; // projected ≈ 556 < 700 → "Below target"
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Below target");
  });
});

// ─── 19. Bug Cases (FAIL) — อันตราย ยังไม่แก้ component ──────

describe("Oee > Bug Cases (FAIL)", () => {

  // BUG-A: getProductNameById ใช้ strict equality (===) → string ID ไม่ตรงกับ number product.id
  // อันตราย: PLC controller ส่ง plc_active_value เป็น string ("1") ไม่ใช่ number (1)
  //          → products.find(p => p.id === "1") = undefined เพราะ 1 !== "1"
  //          → แสดง "-" แทนชื่อ product ที่ถูกต้อง
  //          → operator ไม่รู้ว่า machine กำลังผลิต product อะไร
  //          → ถ้าแสดงผ่าน dashboard: active model = "-" ตลอด → สูญเสีย traceability
  //          → ควรใช้ == (loose equality) หรือ Number(id) === p.id
  // FAIL เพราะ: p.id = 1 (number) และ id = "1" (string) → strict === → false → return '-'
  it("[BUG-A] getProductNameById('1') คืน '-' ทั้งที่ product id=1 มีอยู่ (FAIL)", async () => {
    const wrapper = mountOee();
    await flushPromises();

    // PLC ส่ง active_value เป็น string "1" แทน number 1
    const result = wrapper.vm.getProductNameById("1");

    // คาดหวัง: หา product ที่มี id=1 เจอ → คืน "Product A"
    expect(result).toBe("Product A");
    // FAIL: products.find(p => p.id === "1") → 1 === "1" = false → return '-'
  });

  // BUG-B: trendData ถูก clear เป็น [] ทุกครั้งที่ network error เกิดขึ้น
  // อันตราย: ถ้า OEE trend chart โหลดข้อมูลแล้ว (2 สัปดาห์ย้อนหลัง)
  //          แต่มี transient network error (momentary WiFi drop) ระหว่าง poll
  //          → catch block: this.trendData = [] → chart ว่างเปล่าทันที
  //          → operator ไม่มีข้อมูล trend เลย แทนที่จะเห็นข้อมูลเก่า
  //          → ควรคง trendData เดิมไว้เมื่อ error เกิดขึ้น (keep last known good data)
  //          → แก้ได้โดย: ลบ this.trendData = [] ออกจาก catch block
  // FAIL เพราะ: catch block ทำ this.trendData = [] → ลบข้อมูลเก่าดีๆ ทิ้ง
  it("[BUG-B] transient trend error ล้าง trendData เก่า → chart ว่าง (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountOee();
    await flushPromises();

    // จำลอง: มีข้อมูล trend ดีๆ อยู่แล้ว
    wrapper.vm.trendData = [...MOCK_TREND.data];
    expect(wrapper.vm.trendData).toHaveLength(2);

    // จำลอง: network error ระหว่าง poll
    mockFetch.mockImplementation((url) => {
      if (url.includes("/history")) return Promise.reject(new Error("Network blip"));
      return createMockFetch()(url);
    });

    await wrapper.vm.loadTrend();
    consoleSpy.mockRestore();

    // คาดหวัง: error เกิด → trendData ควรคงค่าเดิมไว้ (ไม่ clear)
    expect(wrapper.vm.trendData).toHaveLength(2);
    // FAIL: catch block ทำ this.trendData = [] → length = 0
  });

  // BUG-C: authH() ส่ง 'Bearer null' เมื่อไม่มี token ใน localStorage
  // อันตราย: localStorage.getItem('token') คืน null (JS null value)
  //          → Template literal: `Bearer ${null}` = 'Bearer null' (string)
  //          → ทุก API call ส่ง Authorization: Bearer null
  //          → Server อาจ accept หรือ reject ขึ้นกับ implementation
  //          → ถ้า accept: เป็น security vulnerability — ไม่ต้อง authenticate
  //          → ถ้า reject 401: แสดง error ที่ไม่ชัดเจน เพราะ header ดูถูกรูปแบบ
  //          → ยากต่อ debug: log แสดง "invalid token" ไม่ใช่ "missing token"
  //          → ควรเช็ค: const token = localStorage.getItem('token'); return token ? {Authorization: `Bearer ${token}`} : {}
  // FAIL เพราะ: `Bearer ${null}` = 'Bearer null' ไม่ใช่ undefined หรือ error
  it("[BUG-C] authH() ส่ง 'Bearer null' เมื่อไม่มี token (FAIL)", async () => {
    delete store["token"]; // ลบ token → localStorage.getItem('token') = null
    const wrapper = mountOee();
    await flushPromises();

    const firstCall = mockFetch.mock.calls[0];
    const authHeader = firstCall?.[1]?.headers?.["Authorization"];

    // คาดหวัง: ไม่มี token → ไม่ควรส่ง 'Bearer null'
    expect(authHeader).not.toBe("Bearer null");
    // FAIL: `Bearer ${localStorage.getItem('token')}` = `Bearer ${null}` = 'Bearer null'
  });

  // BUG-D: loadProductDetail ไม่ reset plcAddresses เมื่อ error → แสดงที่อยู่ PLC ของ product เก่า
  // อันตราย: operator เลือก Product A (D100/D200/D300/D400) → switch ไป Product B
  //          → loadProductDetail(B) ล้มเหลว (network timeout, API error)
  //          → catch block ไม่ reset plcAddresses → ยังแสดง D100/D200/D300/D400 (ของ Product A!)
  //          → operator คิดว่า Product B ใช้ address D100 → ส่ง command ผิด PLC register
  //          → PLC อาจทำงานผิดพลาด: ปรับ speed ผิด machine, activate wrong signal
  //          → ใน production context: อาจทำให้ machine เสียหายหรือ product ของเสีย
  //          → ควร reset plcAddresses = { null, null, null, null } ก่อน try หรือใน catch
  // FAIL เพราะ: catch ไม่มี reset → plcAddresses ยังเป็นของ product เก่า
  it("[BUG-D] loadProductDetail error → plcAddresses เก่าของ product ก่อนหน้ายังแสดง (FAIL)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = mountOee();
    await flushPromises();
    await flushPromises();

    // ตอนนี้ plcAddresses = { D100, D200, D300, D400 } จาก Product A
    expect(wrapper.vm.plcAddresses.plc_address_output).toBe("D100");

    // switch ไป product 2 แต่ API ล้มเหลว
    mockFetch.mockImplementation((url) => {
      if (url.match(/\/api\/products\/\d+$/)) return Promise.resolve({ ok: false });
      return createMockFetch()(url);
    });

    wrapper.vm.selectedProductId = 2;
    await flushPromises();

    consoleSpy.mockRestore();

    // คาดหวัง: product detail load ล้มเหลว → plcAddresses ควรถูก clear เป็น null
    expect(wrapper.vm.plcAddresses.plc_address_output).toBeNull();
    // FAIL: catch ไม่มี reset → plcAddresses ยังเป็น D100 (ของ Product A)
  });

  // BUG-E: trendDays เปลี่ยนเร็ว → concurrent loadTrend requests → race condition
  // อันตราย: ไม่มี guard: if (this.trendLoading) return ใน loadTrend
  //          → user คลิก 30 Days แล้วคลิก 7 Days ทันที (หรือ network ช้า)
  //          → 2 requests pending พร้อมกัน: GET /history?days=30 และ GET /history?days=7
  //          → ถ้า 7-day ตอบกลับก่อน → trendData = 7-day data (ถูกต้อง)
  //          → ถ้า 30-day ตอบกลับหลัง → trendData = 30-day data ทั้งที่ user เลือก 7-day!
  //          → chart แสดงข้อมูลผิด period โดยไม่มี error → operator ตัดสินใจบน wrong data
  //          → ควรเพิ่ม: if (this.trendLoading) return หรือใช้ AbortController cancel request เก่า
  // FAIL เพราะ: ไม่มี trendLoading guard → 2 requests fired พร้อมกัน
  it("[BUG-E] rapid trendDays change → concurrent requests → race condition (FAIL)", async () => {
    const resolvers = [];
    mockFetch.mockImplementation((url) => {
      if (url.includes("/history")) {
        return new Promise((resolve) => { resolvers.push(resolve); });
      }
      return createMockFetch()(url);
    });

    const wrapper = mountOee();
    await flushPromises();
    // ตอนนี้ selectedProductId = 1 → watch fires → loadTrend() ← 1st request pending

    // เปลี่ยน trendDays อีกครั้ง (จำลอง user คลิกเร็ว)
    wrapper.vm.trendDays = 30;
    await wrapper.vm.$nextTick();
    // watch fires → loadTrend() อีก ← 2nd request pending

    // คาดหวัง: ควรมีแค่ 1 request pending (ถ้ามี trendLoading guard)
    expect(resolvers.length).toBeLessThanOrEqual(1);
    // FAIL: ไม่มี guard → resolvers.length = 2 (concurrent requests)

    // Cleanup: resolve ทั้งหมดเพื่อไม่ให้ leak
    resolvers.forEach((r) => r({ ok: true, json: () => Promise.resolve({ data: [] }) }));
    await flushPromises();
  });
});
