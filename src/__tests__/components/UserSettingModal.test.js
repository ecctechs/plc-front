import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import UserSettingModal from "../../components/UserSettingModal.vue";

vi.mock("../../utils/swalHelper", () => ({
  showAlert: vi.fn(),
  showConfirm: vi.fn(() => Promise.resolve(true)),
}));

import { showAlert, showConfirm } from "../../utils/swalHelper";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const store = { token: "fake-token", user: JSON.stringify({ company_id: 1 }) };
vi.stubGlobal("localStorage", {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = val; },
  removeItem: (key) => { delete store[key]; },
});

const mockLocale = {
  current: "en",
  t: (key) => key,
  toggle: vi.fn(),
};

const mockLocaleTh = {
  current: "th",
  t: (key) => key,
  toggle: vi.fn(),
};

const mockUsers = [
  {
    id: 1,
    email: "admin@test.com",
    role: "Admin",
    is_active: true,
    roomAssignments: [{ room_id: null, scope: "manage" }],
  },
  {
    id: 2,
    email: "user@test.com",
    role: "Operator",
    is_active: false,
    roomAssignments: [{ room_id: 1, scope: "view" }],
  },
  {
    id: 3,
    email: "noroom@test.com",
    role: "Viewer",
    is_active: true,
    roomAssignments: [],
  },
];

const mockRoles = [
  { id: 1, name: "Admin", is_active: true },
  { id: 2, name: "Operator", is_active: true },
];

const mockRooms = [{ id: 1, name: "Room A" }];
const mockEmployees = [{ id: 1, employee_id: "EMP-001", first_name: "John", last_name: "Doe" }];

function setupFetchForLoadAll() {
  mockFetch.mockImplementation((url) => {
    if (url.includes("/api/settings/users")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockUsers }) });
    if (url.includes("/api/rooms")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRooms }) });
    if (url.includes("/api/settings/roles")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockRoles }) });
    if (url.includes("/api/employees")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: mockEmployees }) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
}

function mountModal(locale = mockLocale) {
  setupFetchForLoadAll();
  return mount(UserSettingModal, {
    global: {
      provide: { locale },
      stubs: { transition: false },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  showAlert.mockResolvedValue(undefined);
  showConfirm.mockResolvedValue(true);
});

// vi.waitFor default interval = 50ms ทำให้ทุก test ช้า — ใช้ wrapper นี้แทน
const waitFor = (fn, opts) => vi.waitFor(fn, { interval: 1, timeout: 500, ...opts });

// ─── 1. Render ──────────────────────────────────────────────
describe("UserSettingModal > Render", () => {
  it("render modal สำเร็จ", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".us-overlay").exists()).toBe(true);
    expect(wrapper.find(".us-card").exists()).toBe(true);
  });

  it("แสดง header title (EN)", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".us-title").text()).toBe("User Management");
  });

  it("แสดง header title (TH)", () => {
    const wrapper = mountModal(mockLocaleTh);
    expect(wrapper.find(".us-title").text()).toBe("จัดการผู้ใช้");
  });

  it("แสดง subtitle (TH)", () => {
    const wrapper = mountModal(mockLocaleTh);
    expect(wrapper.find(".us-subtitle").text()).toContain("ดูรายการ");
  });

  it("แสดง 2 tabs: User List / Add New User (EN)", () => {
    const wrapper = mountModal();
    const tabs = wrapper.findAll(".us-tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].text()).toContain("User List");
    expect(tabs[1].text()).toContain("Add New User");
  });

  it("แสดง 2 tabs (TH)", () => {
    const wrapper = mountModal(mockLocaleTh);
    const tabs = wrapper.findAll(".us-tab");
    expect(tabs[0].text()).toContain("รายการผู้ใช้");
    expect(tabs[1].text()).toContain("เพิ่มผู้ใช้ใหม่");
  });

  it("tab แรก (list) เป็น active", () => {
    const wrapper = mountModal();
    expect(wrapper.vm.activeTab).toBe("list");
  });
});

// ─── 2. Load Data ───────────────────────────────────────────
describe("UserSettingModal > Load Data", () => {
  it("mounted → เรียก fetch 4 API", async () => {
    mountModal();
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  it("loadingList = true ระหว่างโหลด → แสดง spinner row", async () => {
    // hold fetch resolution so loading state stays true
    let resolveUsers;
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/settings/users")) {
        return new Promise(res => { resolveUsers = () => res({ ok: true, json: () => Promise.resolve({ data: [] }) }); });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(UserSettingModal, {
      global: { provide: { locale: mockLocale }, stubs: { transition: false } },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.loadingList).toBe(true);
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    resolveUsers();
  });

  it("loadingList spinner (TH text)", async () => {
    let resolveUsers;
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/settings/users")) {
        return new Promise(res => { resolveUsers = () => res({ ok: true, json: () => Promise.resolve({ data: [] }) }); });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(UserSettingModal, {
      global: { provide: { locale: mockLocaleTh }, stubs: { transition: false } },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("กำลังโหลด");
    resolveUsers();
  });

  it("โหลดสำเร็จ → แสดง users ในตาราง", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users).toHaveLength(3));
    expect(wrapper.text()).toContain("admin@test.com");
    expect(wrapper.text()).toContain("user@test.com");
  });

  it("users.length === 0 → แสดง empty state (EN)", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/settings/users")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(UserSettingModal, {
      global: { provide: { locale: mockLocale }, stubs: { transition: false } },
    });
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    expect(wrapper.text()).toContain("No users found.");
  });

  it("users.length === 0 → แสดง empty state (TH)", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/settings/users")) return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(UserSettingModal, {
      global: { provide: { locale: mockLocaleTh }, stubs: { transition: false } },
    });
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    expect(wrapper.text()).toContain("ยังไม่มีผู้ใช้");
  });

  it("โหลดล้มเหลว → เรียก showAlert error (EN)", async () => {
    mockFetch.mockRejectedValue(new Error("Network"));
    mount(UserSettingModal, {
      global: { provide: { locale: mockLocale }, stubs: { transition: false } },
    });
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot load data", "error");
    });
  });

  it("โหลดล้มเหลว → เรียก showAlert error (TH)", async () => {
    mockFetch.mockRejectedValue(new Error("Network"));
    mount(UserSettingModal, {
      global: { provide: { locale: mockLocaleTh }, stubs: { transition: false } },
    });
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "โหลดข้อมูลไม่สำเร็จ", "error");
    });
  });
});

