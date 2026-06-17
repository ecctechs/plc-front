import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import UserSettingModal from "../../components/UserSettingModal.vue";

// ─── Mock swalHelper ────────────────────────────────────────
vi.mock("../../utils/swalHelper", () => ({
  showAlert: vi.fn(),
  showConfirm: vi.fn(() => Promise.resolve(true)),
}));

import { showAlert, showConfirm } from "../../utils/swalHelper";

// ─── Mock fetch & localStorage ──────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const store = { token: "fake-token", user: JSON.stringify({ company_id: 1 }) };
vi.stubGlobal("localStorage", {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = val; },
  removeItem: (key) => { delete store[key]; },
});

// ─── Mock locale ────────────────────────────────────────────
const mockLocale = {
  current: "en",
  t: (key) => key,
  toggle: vi.fn(),
};

// ─── Mock Data ──────────────────────────────────────────────
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

function mountModal() {
  setupFetchForLoadAll();
  return mount(UserSettingModal, {
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
describe("UserSettingModal > Render", () => {
  it("render modal สำเร็จ", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".us-overlay").exists()).toBe(true);
    expect(wrapper.find(".us-card").exists()).toBe(true);
  });

  it("แสดง header title", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".us-title").text()).toBe("User Management");
  });

  it("แสดง 2 tabs: User List / Add New User", () => {
    const wrapper = mountModal();
    const tabs = wrapper.findAll(".us-tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].text()).toContain("User List");
    expect(tabs[1].text()).toContain("Add New User");
  });

  it("tab แรก (list) เป็น active", () => {
    const wrapper = mountModal();
    expect(wrapper.vm.activeTab).toBe("list");
  });
});

// ─── 2. Load Users (API) ────────────────────────────────────
describe("UserSettingModal > Load Data", () => {
  it("mounted → เรียก fetch 4 API (users, rooms, roles, employees)", async () => {
    mountModal();
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  it("โหลดสำเร็จ → แสดง users ในตาราง", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => {
      expect(wrapper.vm.users).toHaveLength(2);
    });
    expect(wrapper.text()).toContain("admin@test.com");
    expect(wrapper.text()).toContain("user@test.com");
  });

  it("โหลดล้มเหลว → เรียก showAlert error", async () => {
    mockFetch.mockRejectedValue(new Error("Network"));
    mount(UserSettingModal, {
      global: { provide: { locale: mockLocale }, stubs: { transition: false } },
    });

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Error", "Cannot load data", "error");
    });
  });
});

// ─── 3. User List Display ───────────────────────────────────
describe("UserSettingModal > User List", () => {
  it("แสดง role badge", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.users.length).toBe(2));
    const badges = wrapper.findAll(".role-badge");
    expect(badges[0].text()).toBe("Admin");
  });

  it("is_active = true → แสดง Active", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.users.length).toBe(2));
    const statuses = wrapper.findAll(".status-active");
    expect(statuses.length).toBeGreaterThanOrEqual(1);
  });

  it("room_id = null → แสดง All", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.users.length).toBe(2));
    expect(wrapper.text()).toContain("All");
  });

  it("แสดง user avatar ตัวอักษรแรกของ email", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.users.length).toBe(2));
    const avatars = wrapper.findAll(".user-avatar");
    expect(avatars[0].text()).toBe("A"); // admin@test.com
  });
});

