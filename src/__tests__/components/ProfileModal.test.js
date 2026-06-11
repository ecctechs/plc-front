import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ProfileModal from "../../components/ProfileModal.vue";

// ─── Mock fetch (สำหรับ savePassword) ─────────────────────────

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

// mock locale ที่ component ใช้ inject
const mockLocale = {
  current: "th",
  t: (key) => key,
  toggle: () => {},
};

// helper ย่อโค้ดซ้ำ
function mountModal(userOverride = {}) {
  return mount(ProfileModal, {
    props: { user: { ...mockUser, ...userOverride } },
    global: {
      provide: { locale: mockLocale },
      stubs: { transition: false },
    },
  });
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

  it("ถ้าไม่มี employee → แสดง email แทน", () => {
    const wrapper = mountModal({ employee: null });
    expect(wrapper.find(".user-name").text()).toContain("somchai");
  });

  it("แสดง role badge", () => {
    const wrapper = mountModal();
    expect(wrapper.find(".user-role-badge").text()).toBe("Admin");
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
    await wrapper.find(".btn-secondary-action").trigger("click");

    expect(wrapper.find(".form-section").exists()).toBe(true);
    expect(wrapper.findAll(".pf-input")).toHaveLength(3);
  });

  it("คลิก Cancel → กลับไป view mode", async () => {
    const wrapper = mountModal();
    await wrapper.find(".btn-secondary-action").trigger("click");
    expect(wrapper.find(".form-section").exists()).toBe(true);

    await wrapper.find(".btn-secondary-action").trigger("click");
    expect(wrapper.find(".form-section").exists()).toBe(false);
    expect(wrapper.find(".scroll-body").exists()).toBe(true);
  });
});

// ─── Save Password (Mock API) ────────────────────────────────

describe("ProfileModal > Save Password (Async)", () => {
  async function goToPasswordMode(wrapper) {
    await wrapper.find(".btn-secondary-action").trigger("click");
  }

  it("ไม่กรอก current password → แสดง error", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);

    await wrapper.setData({ pwForm: { current: "", newPw: "123456", confirm: "123456" } });
    await wrapper.find(".btn-save-action").trigger("click");

    expect(wrapper.find(".err-text").exists()).toBe(true);
  });

  it("new password สั้นกว่า 6 → แสดง error", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);

    await wrapper.setData({ pwForm: { current: "oldpass", newPw: "123", confirm: "123" } });
    await wrapper.find(".btn-save-action").trigger("click");

    expect(wrapper.find(".err-text").exists()).toBe(true);
  });

  it("confirm ไม่ตรง → แสดง error", async () => {
    const wrapper = mountModal();
    await goToPasswordMode(wrapper);

    await wrapper.setData({ pwForm: { current: "oldpass", newPw: "123456", confirm: "999999" } });
    await wrapper.find(".btn-save-action").trigger("click");

    expect(wrapper.find(".err-text").text()).toBe("Passwords do not match");
  });

  it("กรอกถูกต้อง → เรียก fetch API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const wrapper = mountModal();
    await goToPasswordMode(wrapper);

    await wrapper.setData({ pwForm: { current: "oldpass", newPw: "newpass123", confirm: "newpass123" } });
    await wrapper.find(".btn-save-action").trigger("click");

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/auth/change-password");
    expect(options.method).toBe("PUT");

    const body = JSON.parse(options.body);
    expect(body.current_password).toBe("oldpass");
    expect(body.new_password).toBe("newpass123");
  });

  it("API error → แสดง error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Current password is wrong" }),
    });

    const wrapper = mountModal();
    await goToPasswordMode(wrapper);

    await wrapper.setData({ pwForm: { current: "wrong", newPw: "newpass123", confirm: "newpass123" } });
    await wrapper.find(".btn-save-action").trigger("click");

    await vi.waitFor(() => {
      expect(wrapper.find(".err-text").exists()).toBe(true);
    });

    expect(wrapper.find(".err-text").text()).toBe("Current password is wrong");
  });
});
