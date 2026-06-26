import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import ProfileModal from "../../components/ProfileModal.vue";

// ─── Mock swalHelper ─────────────────────────────────────────
vi.mock("../../utils/swalHelper", () => ({
  showAlert: vi.fn().mockResolvedValue(undefined),
}));
import { showAlert } from "../../utils/swalHelper";

// ─── Mock globals ────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("localStorage", {
  getItem: () => "fake-token",
  setItem: () => {},
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Mock Data ───────────────────────────────────────────────

const mockUser = {
  id: 7,
  email: "somchai@eccsolutions.co.th",
  is_active: true,
  role: "admin",
  role_name: "Admin",
  employee: {
    first_name: "สมชาย",
    last_name: "ใจดี",
    employee_id: "EMP-001",
    position: "Engineer",
    department: "Production",
  },
  company: { name: "ECC Solutions" },
  rooms: [
    { id: 1, room: { name: "Room A" }, scope: "control" },
    { id: 2, room: { name: "Room B" }, scope: "view" },
  ],
  permissions: {
    tab_permissions: { dashboard: true, setting: true, oee: false },
    scope_permissions: { view: true, edit: true, export: false, control: true },
  },
};

const mockLocale = {
  current: "th",
  t: (key) => key,
  toggle: () => {},
};

const mockLocaleEn = {
  current: "en",
  t: (key) => key,
  toggle: () => {},
};

function mountModal(userOverride = {}, locale = mockLocale) {
  return mount(ProfileModal, {
    props: { user: { ...mockUser, ...userOverride } },
    global: {
      provide: { locale },
      stubs: { transition: false },
    },
  });
}

async function goToPasswordMode(wrapper) {
  await wrapper.find(".btn-secondary-action").trigger("click");
}

// ─── Render ──────────────────────────────────────────────────

describe("ProfileModal > Render", () => {
  it("render modal สำเร็จ", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".modal-overlay").exists()).toBe(true);
    expect(wrapper.find(".profile-card").exists()).toBe(true);
  });

  it("แสดงชื่อ-นามสกุล จาก employee", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".user-name").text()).toContain("สมชาย");
    expect(wrapper.find(".user-name").text()).toContain("ใจดี");
  });

  it("ถ้าไม่มี employee → แสดง email prefix แทน", () => {
    const wrapper = mountModal({ employee: null });
    expect(wrapper.find(".user-name").text()).toContain("somchai");
  });

  it("แสดง role badge จาก role_name", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".user-role-badge").text()).toBe("Admin");
  });

  it("role_name fallback → permissions.role_name", () => {
    const wrapper = mountModal({
      role_name: undefined,
      permissions: { ...mockUser.permissions, role_name: "Operator" },
    });
    expect(wrapper.find(".user-role-badge").text()).toBe("Operator");
  });

  it("role_name fallback สุดท้าย → role.replace(/_/g, ' ')", () => {
    const wrapper = mountModal({
      role_name: undefined,
      permissions: { tab_permissions: {}, scope_permissions: {} },
      role: "super_admin",
    });
    expect(wrapper.find(".user-role-badge").text()).toBe("super admin");
  });

  it("แสดง user ID พร้อม zero-pad", () => {
    const wrapper = mountModal();
    expect(wrapper.text()).toContain("#0007");
  });

  it("แสดง email", () => {
    const wrapper = mountModal();
    expect(wrapper.text()).toContain("somchai@eccsolutions.co.th");
  });

  it("แสดงชื่อบริษัท", () => {
    const wrapper = mountModal();
    expect(wrapper.text()).toContain("ECC Solutions");
  });

  it("ไม่มี company → แสดง '—'", () => {
    const wrapper = mountModal({ company: null });
    expect(wrapper.text()).toContain("—");
  });

  it("แสดง employee info (position + department)", () => {
    const wrapper = mountModal();
    const info = wrapper.find(".user-employee-info").text();
    expect(info).toContain("Engineer");
    expect(info).toContain("Production");
  });

  it("employee ที่ไม่มี position → ไม่แสดง row ตำแหน่ง", () => {
    const wrapper = mountModal({
      employee: { ...mockUser.employee, position: undefined },
    });
    expect(wrapper.html()).not.toContain("fa-briefcase");
  });

  it("แสดง label ภาษา EN เมื่อ locale = en", () => {
    const wrapper = mountModal({}, mockLocaleEn);
    const text = wrapper.text();
    expect(text).toContain("USER ID");
    expect(text).toContain("COMPANY");
    expect(text).toContain("EMP ID");
    expect(text).toContain("POSITION");
    expect(text).toContain("STATUS");
    expect(text).toContain("Room Access");
    expect(text).toContain("Permissions");
    expect(text).toContain("Scope Permissions");
  });
});