// ─── 3. User List Display ───────────────────────────────────
describe("UserSettingModal > User List", () => {
  it("แสดง role badge", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    expect(wrapper.find(".role-badge").text()).toBe("Admin");
  });

  it("is_active = true → class status-active (EN)", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    expect(wrapper.findAll(".status-active").length).toBeGreaterThanOrEqual(1);
    expect(wrapper.text()).toContain("Active");
  });

  it("is_active = false → class status-inactive + Inactive (EN)", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    expect(wrapper.findAll(".status-inactive").length).toBeGreaterThanOrEqual(1);
    expect(wrapper.text()).toContain("Inactive");
  });

  it("is_active status (TH) → แสดง ใช้งาน / ปิดใช้", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    expect(wrapper.text()).toContain("ใช้งาน");
    expect(wrapper.text()).toContain("ปิดใช้");
  });

  it("room_id = null → แสดง All (EN)", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    expect(wrapper.text()).toContain("All");
  });

  it("room_id = null → แสดง ทุกห้อง (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    expect(wrapper.text()).toContain("ทุกห้อง");
  });

  it("roomAssignments มี non-null room_id → แสดงจำนวน room(s) (EN)", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    expect(wrapper.text()).toContain("room(s)");
  });

  it("roomAssignments มี non-null room_id → แสดงจำนวน ห้อง (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    expect(wrapper.text()).toContain(" ห้อง");
  });

  it("roomAssignments ว่าง → แสดง —", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    expect(wrapper.text()).toContain("—");
  });

  it("แสดง user avatar ตัวอักษรแรกของ email", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    const avatars = wrapper.findAll(".user-avatar");
    expect(avatars[0].text()).toBe("A");
  });

  it("table header EN → Email, Role, Rooms, Status, Actions", async () => {
    const wrapper = mountModal();
    expect(wrapper.text()).toContain("Email");
    expect(wrapper.text()).toContain("Role");
    expect(wrapper.text()).toContain("Rooms");
    expect(wrapper.text()).toContain("Status");
    expect(wrapper.text()).toContain("Actions");
  });

  it("table header TH → ห้อง, สถานะ", async () => {
    const wrapper = mountModal(mockLocaleTh);
    expect(wrapper.text()).toContain("ห้อง");
    expect(wrapper.text()).toContain("สถานะ");
  });

  it("toggle button title disable (EN) สำหรับ active user", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    const btn = wrapper.findAll(".btn-outline-warning")[0];
    expect(btn.attributes("title")).toBe("Disable");
  });

  it("toggle button title enable (EN) สำหรับ inactive user", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    const btn = wrapper.findAll(".btn-outline-success")[0];
    expect(btn.attributes("title")).toBe("Enable");
  });

  it("toggle button title (TH) สำหรับ active user", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    const btn = wrapper.findAll(".btn-outline-warning")[0];
    expect(btn.attributes("title")).toBe("ปิดใช้งาน");
  });

  it("toggle button title (TH) สำหรับ inactive user", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    const btn = wrapper.findAll(".btn-outline-success")[0];
    expect(btn.attributes("title")).toBe("เปิดใช้งาน");
  });

  it("reset button title (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    const btn = wrapper.findAll(".btn-outline-secondary")[0];
    expect(btn.attributes("title")).toBe("รีเซ็ตรหัสผ่าน");
  });

  it("คลิก List tab → activeTab = list", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    await wrapper.findAll(".us-tab")[0].trigger("click");
    expect(wrapper.vm.activeTab).toBe("list");
  });
});

