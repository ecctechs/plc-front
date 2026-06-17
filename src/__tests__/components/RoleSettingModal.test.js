import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import RoleSettingModal from "../../components/RoleSettingModal.vue";

// ─── Mock swalHelper ────────────────────────────────────────
vi.mock("../../utils/swalHelper", () => ({
  showAlert: vi.fn(),
  showConfirm: vi.fn(() => Promise.resolve(true)),
}));

import { showAlert, showConfirm } from "../../utils/swalHelper";

// ─── Mock fetch & localStorage ──────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("localStorage", {
  getItem: () => "fake-token",
  setItem: () => {},
});

// ─── Mock locale ────────────────────────────────────────────
const mockLocale = {
  current: "en",
  t: (key) => key,
  toggle: vi.fn(),
};

// ─── Mock Role Data ─────────────────────────────────────────
const mockRoles = [
  {
    id: 1,
    name: "Admin",
    tab_permissions: { dashboard: true, oee: true, setting: true },
    scope_permissions: { view: true, edit: true, export: false },
    is_active: true,
  },
  {
    id: 2,
    name: "Operator",
    tab_permissions: { dashboard: true, oee: false, setting: false },
    scope_permissions: { view: true, edit: false, export: false },
    is_active: false,
  },
];

function mountModal() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: mockRoles }),
  });

  return mount(RoleSettingModal, {
    global: {
      provide: { locale: mockLocale },
      stubs: { transition: false },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Render ──────────────────────────────────────────────
describe("RoleSettingModal > Render", () => {
  it("render modal สำเร็จ", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".rs-overlay").exists()).toBe(true);
    expect(wrapper.find(".rs-card").exists()).toBe(true);
  });

  it("แสดง header title", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".rs-title").text()).toBe("Role Setting");
  });

  it("แสดง tab Roles เป็น active", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".rs-tab-btn.active").text()).toContain("Roles");
  });

  it("แสดง Add Role button", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".btn-primary-minimal").text()).toContain("Add Role");
  });
});

// ─── 2. Load Roles (API) ────────────────────────────────────
describe("RoleSettingModal > Load Roles", () => {
  it("mounted → เรียก fetch loadRoles", async () => {
    mountModal();
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/settings/roles");
  });

  it("โหลดสำเร็จ → แสดง roles ในตาราง", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => {
      expect(wrapper.vm.roles).toHaveLength(2);
    });
    expect(wrapper.text()).toContain("Admin");
    expect(wrapper.text()).toContain("Operator");
  });

  it("โหลดล้มเหลว → เรียก showAlert error", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    mount(RoleSettingModal, {
      global: { provide: { locale: mockLocale }, stubs: { transition: false } },
    });

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot load roles", "error");
    });
  });

  it("แสดง role count badge", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => {
      expect(wrapper.vm.loadingList).toBe(false);
    });
    expect(wrapper.find(".rs-count-badge").text()).toContain("2");
  });
});

// ─── 3. Status Badge ────────────────────────────────────────
describe("RoleSettingModal > Status", () => {
  it("is_active = true → แสดง Active", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    const badges = wrapper.findAll(".status-badge");
    expect(badges[0].text()).toBe("Active");
    expect(badges[0].classes()).toContain("active");
  });

  it("is_active = false → แสดง Inactive", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    const badges = wrapper.findAll(".status-badge");
    expect(badges[1].text()).toBe("Inactive");
    expect(badges[1].classes()).toContain("inactive");
  });
});

// ─── 4. Open Modal (Add / Edit) ─────────────────────────────
describe("RoleSettingModal > CRUD Modal", () => {
  it("คลิก Add Role → เปิด modal ใหม่", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(false);
    expect(wrapper.vm.form.name).toBe("");
  });

  it("คลิก Edit → เปิด modal แก้ไขพร้อมข้อมูลเดิม", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));

    const editBtn = wrapper.find(".btn-action.edit");
    await editBtn.trigger("click");

    expect(wrapper.vm.showModal).toBe(true);
    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.name).toBe("Admin");
  });

  it("คลิก Cancel → ปิด modal", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    expect(wrapper.vm.showModal).toBe(true);

    await wrapper.find(".btn-secondary-minimal").trigger("click");
    expect(wrapper.vm.showModal).toBe(false);
  });
});