// ─── สถานะ Online / Offline ──────────────────────────────────

describe("ProfileModal > Status", () => {
  it("is_active = true → status dot มี class 'online'", () => {
    const wrapper = mountModal({ is_active: true });
    expect(wrapper.find(".status-dot").classes()).toContain("online");
  });

  it("is_active = false → status dot ไม่มี class 'online'", () => {
    const wrapper = mountModal({ is_active: false });
    expect(wrapper.find(".status-dot").classes()).not.toContain("online");
  });

  it("แสดงข้อความ Active / Inactive ถูกต้อง", () => {
    const active = mountModal({ is_active: true });
    const inactive = mountModal({ is_active: false });
    expect(active.find(".status-active").text()).toBe("Active");
    expect(inactive.find(".status-inactive").text()).toBe("Inactive");
  });
});

// ─── Rooms ───────────────────────────────────────────────────

describe("ProfileModal > Rooms", () => {
  it("แสดง room chips ตามจำนวน rooms", () => {
    const wrapper = mountModal();
    const chips = wrapper.findAll(".room-chip");
    expect(chips).toHaveLength(2);
    expect(chips[0].text()).toContain("Room A");
    expect(chips[1].text()).toContain("Room B");
  });

  it("ไม่มี room → แสดงข้อความว่าง", () => {
    const wrapper = mountModal({ rooms: [] });
    expect(wrapper.find(".empty-chip").exists()).toBe(true);
  });

  it("ไม่มี rooms property → roomList เป็น []", () => {
    const { rooms, ...userWithoutRooms } = mockUser;
    const wrapper = mount(ProfileModal, {
      props: { user: userWithoutRooms },
      global: { provide: { locale: mockLocale }, stubs: { transition: false } },
    });
    expect(wrapper.find(".empty-chip").exists()).toBe(true);
  });

  it("room ที่ไม่มี room.name → ใช้ r.name แทน", () => {
    const wrapper = mountModal({
      rooms: [{ id: 3, name: "Direct Name", scope: "view" }],
    });
    expect(wrapper.text()).toContain("Direct Name");
  });

  it("room ที่ไม่มีชื่อเลย (TH) → แสดง 'ทุกห้อง'", () => {
    const wrapper = mountModal({ rooms: [{ id: 4, scope: "view" }] });
    expect(wrapper.text()).toContain("ทุกห้อง");
  });

  it("room ที่ไม่มีชื่อเลย (EN) → แสดง 'All'", () => {
    const wrapper = mountModal(
      { rooms: [{ id: 4, scope: "view" }] },
      mockLocaleEn
    );
    expect(wrapper.text()).toContain("All");
  });

  it("ไม่มี room (EN) → แสดง 'No rooms assigned'", () => {
    const wrapper = mountModal({ rooms: [] }, mockLocaleEn);
    expect(wrapper.text()).toContain("No rooms assigned");
  });
});

// ─── Permissions ─────────────────────────────────────────────