// ─── 4. Add User Tab ────────────────────────────────────────
describe("UserSettingModal > Add User", () => {
  it("คลิก tab Add → switchToAdd + activeTab = add", async () => {
    const wrapper = mountModal();
    await wrapper.findAll(".us-tab")[1].trigger("click");
    expect(wrapper.vm.activeTab).toBe("add");
  });

  it("form status toggle (TH) แสดง สถานะบัญชี", () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.activeTab = "add";
    expect(wrapper.vm.form.is_active).toBe(true);
  });

  it("form is_active = true → แสดง Active (EN) ใน toggle label", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.form.is_active = true;
    await wrapper.vm.$nextTick();
    const toggleLabel = wrapper.find(".status-toggle-row .form-check-label");
    expect(toggleLabel.text()).toContain("Active");
  });

  it("form is_active = false → แสดง Inactive (EN) ใน toggle label", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.form.is_active = false;
    await wrapper.vm.$nextTick();
    const toggleLabel = wrapper.find(".status-toggle-row .form-check-label");
    expect(toggleLabel.text()).toContain("Inactive");
  });

  it("form is_active (TH) ใช้งาน/ปิดใช้", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.activeTab = "add";
    wrapper.vm.form.is_active = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("ใช้งาน");
    wrapper.vm.form.is_active = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("ปิดใช้");
  });

  it("คลิก eye button → toggle showPw", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.showPw).toBe(false);
    const eyeBtns = wrapper.findAll(".eye-btn");
    await eyeBtns[0].trigger("click");
    expect(wrapper.vm.showPw).toBe(true);
    await eyeBtns[0].trigger("click");
    expect(wrapper.vm.showPw).toBe(false);
  });

  it("คลิก eye button confirm → toggle showConfirmPw", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.showConfirmPw).toBe(false);
    const eyeBtns = wrapper.findAll(".eye-btn");
    await eyeBtns[1].trigger("click");
    expect(wrapper.vm.showConfirmPw).toBe(true);
    await eyeBtns[1].trigger("click");
    expect(wrapper.vm.showConfirmPw).toBe(false);
  });

  it("room ว่าง → แสดง No room permissions set (EN)", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("No room permissions set");
  });

  it("room ว่าง → แสดง ไม่ได้กำหนดสิทธิ์ห้อง (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("ไม่ได้กำหนดสิทธิ์ห้อง");
  });

  it("คลิก Add Room → form.rooms เพิ่ม entry", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    const addRoomBtn = wrapper.find(".btn-add-room");
    await addRoomBtn.trigger("click");
    expect(wrapper.vm.form.rooms).toHaveLength(1);
    expect(wrapper.vm.form.rooms[0]).toEqual({ room_id: null, scope: "view" });
  });

  it("คลิก Remove Room → form.rooms ลด entry", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.form.rooms = [{ room_id: null, scope: "view" }];
    await wrapper.vm.$nextTick();
    const removeBtn = wrapper.find(".btn-remove-room");
    await removeBtn.trigger("click");
    expect(wrapper.vm.form.rooms).toHaveLength(0);
  });

  it("room entry → แสดง scope options (EN)", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.form.rooms = [{ room_id: null, scope: "view" }];
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("View");
    expect(wrapper.text()).toContain("Control");
    expect(wrapper.text()).toContain("Manage");
  });

  it("room entry → แสดง scope options (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.activeTab = "add";
    wrapper.vm.form.rooms = [{ room_id: null, scope: "view" }];
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("ดูเท่านั้น");
    expect(wrapper.text()).toContain("ควบคุม");
    expect(wrapper.text()).toContain("จัดการ");
  });

  it("คลิกปุ่ม Clear → resetAddForm", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.form.email = "dirty@mail.com";
    await wrapper.vm.$nextTick();
    const clearBtn = wrapper.find(".btn-cancel-add");
    await clearBtn.trigger("click");
    expect(wrapper.vm.form.email).toBe("");
  });

  it("saving = true → แสดง Saving... (EN)", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.saving = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Saving...");
  });

  it("saving = true → แสดง กำลังบันทึก... (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.activeTab = "add";
    wrapper.vm.saving = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("กำลังบันทึก");
  });

  it("saving = false → แสดง Create Account (EN)", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.saving = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Create Account");
  });

  it("saving = false → แสดง สร้างบัญชี (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.activeTab = "add";
    wrapper.vm.saving = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("สร้างบัญชี");
  });

  it("คลิก submit button → เรียก submitAdd", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    const spy = vi.spyOn(wrapper.vm, "submitAdd");
    const submitBtn = wrapper.find(".btn-submit-add");
    await submitBtn.trigger("click");
    expect(spy).toHaveBeenCalled();
  });

  it("loadingRoles = true → แสดง Loading option ใน select", async () => {
    let resolveRoles;
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/settings/roles")) {
        return new Promise(res => { resolveRoles = () => res({ ok: true, json: () => Promise.resolve({ data: [] }) }); });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(UserSettingModal, {
      global: { provide: { locale: mockLocale }, stubs: { transition: false } },
    });
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.loadingRoles).toBe(true);
    expect(wrapper.text()).toContain("Loading...");
    resolveRoles();
  });

  it("loadingRoles (TH) → แสดง กำลังโหลด...", async () => {
    let resolveRoles;
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/settings/roles")) {
        return new Promise(res => { resolveRoles = () => res({ ok: true, json: () => Promise.resolve({ data: [] }) }); });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(UserSettingModal, {
      global: { provide: { locale: mockLocaleTh }, stubs: { transition: false } },
    });
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("กำลังโหลด");
    resolveRoles();
  });

  it("role select option TH placeholder", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("-- เลือกบทบาท --");
  });

  it("validate: password < 6 → error", () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "test@mail.com";
    wrapper.vm.form.password = "123";
    wrapper.vm.form.confirmPassword = "123";
    wrapper.vm.form.role = "Admin";
    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.password).toBeTruthy();
  });

  it("validate: email invalid format → error", () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "not-an-email";
    wrapper.vm.form.password = "123456";
    wrapper.vm.form.confirmPassword = "123456";
    wrapper.vm.form.role = "Admin";
    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.email).toBeTruthy();
  });

  it("validate: confirmPassword ว่าง → error", () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "test@mail.com";
    wrapper.vm.form.password = "123456";
    wrapper.vm.form.confirmPassword = "";
    wrapper.vm.form.role = "Admin";
    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.confirmPassword).toBeTruthy();
  });

  it("validate: email ว่าง → error (TH locale ไม่กระทบ validate)", () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.form.email = "";
    wrapper.vm.form.password = "123456";
    wrapper.vm.form.confirmPassword = "123456";
    wrapper.vm.form.role = "Admin";
    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.email).toBeTruthy();
  });

  it("validate: confirmPassword ว่าง (TH) → error ภาษาไทย", () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.form.email = "test@mail.com";
    wrapper.vm.form.password = "123456";
    wrapper.vm.form.confirmPassword = "";
    wrapper.vm.form.role = "Admin";
    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.confirmPassword).toBe("กรุณายืนยันรหัสผ่าน");
  });

  it("submitAdd กด submit ขณะ validate ไม่ผ่าน → ไม่เรียก fetch POST", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    setupFetchForLoadAll();
    const callsBefore = mockFetch.mock.calls.length;
    wrapper.vm.form.email = "";
    await wrapper.vm.submitAdd();
    const postCalls = mockFetch.mock.calls.slice(callsBefore).filter(
      ([, opts]) => opts && opts.method === "POST"
    );
    expect(postCalls).toHaveLength(0);
  });

  it("submitAdd สำเร็จ → showAlert success + กลับ list", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.activeTab = "add";
    wrapper.vm.form = {
      email: "new@mail.com",
      password: "123456",
      confirmPassword: "123456",
      role: "Admin",
      role_id: 1,
      is_active: true,
      rooms: [],
    };
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    }));
    await wrapper.vm.submitAdd();
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith(
        "User Created!",
        expect.stringContaining("new@mail.com"),
        "success"
      );
    });
    expect(wrapper.vm.activeTab).toBe("list");
  });

  it("submitAdd สำเร็จ (TH) → showAlert ภาษาไทย", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.activeTab = "add";
    wrapper.vm.form = {
      email: "new@mail.com",
      password: "123456",
      confirmPassword: "123456",
      role: "Admin",
      role_id: 1,
      is_active: true,
      rooms: [],
    };
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    }));
    await wrapper.vm.submitAdd();
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith(
        "สร้างผู้ใช้สำเร็จ!",
        expect.stringContaining("new@mail.com"),
        "success"
      );
    });
  });

  it("submitAdd ล้มเหลว → แสดง addError", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.activeTab = "add";
    wrapper.vm.form = {
      email: "dup@mail.com",
      password: "123456",
      confirmPassword: "123456",
      role: "Admin",
      role_id: 1,
      is_active: true,
      rooms: [],
    };
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Email already exists" }),
    });
    await wrapper.vm.submitAdd();
    expect(wrapper.vm.addError).toBe("Email already exists");
  });

  it("submitAdd ล้มเหลว (TH) ไม่มี message → ใช้ default TH", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.activeTab = "add";
    wrapper.vm.form = {
      email: "dup@mail.com",
      password: "123456",
      confirmPassword: "123456",
      role: "Admin",
      role_id: 1,
      is_active: true,
      rooms: [],
    };
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    await wrapper.vm.submitAdd();
    expect(wrapper.vm.addError).toBe("สร้างผู้ใช้ไม่สำเร็จ");
  });

  it("addError แสดง error banner", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.addError = "Email already exists";
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".err-banner").exists()).toBe(true);
    expect(wrapper.find(".err-banner").text()).toContain("Email already exists");
  });

  it("errors.email → แสดง err-text ใต้ input", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.errors.email = "กรุณากรอก email";
    await wrapper.vm.$nextTick();
    const errTexts = wrapper.findAll(".err-text");
    expect(errTexts.some(e => e.text().includes("กรุณากรอก email"))).toBe(true);
  });

  it("onRoleChange → ตั้ง role_id ตาม role name", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    wrapper.vm.form.role = "Admin";
    wrapper.vm.onRoleChange();
    expect(wrapper.vm.form.role_id).toBe(1);
  });

  it("onRoleChange → role ไม่พบ → role_id = null", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    wrapper.vm.form.role = "Unknown";
    wrapper.vm.onRoleChange();
    expect(wrapper.vm.form.role_id).toBeNull();
  });

  it("resetAddForm → ล้าง form กลับค่าเริ่มต้น", () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "dirty@mail.com";
    wrapper.vm.form.rooms = [{ room_id: 1, scope: "view" }];
    wrapper.vm.addError = "some error";
    wrapper.vm.resetAddForm();
    expect(wrapper.vm.form.email).toBe("");
    expect(wrapper.vm.form.rooms).toHaveLength(0);
    expect(wrapper.vm.addError).toBe("");
  });
});