// ─── 5. Save Role ───────────────────────────────────────────
describe("RoleSettingModal > Save", () => {
  it("ชื่อว่าง → แสดง warning ไม่ส่ง API", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "";

    await wrapper.vm.save();

    expect(showAlert).toHaveBeenCalledWith("Error", "Role name is required", "warning");
  });

  it("save สำเร็จ → เรียก fetch POST + showAlert success", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "New Role";

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });

    await wrapper.vm.save();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Success", "Role saved successfully", "success");
    });
  });

  it("save ล้มเหลว → เรียก showAlert error", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "Bad Role";

    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Duplicate name" }),
    });

    await wrapper.vm.save();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Duplicate name", "error");
    });
  });
});

// ─── 6. Delete Role ─────────────────────────────────────────
describe("RoleSettingModal > Delete", () => {
  it("confirmDelete → เรียก showConfirm + fetch DELETE", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    showConfirm.mockResolvedValue(true);

    await wrapper.vm.confirmDelete(mockRoles[0]);

    expect(showConfirm).toHaveBeenCalled();
    await vi.waitFor(() => {
      const deleteCalls = mockFetch.mock.calls.filter(
        ([url, opts]) => opts && opts.method === "DELETE"
      );
      expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("confirmDelete ยกเลิก → ไม่เรียก fetch", async () => {
    const wrapper = mountModal();
    showConfirm.mockResolvedValue(false);

    await wrapper.vm.confirmDelete(mockRoles[0]);

    const deleteCalls = mockFetch.mock.calls.filter(
      ([url, opts]) => opts && opts.method === "DELETE"
    );
    expect(deleteCalls).toHaveLength(0);
  });
});

// ─── 7. Close Event ─────────────────────────────────────────
describe("RoleSettingModal > Close", () => {
  it("คลิก overlay → emit close", async () => {
    const wrapper = mountModal();
    await wrapper.find(".rs-overlay").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("คลิกปุ่ม X → emit close", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-close-minimal").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });
});

// ─── 8. Bug Cases (FAIL จนกว่าจะแก้ RoleSettingModal.vue) ──
//
//  กติกา: ห้ามแก้ test — ต้องแก้ RoleSettingModal.vue เท่านั้น

describe("RoleSettingModal > Bug Cases", () => {

  // ── BUG-1 ─────────────────────────────────────────────────
  // save() เช็ค !this.form.name.trim() เพื่อกัน empty
  // แต่ชื่อที่เป็น space ล้วน "   " → trim() = "" → ผ่านเงื่อนไข
  // ปัญหา: ถ้า user พิมพ์ชื่อแบบมี space ข้างหน้า เช่น "  Admin"
  // ค่าที่ส่งไป API จะถูก trim แล้ว แต่ UI ยังแสดงชื่อมี space
  // ควร trim ตั้งแต่ตอน set form.name ไม่ใช่ตอนส่ง
  // อย่างน้อย validate ต้องกัน duplicate space ตรงกลาง
  it("[BUG-1] ชื่อ role มีแต่ space → ต้องแสดง warning", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-primary-minimal").trigger("click");
    wrapper.vm.form.name = "   ";

    await wrapper.vm.save();

    expect(showAlert).toHaveBeenCalledWith("Error", "Role name is required", "warning");
  });

  // ── BUG-2 ─────────────────────────────────────────────────
  // openModal(role) สร้าง form ใหม่ แต่ไม่ reset loading state
  // ถ้า save() กำลัง loading=true แล้วกด edit role อื่น
  // loading ยังค้าง true → ปุ่ม Save ยัง disabled อยู่
  // ควร reset loading = false ใน openModal
  it("[BUG-2] เปิด modal ขณะ loading ค้าง → ปุ่ม Save ต้องใช้ได้", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));

    wrapper.vm.loading = true;
    wrapper.vm.openModal(mockRoles[0]);

    expect(wrapper.vm.loading).toBe(false);
  });
});