describe("ProfileModal > Permissions", () => {
  it("มี tab permissions → แสดง perm chips", () => {
    const wrapper = mountModal();
    expect(wrapper.findAll(".perm-chip:not(.all)").length).toBeGreaterThan(0);
  });

  it("ไม่มี tab permissions → แสดง empty chip", () => {
    const wrapper = mountModal({
      permissions: { tab_permissions: {}, scope_permissions: { view: true } },
    });
    expect(wrapper.find(".empty-chip").exists()).toBe(true);
  });

  it("tab permissions ใช้ user.tab_permissions เป็น fallback", () => {
    const wrapper = mountModal({
      permissions: undefined,
      tab_permissions: { dashboard: true },
    });
    expect(wrapper.findAll(".perm-chip:not(.all)").length).toBeGreaterThan(0);
  });

  it("super_admin → แสดง 'All Access' ใน Permissions และ Scope", () => {
    const wrapper = mountModal({ role: "super_admin" });
    expect(wrapper.findAll(".perm-chip.all").length).toBeGreaterThanOrEqual(2);
  });

  it("super_admin (EN) → แสดง 'All Access' text ใน Permissions และ Scope", () => {
    const wrapper = mountModal({ role: "super_admin" }, mockLocaleEn);
    const allChipsText = wrapper.findAll(".perm-chip.all").map((c) => c.text()).join(" ");
    expect(allChipsText).toContain("All Access");
  });

  it("ไม่มี tab permissions (EN) → แสดง 'No permissions'", () => {
    const wrapper = mountModal(
      { permissions: { tab_permissions: {}, scope_permissions: {} } },
      mockLocaleEn
    );
    expect(wrapper.text()).toContain("No permissions");
  });

  it("scope permissions แสดง active / inactive ถูกต้อง", () => {
    const wrapper = mountModal();
    expect(wrapper.findAll(".scope-perm-chip.active").length).toBeGreaterThan(0);
    expect(wrapper.findAll(".scope-perm-chip.inactive").length).toBeGreaterThan(0);
  });

  it("scope_permissions fallback → {} เมื่อไม่มี permissions", () => {
    const wrapper = mountModal({ permissions: undefined });
    // ไม่ควร throw และควร render ได้ปกติ
    expect(wrapper.findAll(".scope-perm-chip").length).toBeGreaterThan(0);
  });

  it("Permissions labels แสดงเป็น EN", () => {
    const wrapper = mountModal({}, mockLocaleEn);
    const chipTexts = wrapper
      .findAll(".perm-chip:not(.all)")
      .map((c) => c.text())
      .join(" ");
    expect(chipTexts).toMatch(/Dashboard|OEE|Setting/);
  });

  it("Scope Permissions labels แสดงเป็น EN", () => {
    const wrapper = mountModal({}, mockLocaleEn);
    const text = wrapper.text();
    expect(text).toMatch(/View|Edit|Export|Control/);
  });
});

// ─── Close Event ─────────────────────────────────────────────

describe("ProfileModal > Close Event", () => {
  it("คลิกปุ่ม X → emit 'close'", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-close-top").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("คลิก overlay → emit 'close'", async () => {
    const wrapper = mountModal();
    await wrapper.find(".modal-overlay").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("คลิกปุ่ม Close ด้านล่าง → emit 'close'", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-action-close").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });
});

// ─── Change Password Mode ────────────────────────────────────

describe("ProfileModal > Change Password", () => {
  it("คลิก 'เปลี่ยนรหัสผ่าน' → แสดง form", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    expect(wrapper.find(".form-section").exists()).toBe(true);
    expect(wrapper.findAll(".pf-input")).toHaveLength(3);
  });

  it("คลิก Cancel → กลับไป view mode และ clear form", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "x", newPw: "y", confirm: "z" }, pwError: "err" });

    await wrapper.find(".btn-secondary-action").trigger("click");

    expect(wrapper.find(".form-section").exists()).toBe(false);
    expect(wrapper.find(".scroll-body").exists()).toBe(true);
    expect(wrapper.vm.pwError).toBe("");
    expect(wrapper.vm.pwForm.current).toBe("");
  });

  it("toggle showCurrent → input type สลับระหว่าง password / text", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    const input = wrapper.findAll(".pf-input")[0];
    const eyeBtn = wrapper.findAll(".eye-btn")[0];

    expect(input.attributes("type")).toBe("password");
    await eyeBtn.trigger("click");
    expect(input.attributes("type")).toBe("text");
    await eyeBtn.trigger("click");
    expect(input.attributes("type")).toBe("password");
  });

  it("toggle showNew → input type สลับระหว่าง password / text", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    const input = wrapper.findAll(".pf-input")[1];
    const eyeBtn = wrapper.findAll(".eye-btn")[1];

    expect(input.attributes("type")).toBe("password");
    await eyeBtn.trigger("click");
    expect(input.attributes("type")).toBe("text");
    await eyeBtn.trigger("click");
    expect(input.attributes("type")).toBe("password");
  });

  it("toggle showConfirm → input type สลับระหว่าง password / text", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    const input = wrapper.findAll(".pf-input")[2];
    const eyeBtn = wrapper.findAll(".eye-btn")[2];

    expect(input.attributes("type")).toBe("password");
    await eyeBtn.trigger("click");
    expect(input.attributes("type")).toBe("text");
    await eyeBtn.trigger("click");
    expect(input.attributes("type")).toBe("password");
  });

  it("ระหว่าง saving → ปุ่มถูก disable และแสดง spinner", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    await wrapper.setData({ saving: true });

    expect(wrapper.find(".btn-save-action").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".btn-secondary-action").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".mini-spinner").exists()).toBe(true);
  });

  it("form แสดง label ภาษา EN เมื่อ locale = en", async () => {
    const wrapper = mountModal({}, mockLocaleEn);
    await goToPasswordMode(wrapper);
    const text = wrapper.text();
    expect(text).toContain("Change Password");
    expect(text).toContain("Current Password");
    expect(text).toContain("New Password");
    expect(text).toContain("Confirm Password");
    expect(text).toContain("Save");
  });

  it("v-model บน inputs อัปเดต pwForm ได้ถูกต้อง", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    const inputs = wrapper.findAll(".pf-input");

    await inputs[0].setValue("myCurrentPw");
    await inputs[1].setValue("myNewPw123");
    await inputs[2].setValue("myNewPw123");

    expect(wrapper.vm.pwForm.current).toBe("myCurrentPw");
    expect(wrapper.vm.pwForm.newPw).toBe("myNewPw123");
    expect(wrapper.vm.pwForm.confirm).toBe("myNewPw123");
  });
});