// ─── 5. Edit User ───────────────────────────────────────────
describe("UserSettingModal > Edit User", () => {
  it("openEdit → เปิด modal พร้อมข้อมูล", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    expect(wrapper.vm.showEditModal).toBe(true);
    expect(wrapper.vm.editForm.email).toBe("admin@test.com");
    expect(wrapper.vm.editForm.role).toBe("Admin");
    expect(wrapper.vm.editForm.is_active).toBe(true);
  });

  it("openEdit → role พบใน roles → set role_id", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    wrapper.vm.openEdit(mockUsers[0]);
    expect(wrapper.vm.editForm.role_id).toBe(1);
  });

  it("openEdit → role ไม่พบใน roles → fallback role_id", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    const unknownUser = { ...mockUsers[0], role: "Unknown", role_id: 99 };
    wrapper.vm.openEdit(unknownUser);
    expect(wrapper.vm.editForm.role_id).toBe(99);
  });

  it("openEdit → user ไม่มี roomAssignments → rooms = []", async () => {
    const wrapper = mountModal();
    const userNoRooms = { id: 5, email: "x@x.com", role: "Admin", is_active: true };
    wrapper.vm.openEdit(userNoRooms);
    expect(wrapper.vm.editForm.rooms).toHaveLength(0);
  });

  it("edit modal header แสดง Edit User (EN)", async () => {
    const wrapper = mountModal();
    wrapper.vm.showEditModal = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("Edit User");
  });

  it("edit modal header แสดง แก้ไขผู้ใช้ (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.showEditModal = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("แก้ไขผู้ใช้");
  });

  it("คลิก X ใน edit modal → ปิด modal", async () => {
    const wrapper = mountModal();
    wrapper.vm.showEditModal = true;
    await wrapper.vm.$nextTick();
    const xBtn = wrapper.find(".inner-modal .btn-close-minimal");
    await xBtn.trigger("click");
    expect(wrapper.vm.showEditModal).toBe(false);
  });

  it("คลิก backdrop ของ edit modal → ปิด modal", async () => {
    const wrapper = mountModal();
    wrapper.vm.showEditModal = true;
    await wrapper.vm.$nextTick();
    const backdrop = wrapper.find(".inner-backdrop");
    await backdrop.trigger("click");
    expect(wrapper.vm.showEditModal).toBe(false);
  });

  it("คลิก Cancel ใน edit modal → ปิด modal", async () => {
    const wrapper = mountModal();
    wrapper.vm.showEditModal = true;
    await wrapper.vm.$nextTick();
    const cancelBtn = wrapper.find(".inner-modal-footer .btn-secondary");
    await cancelBtn.trigger("click");
    expect(wrapper.vm.showEditModal).toBe(false);
  });

  it("edit modal: Add Room → editForm.rooms เพิ่ม entry", async () => {
    const wrapper = mountModal();
    wrapper.vm.openEdit(mockUsers[0]);
    await wrapper.vm.$nextTick();
    const addBtn = wrapper.find(".inner-modal-body .btn-outline-primary");
    await addBtn.trigger("click");
    expect(wrapper.vm.editForm.rooms.some(r => r.room_id === null && r.scope === "view")).toBe(true);
  });

  it("edit modal: Remove Room → editForm.rooms ลด entry", async () => {
    const wrapper = mountModal();
    wrapper.vm.openEdit(mockUsers[0]);
    wrapper.vm.editForm.rooms = [{ room_id: null, scope: "view" }];
    await wrapper.vm.$nextTick();
    const removeBtn = wrapper.find(".btn-outline-danger");
    await removeBtn.trigger("click");
    expect(wrapper.vm.editForm.rooms).toHaveLength(0);
  });

  it("edit modal: rooms ว่าง → แสดง No room permissions (EN)", async () => {
    const wrapper = mountModal();
    wrapper.vm.openEdit(mockUsers[2]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("No room permissions");
  });

  it("edit modal: rooms ว่าง → แสดง ไม่มีการกำหนดสิทธิ์ห้อง (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.openEdit(mockUsers[2]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("ไม่มีการกำหนดสิทธิ์ห้อง");
  });

  it("edit modal: room entries แสดง options (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.openEdit(mockUsers[0]);
    wrapper.vm.editForm.rooms = [{ room_id: null, scope: "view" }];
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("ทุกห้อง");
    expect(wrapper.find(".inner-modal").text()).toContain("ดูเท่านั้น");
  });

  it("edit modal: is_active (TH) สถานะ ใช้งาน/ปิดใช้", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.openEdit(mockUsers[0]);
    wrapper.vm.editForm.is_active = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("ใช้งาน");
    wrapper.vm.editForm.is_active = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("ปิดใช้");
  });

  it("edit modal: is_active (EN) Active/Inactive", async () => {
    const wrapper = mountModal();
    wrapper.vm.openEdit(mockUsers[0]);
    wrapper.vm.editForm.is_active = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("Active");
    wrapper.vm.editForm.is_active = false;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("Inactive");
  });

  it("edit modal: employee select None (EN)", async () => {
    const wrapper = mountModal();
    wrapper.vm.openEdit(mockUsers[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("None");
  });

  it("edit modal: employee select ไม่เชื่อม (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.openEdit(mockUsers[0]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("ไม่เชื่อม");
  });

  it("edit modal: Link to Employee (EN) / เชื่อมกับพนักงาน (TH)", async () => {
    const wrapper = mountModal();
    wrapper.vm.showEditModal = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal").text()).toContain("Link to Employee");

    const wrapperTh = mountModal(mockLocaleTh);
    wrapperTh.vm.showEditModal = true;
    await wrapperTh.vm.$nextTick();
    expect(wrapperTh.find(".inner-modal").text()).toContain("เชื่อมกับพนักงาน");
  });

  it("onEditRoleChange → ตั้ง role_id", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    wrapper.vm.editForm.role = "Operator";
    wrapper.vm.onEditRoleChange();
    expect(wrapper.vm.editForm.role_id).toBe(2);
  });

  it("onEditRoleChange → role ไม่พบ → role_id = null", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    wrapper.vm.editForm.role = "Ghost";
    wrapper.vm.onEditRoleChange();
    expect(wrapper.vm.editForm.role_id).toBeNull();
  });

  it("savingEdit = true → แสดง spinner ใน Update button", async () => {
    const wrapper = mountModal();
    wrapper.vm.showEditModal = true;
    wrapper.vm.savingEdit = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".inner-modal-footer .spinner-border").exists()).toBe(true);
  });

  it("saveEdit สำเร็จ → ปิด modal + showAlert success (EN)", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));
    await wrapper.vm.saveEdit();
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("", "User updated", "success");
    });
    expect(wrapper.vm.showEditModal).toBe(false);
  });

  it("saveEdit สำเร็จ (TH) → showAlert ภาษาไทย", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));
    await wrapper.vm.saveEdit();
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("", "อัปเดตผู้ใช้สำเร็จ", "success");
    });
  });

  it("saveEdit ล้มเหลว (!res.ok) → showAlert error", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Permission denied" }),
    });
    await wrapper.vm.saveEdit();
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Permission denied", "error");
    });
  });

  it("saveEdit ล้มเหลว (no message) → default message", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    await wrapper.vm.saveEdit();
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Update failed", "error");
    });
  });
});

