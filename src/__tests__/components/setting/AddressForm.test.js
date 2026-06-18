import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import AddressForm from "../../../components/setting/AddressForm.vue";

function mountForm(props = {}) {
  return mount(AddressForm, {
    props: {
      address: "M0",
      refresh: 1000,
      dataDisplayType: "onoff",
      ...props,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("AddressForm > Render", () => {
  it("render สำเร็จ", () => {
    const wrapper = mountForm();
    expect(wrapper.find(".border.rounded").exists()).toBe(true);
    expect(wrapper.text()).toContain("PLC Address");
  });

  it("แสดง Refresh Rate input", () => {
    const wrapper = mountForm();
    expect(wrapper.text()).toContain("Refresh Rate (ms)");
  });
});

// ─── 2. Computed: addressPrefix ─────────────────────────────
describe("AddressForm > Prefix", () => {
  it("onoff → prefix = M", () => {
    const wrapper = mountForm({ dataDisplayType: "onoff" });
    expect(wrapper.vm.addressPrefix).toBe("M");
    expect(wrapper.find(".input-group-text").text()).toBe("M");
  });

  it("number → prefix = D", () => {
    const wrapper = mountForm({ dataDisplayType: "number" });
    expect(wrapper.vm.addressPrefix).toBe("D");
    expect(wrapper.find(".input-group-text").text()).toBe("D");
  });

  it("level → prefix = D", () => {
    const wrapper = mountForm({ dataDisplayType: "level" });
    expect(wrapper.vm.addressPrefix).toBe("D");
  });
});

// ─── 3. Computed: addressNumber ─────────────────────────────
describe("AddressForm > Address Number", () => {
  it("M0 → addressNumber = 0", () => {
    const wrapper = mountForm({ address: "M0" });
    expect(wrapper.vm.addressNumber).toBe(0);
  });

  it("D100 → addressNumber = 100", () => {
    const wrapper = mountForm({ address: "D100" });
    expect(wrapper.vm.addressNumber).toBe(100);
  });

  it("M999 → addressNumber = 999", () => {
    const wrapper = mountForm({ address: "M999" });
    expect(wrapper.vm.addressNumber).toBe(999);
  });
});

// ─── 4. Emit Events ────────────────────────────────────────
describe("AddressForm > Events", () => {
  it("เปลี่ยน address number → emit update:address", async () => {
    const wrapper = mountForm({ dataDisplayType: "onoff", address: "M0" });
    const input = wrapper.find('input[type="number"]');
    await input.setValue(5);

    const emitted = wrapper.emitted("update:address");
    expect(emitted).toBeTruthy();
    const lastVal = emitted[emitted.length - 1][0];
    expect(lastVal).toBe("M5");
  });

  it("เปลี่ยน refresh → emit update:refresh", async () => {
    const wrapper = mountForm();
    const inputs = wrapper.findAll('input[type="number"]');
    const refreshInput = inputs[1];
    await refreshInput.setValue(2000);

    const emitted = wrapper.emitted("update:refresh");
    expect(emitted).toBeTruthy();
    expect(emitted[emitted.length - 1][0]).toBe(2000);
  });

  it("เปลี่ยน dataDisplayType → emit update:address ทันที (watcher)", async () => {
    const wrapper = mountForm({ dataDisplayType: "onoff", address: "M10" });

    const emittedBefore = wrapper.emitted("update:address")?.length || 0;

    await wrapper.setProps({ dataDisplayType: "number" });

    const emittedAfter = wrapper.emitted("update:address");
    expect(emittedAfter.length).toBeGreaterThan(emittedBefore);
    const lastVal = emittedAfter[emittedAfter.length - 1][0];
    expect(lastVal).toBe("D10");
  });
});

// ─── 5. Bug Cases ───────────────────────────────────────────
describe("AddressForm > Bug Cases", () => {
  // BUG-1: onAddressChange ไม่ validate input ว่าง
  // ถ้า user ลบตัวเลขออกหมด → num = "" → emit "M" (ไม่มีเลข)
  // ควร default เป็น 0 เมื่อ input ว่าง
  it("[BUG-1] address ว่าง → ต้อง emit M0 ไม่ใช่ M", async () => {
    const wrapper = mountForm({ dataDisplayType: "onoff", address: "M5" });
    wrapper.vm.onAddressChange("");
    const emitted = wrapper.emitted("update:address");
    const lastVal = emitted[emitted.length - 1][0];
    expect(lastVal).toMatch(/^M\d/);
  });
});