// ─── Save Password (Mock API) ────────────────────────────────

describe("ProfileModal > Save Password (Async)", () => {
  it("ไม่กรอก current password → แสดง error (TH)", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "", newPw: "123456", confirm: "123456" } });
    await wrapper.find(".btn-save-action").trigger("click");
    expect(wrapper.find(".err-text").text()).toContain("กรุณากรอกรหัสผ่านปัจจุบัน");
  });

  it("ไม่กรอก current password → แสดง error (EN)", async () => {
    const wrapper = mountModal({}, mockLocaleEn);
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "", newPw: "123456", confirm: "123456" } });
    await wrapper.find(".btn-save-action").trigger("click");
    expect(wrapper.find(".err-text").text()).toContain("Current password is required");
  });

  it("new password สั้นกว่า 6 → แสดง error (TH)", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "oldpass", newPw: "123", confirm: "123" } });
    await wrapper.find(".btn-save-action").trigger("click");
    expect(wrapper.find(".err-text").text()).toContain("รหัสผ่านใหม่ต้องมีอย่างน้อย");
  });

  it("new password สั้นกว่า 6 → แสดง error (EN)", async () => {
    const wrapper = mountModal({}, mockLocaleEn);
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "oldpass", newPw: "123", confirm: "123" } });
    await wrapper.find(".btn-save-action").trigger("click");
    expect(wrapper.find(".err-text").text()).toContain("Min 6 characters");
  });

  it("new password เหมือน current → error (EN)", async () => {
    const wrapper = mountModal({}, mockLocaleEn);
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "samepass123", newPw: "samepass123", confirm: "samepass123" } });
    await wrapper.find(".btn-save-action").trigger("click");
    expect(wrapper.find(".err-text").text()).toBe("New password must be different");
  });

  it("confirm ไม่ตรง → แสดง error", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "oldpass", newPw: "123456", confirm: "999999" } });
    await wrapper.find(".btn-save-action").trigger("click");
    expect(wrapper.find(".err-text").text()).toBe("Passwords do not match");
  });

  it("กรอกถูกต้อง → เรียก fetch API ด้วย params ที่ถูกต้อง", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "oldpass", newPw: "newpass123", confirm: "newpass123" } });
    await wrapper.find(".btn-save-action").trigger("click");

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/auth/change-password");
    expect(options.method).toBe("PUT");
    const body = JSON.parse(options.body);
    expect(body.current_password).toBe("oldpass");
    expect(body.new_password).toBe("newpass123");
  });

  it("save สำเร็จ (TH) → showAlert เรียกด้วยข้อความ TH และกลับ view mode", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "oldpass", newPw: "newpass123", confirm: "newpass123" } });
    await wrapper.find(".btn-save-action").trigger("click");

    await vi.waitFor(() => expect(showAlert).toHaveBeenCalled());
    expect(showAlert).toHaveBeenCalledWith("", "เปลี่ยนรหัสผ่านสำเร็จ", "success");
    await vi.waitFor(() => expect(wrapper.vm.mode).toBe("view"));
    expect(wrapper.find(".scroll-body").exists()).toBe(true);
  });

  it("save สำเร็จ (EN) → showAlert เรียกด้วยข้อความ EN", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const wrapper = mountModal({}, mockLocaleEn);
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "oldpass", newPw: "newpass123", confirm: "newpass123" } });
    await wrapper.find(".btn-save-action").trigger("click");

    await vi.waitFor(() => expect(showAlert).toHaveBeenCalled());
    expect(showAlert).toHaveBeenCalledWith("", "Password changed successfully", "success");
  });

  it("API ส่ง error message → แสดง error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Current password is wrong" }),
    });

    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "wrong", newPw: "newpass123", confirm: "newpass123" } });
    await wrapper.find(".btn-save-action").trigger("click");

    await vi.waitFor(() => expect(wrapper.find(".err-text").exists()).toBe(true));
    expect(wrapper.find(".err-text").text()).toBe("Current password is wrong");
  });

  it("API ไม่มี message → แสดง 'Failed'", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    await wrapper.setData({ pwForm: { current: "wrong", newPw: "newpass123", confirm: "newpass123" } });
    await wrapper.find(".btn-save-action").trigger("click");

    await vi.waitFor(() => expect(wrapper.find(".err-text").exists()).toBe(true));
    expect(wrapper.find(".err-text").text()).toBe("Failed");
  });
});