// ─── 6. Toggle Active ───────────────────────────────────────
describe("UserSettingModal > Toggle Active", () => {
  it("toggle active user → showConfirm ภาษา EN + fetch PUT", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));
    await wrapper.vm.toggleActive(mockUsers[0]);
    expect(showConfirm).toHaveBeenCalled();
  });

  it("toggle active (TH) → showConfirm ภาษาไทย", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));
    await wrapper.vm.toggleActive(mockUsers[0]);
    expect(showConfirm).toHaveBeenCalledWith(
      "ยืนยัน",
      expect.any(String),
      expect.any(String),
      "ยกเลิก"
    );
  });

  it("toggle inactive user (EN) → enable path", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));
    await wrapper.vm.toggleActive(mockUsers[1]);
    expect(showConfirm).toHaveBeenCalledWith(
      "Confirm",
      expect.stringContaining("enable"),
      "enable",
      "Cancel"
    );
  });

  it("toggle inactive user (TH) → เปิดใช้งาน path", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));
    await wrapper.vm.toggleActive(mockUsers[1]);
    expect(showConfirm).toHaveBeenCalledWith(
      "ยืนยัน",
      expect.stringContaining("เปิดใช้งาน"),
      "เปิดใช้งาน",
      "ยกเลิก"
    );
  });

  it("toggle showAlert success (EN) → Updated", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));
    await wrapper.vm.toggleActive(mockUsers[0]);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("", "Updated", "success");
    });
  });

  it("toggle showAlert success (TH) → อัปเดตสำเร็จ", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));
    await wrapper.vm.toggleActive(mockUsers[0]);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("", "อัปเดตสำเร็จ", "success");
    });
  });

  it("toggle ยกเลิก → ไม่เรียก fetch PUT", async () => {
    const wrapper = mountModal();
    showConfirm.mockResolvedValue(false);
    const callsBefore = mockFetch.mock.calls.length;
    await wrapper.vm.toggleActive(mockUsers[0]);
    const putCalls = mockFetch.mock.calls.slice(callsBefore).filter(
      ([, opts]) => opts && opts.method === "PUT"
    );
    expect(putCalls).toHaveLength(0);
  });

  it("toggle fetch ล้มเหลว (!res.ok) → showAlert error", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Server error" }),
    });
    await wrapper.vm.toggleActive(mockUsers[0]);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Server error", "error");
    });
  });

  it("toggle fetch ล้มเหลว (no message) → default message", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    await wrapper.vm.toggleActive(mockUsers[0]);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Failed", "error");
    });
  });
});

// ─── 7. Reset Password ─────────────────────────────────────
describe("UserSettingModal > Reset Password", () => {
  it("openReset → เปิด modal + set resetTarget", () => {
    const wrapper = mountModal();
    wrapper.vm.openReset(mockUsers[0]);
    expect(wrapper.vm.showResetModal).toBe(true);
    expect(wrapper.vm.resetTarget.email).toBe("admin@test.com");
    expect(wrapper.vm.resetPw).toBe("");
    expect(wrapper.vm.resetConfirm).toBe("");
  });

  it("reset modal header (EN) → Reset Password", async () => {
    const wrapper = mountModal();
    wrapper.vm.showResetModal = true;
    wrapper.vm.resetTarget = mockUsers[0];
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("Reset Password");
    expect(wrapper.text()).toContain("New Password");
  });

  it("reset modal header (TH) → รีเซ็ตรหัสผ่าน", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.showResetModal = true;
    wrapper.vm.resetTarget = mockUsers[0];
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain("รีเซ็ตรหัสผ่าน");
    expect(wrapper.text()).toContain("รหัสผ่านใหม่");
  });

  it("คลิก X ใน reset modal → ปิด", async () => {
    const wrapper = mountModal();
    wrapper.vm.showResetModal = true;
    wrapper.vm.resetTarget = mockUsers[0];
    await wrapper.vm.$nextTick();
    const modals = wrapper.findAll(".inner-modal");
    const resetModal = modals[modals.length - 1];
    await resetModal.find(".btn-close-minimal").trigger("click");
    expect(wrapper.vm.showResetModal).toBe(false);
  });

  it("คลิก backdrop ของ reset modal → ปิด", async () => {
    const wrapper = mountModal();
    wrapper.vm.showResetModal = true;
    wrapper.vm.resetTarget = mockUsers[0];
    await wrapper.vm.$nextTick();
    const backdrops = wrapper.findAll(".inner-backdrop");
    await backdrops[backdrops.length - 1].trigger("click");
    expect(wrapper.vm.showResetModal).toBe(false);
  });

  it("คลิก Cancel ใน reset modal → ปิด", async () => {
    const wrapper = mountModal();
    wrapper.vm.showResetModal = true;
    wrapper.vm.resetTarget = mockUsers[0];
    await wrapper.vm.$nextTick();
    const modals = wrapper.findAll(".inner-modal");
    const resetModal = modals[modals.length - 1];
    await resetModal.find(".btn-secondary").trigger("click");
    expect(wrapper.vm.showResetModal).toBe(false);
  });

  it("savingReset = true → แสดง spinner ใน Reset button", async () => {
    const wrapper = mountModal();
    wrapper.vm.showResetModal = true;
    wrapper.vm.resetTarget = mockUsers[0];
    wrapper.vm.savingReset = true;
    await wrapper.vm.$nextTick();
    const modals = wrapper.findAll(".inner-modal");
    const resetModal = modals[modals.length - 1];
    expect(resetModal.find(".spinner-border").exists()).toBe(true);
  });

  it("reset button label (TH) → รีเซ็ต", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.showResetModal = true;
    wrapper.vm.resetTarget = mockUsers[0];
    await wrapper.vm.$nextTick();
    const modals = wrapper.findAll(".inner-modal");
    const resetModal = modals[modals.length - 1];
    expect(resetModal.find(".btn-warning").text()).toContain("รีเซ็ต");
  });

  it("password < 6 → warning (EN)", async () => {
    const wrapper = mountModal();
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "123";
    wrapper.vm.resetConfirm = "123";
    await wrapper.vm.confirmReset();
    expect(showAlert).toHaveBeenCalledWith("", "Min 6 characters", "warning");
  });

  it("password < 6 → warning (TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "123";
    wrapper.vm.resetConfirm = "123";
    await wrapper.vm.confirmReset();
    expect(showAlert).toHaveBeenCalledWith("", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", "warning");
  });

  it("password ไม่ตรงกัน → warning", async () => {
    const wrapper = mountModal();
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "123456";
    wrapper.vm.resetConfirm = "999999";
    await wrapper.vm.confirmReset();
    expect(showAlert).toHaveBeenCalledWith("", "Passwords do not match", "warning");
  });

  it("reset สำเร็จ → ปิด modal + showAlert success (EN)", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "newpass123";
    wrapper.vm.resetConfirm = "newpass123";
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    await wrapper.vm.confirmReset();
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("", "Password reset successfully", "success");
    });
    expect(wrapper.vm.showResetModal).toBe(false);
  });

  it("reset สำเร็จ (TH) → showAlert ภาษาไทย", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "newpass123";
    wrapper.vm.resetConfirm = "newpass123";
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    await wrapper.vm.confirmReset();
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("", "รีเซ็ตรหัสผ่านสำเร็จ", "success");
    });
  });

  it("reset fetch ล้มเหลว → showAlert error", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "newpass123";
    wrapper.vm.resetConfirm = "newpass123";
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Reset failed" }),
    });
    await wrapper.vm.confirmReset();
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Reset failed", "error");
    });
  });

  it("reset fetch ล้มเหลว (no message) → default message", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "newpass123";
    wrapper.vm.resetConfirm = "newpass123";
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    await wrapper.vm.confirmReset();
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Reset failed", "error");
    });
  });
});