// ─── 4. Add User Tab ────────────────────────────────────────
describe("UserSettingModal > Add User", () => {
  it("คลิก tab Add → สลับไป add form", async () => {
    const wrapper = mountModal();
    const addTab = wrapper.findAll(".us-tab")[1];
    await addTab.trigger("click");
    expect(wrapper.vm.activeTab).toBe("add");
  });

  it("validate email ว่าง → แสดง error", async () => {
    const wrapper = mountModal();
    wrapper.vm.activeTab = "add";
    wrapper.vm.form.email = "";
    wrapper.vm.form.password = "123456";
    wrapper.vm.form.confirmPassword = "123456";
    wrapper.vm.form.role = "Admin";

    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.email).toBeTruthy();
  });

  it("validate password < 6 → แสดง error", async () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "test@mail.com";
    wrapper.vm.form.password = "123";
    wrapper.vm.form.confirmPassword = "123";
    wrapper.vm.form.role = "Admin";

    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.password).toBeTruthy();
  });

  it("confirm ไม่ตรง → แสดง error", async () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "test@mail.com";
    wrapper.vm.form.password = "123456";
    wrapper.vm.form.confirmPassword = "999999";
    wrapper.vm.form.role = "Admin";

    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.confirmPassword).toBeTruthy();
  });

  it("ไม่เลือก role → แสดง error", async () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "test@mail.com";
    wrapper.vm.form.password = "123456";
    wrapper.vm.form.confirmPassword = "123456";
    wrapper.vm.form.role = "";

    const valid = wrapper.vm.validate();
    expect(valid).toBe(false);
    expect(wrapper.vm.errors.role).toBeTruthy();
  });

  it("กรอกถูกหมด → validate ผ่าน", async () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "new@mail.com";
    wrapper.vm.form.password = "123456";
    wrapper.vm.form.confirmPassword = "123456";
    wrapper.vm.form.role = "Admin";

    const valid = wrapper.vm.validate();
    expect(valid).toBe(true);
  });

  it("submitAdd สำเร็จ → เรียก showAlert success + กลับ list", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.loadingList).toBe(false));

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

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 3 } }),
    });

    await wrapper.vm.submitAdd();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith(
        "User Created!",
        expect.stringContaining("new@mail.com"),
        "success"
      );
    });
    expect(wrapper.vm.activeTab).toBe("list");
  });

  it("submitAdd ล้มเหลว → แสดง addError", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.loadingList).toBe(false));

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
});

// ─── 5. Edit User ───────────────────────────────────────────
describe("UserSettingModal > Edit User", () => {
  it("openEdit → เปิด edit modal พร้อมข้อมูล", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.users.length).toBe(2));

    wrapper.vm.openEdit(mockUsers[0]);
    expect(wrapper.vm.showEditModal).toBe(true);
    expect(wrapper.vm.editForm.email).toBe("admin@test.com");
    expect(wrapper.vm.editForm.role).toBe("Admin");
  });

  it("saveEdit สำเร็จ → ปิด modal + showAlert success", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.users.length).toBe(2));

    wrapper.vm.openEdit(mockUsers[0]);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await wrapper.vm.saveEdit();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("", "User updated", "success");
    });
    expect(wrapper.vm.showEditModal).toBe(false);
  });
});

// ─── 6. Toggle Active ───────────────────────────────────────
describe("UserSettingModal > Toggle Active", () => {
  it("toggle active → เรียก showConfirm + fetch PUT", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.users.length).toBe(2));

    showConfirm.mockResolvedValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await wrapper.vm.toggleActive(mockUsers[0]);

    expect(showConfirm).toHaveBeenCalled();
    await vi.waitFor(() => {
      const putCalls = mockFetch.mock.calls.filter(
        ([, opts]) => opts && opts.method === "PUT"
      );
      expect(putCalls.length).toBeGreaterThanOrEqual(1);
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
});

// ─── 7. Reset Password ─────────────────────────────────────
describe("UserSettingModal > Reset Password", () => {
  it("openReset → เปิด reset modal", () => {
    const wrapper = mountModal();
    wrapper.vm.openReset(mockUsers[0]);
    expect(wrapper.vm.showResetModal).toBe(true);
    expect(wrapper.vm.resetTarget.email).toBe("admin@test.com");
  });

  it("password < 6 → แสดง warning", async () => {
    const wrapper = mountModal();
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "123";
    wrapper.vm.resetConfirm = "123";

    await wrapper.vm.confirmReset();
    expect(showAlert).toHaveBeenCalledWith("", "Min 6 characters", "warning");
  });

  it("password ไม่ตรงกัน → แสดง warning", async () => {
    const wrapper = mountModal();
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "123456";
    wrapper.vm.resetConfirm = "999999";

    await wrapper.vm.confirmReset();
    expect(showAlert).toHaveBeenCalledWith("", "Passwords do not match", "warning");
  });

  it("reset สำเร็จ → ปิด modal + showAlert success", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.loadingList).toBe(false));

    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "newpass123";
    wrapper.vm.resetConfirm = "newpass123";

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await wrapper.vm.confirmReset();

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("", "Password reset successfully", "success");
    });
    expect(wrapper.vm.showResetModal).toBe(false);
  });
});