// ─── 🔴 Bug Cases (อันตรายมาก) ──────────────────────────────

describe("ProfileModal > Bug Cases", () => {

  // Bug 1: Double Submit
  it("🔴 กด Save 2 ครั้งติดกัน → fetch ถูกเรียกแค่ครั้งเดียว", async () => {
    let resolveFirst;
    mockFetch.mockReturnValue(
      new Promise((res) => { resolveFirst = res; })
    );

    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    await wrapper.setData({
      pwForm: { current: "old", newPw: "newpass123", confirm: "newpass123" },
    });

    const saveBtn = wrapper.find(".btn-save-action");
    saveBtn.trigger("click");   // ครั้งที่ 1
    await nextTick();
    saveBtn.trigger("click");   // ครั้งที่ 2 (ควร disabled แล้ว)
    await nextTick();

    expect(mockFetch).toHaveBeenCalledTimes(1);

    resolveFirst({ ok: true, json: () => Promise.resolve({}) });
  });

  // Bug 2: Eye toggle ค้างหลัง cancel
  it("🔴 cancel แล้วเปิด form ใหม่ → password ต้องซ่อน (ไม่ค้าง toggle)", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);

    // toggle eye buttons ทั้ง 3 ตัว → แสดงเป็น text
    const eyeBtns = wrapper.findAll(".eye-btn");
    await eyeBtns[0].trigger("click");
    await eyeBtns[1].trigger("click");
    await eyeBtns[2].trigger("click");

    // กด Cancel
    await wrapper.find(".btn-secondary-action").trigger("click");

    // เปิด form ใหม่
    await wrapper.find(".btn-secondary-action").trigger("click");

    // inputs ต้องกลับเป็น password (ไม่ใช่ text)
    const inputs = wrapper.findAll(".pf-input");
    expect(inputs[0].attributes("type")).toBe("password");
    expect(inputs[1].attributes("type")).toBe("password");
    expect(inputs[2].attributes("type")).toBe("password");
  });

  // Bug 3: เปลี่ยน password เป็นค่าเดิม
  it("🔴 new password เหมือน current password → ควรแสดง error", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);
    await wrapper.setData({
      pwForm: { current: "samepass123", newPw: "samepass123", confirm: "samepass123" },
    });
    await wrapper.find(".btn-save-action").trigger("click");

    expect(wrapper.find(".err-text").exists()).toBe(true);
  });

});