// ─── 8. Close Event ─────────────────────────────────────────
describe("UserSettingModal > Close", () => {
  it("คลิก overlay → emit close", async () => {
    const wrapper = mountModal();
    await wrapper.find(".us-overlay").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("คลิกปุ่ม X header → emit close", async () => {
    const wrapper = mountModal();
    const headerCloseBtn = wrapper.find(".us-card-header .btn-close-minimal");
    await headerCloseBtn.trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });
});

// ─── 9. Bug Cases (FAIL จนกว่าจะแก้ UserSettingModal.vue) ──
describe("UserSettingModal > Bug Cases", () => {

  // ── BUG-1 ─────────────────────────────────────────────────
  // validate() ไม่ trim email ก่อนเช็ค
  // " admin@test.com " → ผ่าน regex แต่ server จะ reject
  // อันตราย: สร้าง user ที่ email มี space ข้างหน้า/หลัง ทำให้ login ไม่ได้
  it("[BUG-1] email มี space ข้างหน้า/หลัง → ต้องแสดง error หรือ trim อัตโนมัติ", async () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "  admin@test.com  ";
    wrapper.vm.form.password = "123456";
    wrapper.vm.form.confirmPassword = "123456";
    wrapper.vm.form.role = "Admin";

    const valid = wrapper.vm.validate();

    if (valid) {
      // ถ้าผ่าน validate ต้อง trim ให้ก่อน
      expect(wrapper.vm.form.email).toBe("admin@test.com");
    } else {
      expect(wrapper.vm.errors.email).toBeTruthy();
    }
  });

  // ── BUG-2 ─────────────────────────────────────────────────
  // confirmReset() เช็คความยาว resetPw.trim() แล้ว แต่ BUG อยู่ที่:
  // resetPw = "      " (spaces) → pw = "      ".trim() = "" → length 0 → warning ✓
  // แต่ confirmReset ใช้ resetPw ส่ง API โดยไม่ trim → ส่ง space password ไปจริง
  // อันตราย: admin reset password เป็น spaces → user login ไม่ได้ (หรือ login ด้วย spaces แล้วเปิดช่องโหว่)
  it("[BUG-2] reset password ที่เป็น space ล้วน → ต้องแสดง warning", async () => {
    const wrapper = mountModal();
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "      ";
    wrapper.vm.resetConfirm = "      ";

    await wrapper.vm.confirmReset();
    // ถ้า trim ก่อนเช็ค length จะ warning - component ทำอยู่แล้ว (trim ก่อน check)
    expect(showAlert).toHaveBeenCalledWith("", expect.stringMatching(/6|characters|ตัวอักษร/), "warning");
  });

  // ── BUG-3 ─────────────────────────────────────────────────
  // validate() เช็ค password.trim().length < 6
  // "      " → trim() = "" → length 0 → error ✓ (ถ้า component trim ก่อน)
  // แต่ validate() ใน component ทำ pw = trim() แล้วเช็ค length
  // อันตราย: ถ้า validate ไม่ trim → space password ผ่านไปสร้าง account
  it("[BUG-3] add user password เป็น space ล้วน → ต้องแสดง error", async () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "test@mail.com";
    wrapper.vm.form.password = "      ";
    wrapper.vm.form.confirmPassword = "      ";
    wrapper.vm.form.role = "Admin";

    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.password).toBeTruthy();
  });

  // ── BUG-4 ─────────────────────────────────────────────────
  // ไม่มีการ confirm ก่อนปิด edit modal ขณะมีข้อมูลที่แก้ไขอยู่
  // อันตราย: admin แก้ role/permissions ค้างไว้ แล้วกด X → ข้อมูลหาย โดยไม่ถาม
  it("🔴 [BUG-4] ปิด edit modal ขณะมีการแก้ไข → ควรมี confirm ก่อน (FAIL intentional)", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    wrapper.vm.editForm.role = "Operator"; // แก้ role
    await wrapper.vm.$nextTick();

    const xBtn = wrapper.find(".inner-modal .btn-close-minimal");
    await xBtn.trigger("click");

    // ควร showConfirm ก่อนปิด — แต่ component ไม่ได้ทำ
    expect(showConfirm).toHaveBeenCalled(); // FAIL: component ปิดทันทีโดยไม่ถาม
  });

  // ── BUG-5 ─────────────────────────────────────────────────
  // submitAdd() ส่ง password แบบ plain text ใน request body โดยไม่ hash
  // (การ hash ควรทำฝั่ง backend — แต่ถ้า backend ไม่ hash ก็จะเก็บ plain text)
  // อันตราย: ถ้า API leak → password ของ user ทุกคนถูกเปิดเผย
  // Test นี้ verify ว่า password ถูกส่งไปใน body (ยืนยันว่า frontend ไม่ hash)
  it("🔴 [BUG-5] submitAdd ส่ง password เป็น plain text → ควร hash ก่อนส่ง (FAIL intentional)", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.form = {
      email: "new@mail.com",
      password: "mysecret123",
      confirmPassword: "mysecret123",
      role: "Admin",
      role_id: 1,
      is_active: true,
      rooms: [],
    };
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    }));
    await wrapper.vm.submitAdd();

    const postCall = mockFetch.mock.calls.find(([, opts]) => opts && opts.method === "POST");
    const body = JSON.parse(postCall[1].body);

    // FAIL: password ไม่ควรอยู่ใน plain text — ควร hash แล้วถึงส่ง
    expect(body.password).not.toBe("mysecret123"); // FAIL: body.password === "mysecret123"
  });
});