// ─── 8. Close Event ─────────────────────────────────────────
describe("UserSettingModal > Close", () => {
  it("คลิก overlay → emit close", async () => {
    const wrapper = mountModal();
    await wrapper.find(".us-overlay").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("คลิกปุ่ม X → emit close", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-close-minimal").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });
});

// ─── 9. Room Management ─────────────────────────────────────
describe("UserSettingModal > Room Management", () => {
  it("resetAddForm → ล้าง form กลับค่าเริ่มต้น", () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "dirty@mail.com";
    wrapper.vm.form.rooms = [{ room_id: 1, scope: "view" }];

    wrapper.vm.resetAddForm();

    expect(wrapper.vm.form.email).toBe("");
    expect(wrapper.vm.form.rooms).toHaveLength(0);
  });

  it("onRoleChange → ตั้ง role_id ตาม role name", async () => {
    const wrapper = mountModal();
    await vi.waitFor(() => expect(wrapper.vm.roles.length).toBe(2));

    wrapper.vm.form.role = "Admin";
    wrapper.vm.onRoleChange();
    expect(wrapper.vm.form.role_id).toBe(1);
  });
});

// ─── 10. Bug Cases (FAIL จนกว่าจะแก้ UserSettingModal.vue) ──
//
//  กติกา: ห้ามแก้ test — ต้องแก้ UserSettingModal.vue เท่านั้น

describe("UserSettingModal > Bug Cases", () => {

  // ── BUG-1 ─────────────────────────────────────────────────
  // validate() ไม่ trim email ก่อนเช็ค
  // " admin@test.com " → ผ่าน regex แต่ server จะ reject
  // ควร trim email ก่อน validate
  it("[BUG-1] email มี space ข้างหน้า/หลัง → ต้องแสดง error หรือ trim อัตโนมัติ", async () => {
    const wrapper = mountModal();
    wrapper.vm.form.email = "  admin@test.com  ";
    wrapper.vm.form.password = "123456";
    wrapper.vm.form.confirmPassword = "123456";
    wrapper.vm.form.role = "Admin";

    const valid = wrapper.vm.validate();

    if (valid) {
      expect(wrapper.vm.form.email).toBe("admin@test.com");
    } else {
      expect(wrapper.vm.errors.email).toBeTruthy();
    }
  });

  // ── BUG-2 ─────────────────────────────────────────────────
  // confirmReset() เช็ค resetPw.length < 6
  // แต่ "      " (6 spaces) → length = 6 → ผ่าน
  // ควร trim password ก่อนเช็ค เหมือน BUG-1 ใน Login.vue
  it("[BUG-2] reset password ที่เป็น space ล้วน → ต้องแสดง warning", async () => {
    const wrapper = mountModal();
    wrapper.vm.openReset(mockUsers[0]);
    wrapper.vm.resetPw = "      ";
    wrapper.vm.resetConfirm = "      ";

    await wrapper.vm.confirmReset();
    expect(showAlert).toHaveBeenCalledWith("", "Min 6 characters", "warning");
  });

  // ── BUG-3 ─────────────────────────────────────────────────
  // validate() เช็ค password.length < 6 เหมือนกัน
  // "      " (6 spaces) → ผ่าน validate → ส่ง space-only password ไป API
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
});