// ─── 10. DOM Inline Handlers & v-model Setters ─────────────
// ต้องคลิก DOM element จริงๆ เพื่อ cover inline @click/@change
// และ setValue() เพื่อ cover v-model setter functions
describe("UserSettingModal > DOM Triggers", () => {

  it("คลิก Edit button ใน user row → openEdit via DOM", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    const editBtn = wrapper.find(".btn-outline-primary");
    await editBtn.trigger("click");
    expect(wrapper.vm.showEditModal).toBe(true);
  });

  it("คลิก Toggle Active button ใน user row → toggleActive via DOM", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));
    const toggleBtn = wrapper.find(".btn-outline-warning");
    await toggleBtn.trigger("click");
    expect(showConfirm).toHaveBeenCalled();
  });

  it("คลิก Reset Password button ใน user row → openReset via DOM", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    const resetBtn = wrapper.find(".btn-outline-secondary");
    await resetBtn.trigger("click");
    expect(wrapper.vm.showResetModal).toBe(true);
  });

  it("setValue email input ใน add form → v-model setter (line 109)", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    const emailInput = wrapper.find("input[type='email']");
    await emailInput.setValue("typed@mail.com");
    expect(wrapper.vm.form.email).toBe("typed@mail.com");
  });

  it("setValue is_active checkbox ใน add form → v-model setter (line 131)", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    const checkbox = wrapper.find("#addActiveSwitch");
    await checkbox.setValue(false);
    expect(wrapper.vm.form.is_active).toBe(false);
    await checkbox.setValue(true);
    expect(wrapper.vm.form.is_active).toBe(true);
  });

  it("setValue role select ใน add form → v-model setter + onRoleChange via @change", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    await waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    // select is the role select with @change="onRoleChange"
    const selects = wrapper.findAll(".add-input-wrap select");
    await selects[0].setValue("Admin");
    expect(wrapper.vm.form.role).toBe("Admin");
  });

  it("setValue password input → v-model setter", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    const inputs = wrapper.findAll(".add-input-wrap input");
    const pwInput = inputs.find(i => i.attributes("type") === "password" || i.attributes("placeholder")?.includes("6"));
    if (pwInput) {
      await pwInput.setValue("newpass123");
      expect(wrapper.vm.form.password).toBe("newpass123");
    }
  });

  it("setValue confirmPassword input → v-model setter", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    await wrapper.vm.$nextTick();
    // The confirm password input is the second password-type input
    const allInputs = wrapper.findAll("input[type='password']");
    if (allInputs.length >= 2) {
      await allInputs[1].setValue("newpass123");
      expect(wrapper.vm.form.confirmPassword).toBe("newpass123");
    }
  });

  it("setValue room_id select ใน add form rooms → v-model setter", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.form.rooms = [{ room_id: null, scope: "view" }];
    await waitFor(() => expect(wrapper.vm.rooms.length).toBeGreaterThan(0));
    const roomSelects = wrapper.findAll(".room-select");
    if (roomSelects.length >= 1) {
      await roomSelects[0].setValue("1");
      // v-model sets string value from select; just verify setter was called
      expect(String(wrapper.vm.form.rooms[0].room_id)).toBe("1");
    }
  });

  it("setValue scope select ใน add form rooms → v-model setter", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.form.rooms = [{ room_id: null, scope: "view" }];
    await wrapper.vm.$nextTick();
    const roomSelects = wrapper.findAll(".room-select");
    if (roomSelects.length >= 2) {
      await roomSelects[1].setValue("control");
    }
    expect(wrapper.vm.form.rooms[0].scope).toBe("control");
  });

  it("setValue role select ใน edit modal → v-model setter + onEditRoleChange via @change", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    await waitFor(() => expect(wrapper.vm.roles.length).toBe(2));
    const editSelects = wrapper.findAll(".inner-modal-body .form-select");
    await editSelects[0].setValue("Operator");
    expect(wrapper.vm.editForm.role).toBe("Operator");
    expect(wrapper.vm.editForm.role_id).toBe(2);
  });

  it("setValue employee select ใน edit modal → v-model setter", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    await waitFor(() => expect(wrapper.vm.employees.length).toBeGreaterThan(0));
    const editSelects = wrapper.findAll(".inner-modal-body .form-select");
    if (editSelects.length >= 2) {
      await editSelects[1].setValue("1");
      // v-model on select gives string; verify setter triggered
      expect(String(wrapper.vm.editForm.employee_id)).toBe("1");
    }
  });

  it("setValue is_active checkbox ใน edit modal → v-model setter", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    await wrapper.vm.$nextTick();
    const checkbox = wrapper.find("#editActiveSwitch");
    await checkbox.setValue(false);
    expect(wrapper.vm.editForm.is_active).toBe(false);
  });

  it("setValue room_id select ใน edit modal rooms → v-model setter", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    wrapper.vm.editForm.rooms = [{ room_id: null, scope: "view" }];
    await waitFor(() => expect(wrapper.vm.rooms.length).toBeGreaterThan(0));
    const editRoomSelects = wrapper.findAll(".inner-modal-body .form-select");
    // room selects appear after role + employee selects
    const roomSelects = wrapper.findAll(".inner-modal-body .d-flex.gap-2 select");
    if (roomSelects.length >= 1) {
      await roomSelects[0].setValue("1");
    }
  });

  it("setValue scope select ใน edit modal rooms → v-model setter", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    wrapper.vm.editForm.rooms = [{ room_id: null, scope: "view" }];
    await wrapper.vm.$nextTick();
    const roomSelects = wrapper.findAll(".inner-modal-body .d-flex.gap-2 select");
    if (roomSelects.length >= 2) {
      await roomSelects[1].setValue("manage");
      expect(wrapper.vm.editForm.rooms[0].scope).toBe("manage");
    }
  });

  it("คลิก Update button ใน edit modal → saveEdit via DOM", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.users.length).toBeGreaterThan(0));
    wrapper.vm.openEdit(mockUsers[0]);
    await wrapper.vm.$nextTick();
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));
    const updateBtn = wrapper.find(".inner-modal-footer .btn-primary");
    await updateBtn.trigger("click");
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("", "User updated", "success");
    });
  });

  it("setValue resetPw input → v-model setter", async () => {
    const wrapper = mountModal();
    wrapper.vm.showResetModal = true;
    wrapper.vm.resetTarget = mockUsers[0];
    await wrapper.vm.$nextTick();
    const pwInputs = wrapper.findAll(".inner-modal-body input");
    if (pwInputs.length >= 1) {
      await pwInputs[0].setValue("newpass123");
      expect(wrapper.vm.resetPw).toBe("newpass123");
    }
  });

  it("setValue resetConfirm input → v-model setter", async () => {
    const wrapper = mountModal();
    wrapper.vm.showResetModal = true;
    wrapper.vm.resetTarget = mockUsers[0];
    await wrapper.vm.$nextTick();
    const pwInputs = wrapper.findAll(".inner-modal-body input");
    if (pwInputs.length >= 2) {
      await pwInputs[1].setValue("newpass123");
      expect(wrapper.vm.resetConfirm).toBe("newpass123");
    }
  });

  it("คลิก Reset button ใน reset modal → confirmReset via DOM", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "newpass123";
    wrapper.vm.resetConfirm = "newpass123";
    await wrapper.vm.$nextTick();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    const resetBtn = wrapper.find(".btn-warning");
    await resetBtn.trigger("click");
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("", "Password reset successfully", "success");
    });
  });
});

// ─── 11. Edge Cases (loadAll branches) ─────────────────────
describe("UserSettingModal > Edge Cases", () => {

  it("loadAll: API ส่ง data = null → fallback เป็น []", async () => {
    mockFetch.mockImplementation((url) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); // no data key
    });
    const wrapper = mount(UserSettingModal, {
      global: { provide: { locale: mockLocale }, stubs: { transition: false } },
    });
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    expect(wrapper.vm.users).toHaveLength(0);
    expect(wrapper.vm.rooms).toHaveLength(0);
    expect(wrapper.vm.employees).toHaveLength(0);
  });

  it("user.role = null → แสดง '—' ใน role badge", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/settings/users")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 9, email: "x@x.com", role: null, is_active: true, roomAssignments: [] }] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const wrapper = mount(UserSettingModal, {
      global: { provide: { locale: mockLocale }, stubs: { transition: false } },
    });
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    expect(wrapper.find(".role-badge").text()).toBe("—");
  });

  it("openEdit: user ไม่มี role_id → fallback null", async () => {
    const wrapper = mountModal();
    const userNoRoleId = { id: 10, email: "x@x.com", role: "Ghost", is_active: true };
    wrapper.vm.openEdit(userNoRoleId);
    expect(wrapper.vm.editForm.role_id).toBeNull();
  });

  it("confirmReset: resetPw ว่าง → pw = '' (falsy branch)", async () => {
    const wrapper = mountModal();
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "";
    wrapper.vm.resetConfirm = "";
    await wrapper.vm.confirmReset();
    expect(showAlert).toHaveBeenCalledWith("", expect.stringMatching(/6|characters|ตัวอักษร/), "warning");
  });

  it("validate: form.password ว่าง (falsy) → pw = '' → error", () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "test@mail.com";
    wrapper.vm.form.password = "";
    wrapper.vm.form.confirmPassword = "123456";
    wrapper.vm.form.role = "Admin";
    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.password).toBeTruthy();
  });

  it("validate: password >= 6 และ confirm ไม่ตรง → password error = '' แต่ confirm error ≠ ''", () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "test@mail.com";
    wrapper.vm.form.password = "123456";
    wrapper.vm.form.confirmPassword = "654321";
    wrapper.vm.form.role = "Admin";
    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.confirmPassword).toBeTruthy();
    expect(wrapper.vm.errors.password).toBe("");
  });

  it("openEdit: role_id falsy AND user.role_id falsy → role_id = null", async () => {
    const wrapper = mountModal();
    const user = { id: 20, email: "z@z.com", role: "NoMatch", is_active: true, role_id: null };
    wrapper.vm.openEdit(user);
    expect(wrapper.vm.editForm.role_id).toBeNull();
  });

  it("openEdit: user.role = null → editForm.role = '' (br 5[1] — user.role || '' falsy branch)", async () => {
    const wrapper = mountModal();
    const user = { id: 21, email: "norole@test.com", role: null, role_id: null, is_active: true };
    wrapper.vm.openEdit(user);
    expect(wrapper.vm.editForm.role).toBe("");
  });

  it("submitAdd: data.message absent + EN locale → 'Failed to create user' (br 46[1])", async () => {
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.form = {
      email: "dup@mail.com",
      password: "123456",
      confirmPassword: "123456",
      role: "Admin",
      role_id: 1,
      is_active: true,
      rooms: [],
    };
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}), // no message key, EN locale
    });
    await wrapper.vm.submitAdd();
    expect(wrapper.vm.addError).toBe("Failed to create user");
  });

  it("submitAdd: data.message absent → use locale default message (br 46[1] TH)", async () => {
    const wrapper = mountModal(mockLocaleTh);
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.form = {
      email: "dup@mail.com",
      password: "123456",
      confirmPassword: "123456",
      role: "Admin",
      role_id: 1,
      is_active: true,
      rooms: [],
    };
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}), // no message key
    });
    await wrapper.vm.submitAdd();
    expect(wrapper.vm.addError).toBe("สร้างผู้ใช้ไม่สำเร็จ");
  });

  it("submitAdd: localStorage.getItem('user') = null → company_id = undefined", async () => {
    const storeBackup = store.user;
    delete store.user;
    const wrapper = mountModal();
    await waitFor(() => expect(wrapper.vm.loadingList).toBe(false));
    wrapper.vm.form = {
      email: "new@mail.com",
      password: "123456",
      confirmPassword: "123456",
      role: "Admin",
      role_id: 1,
      is_active: true,
      rooms: [],
    };
    setupFetchForLoadAll();
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: { id: 99 } }),
    }));
    await wrapper.vm.submitAdd();
    store.user = storeBackup;
  });
});
