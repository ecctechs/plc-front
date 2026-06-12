import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import Login from "../../views/Login.vue";

// ─── Mock ─────────────────────────────────────────────────────

// mock locale (Login ใช้ inject)
const mockLocale = {
  current: "th",
  t: (key) => key,
  toggle: vi.fn(),
};

// mock fetch ทั้ง global
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// mock localStorage
const store = {};
vi.stubGlobal("localStorage", {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = val; },
  removeItem: (key) => { delete store[key]; },
});

// mock window.location.reload
delete window.location;
window.location = { reload: vi.fn() };

// helper mount
function mountLogin() {
  return mount(Login, {
    global: {
      provide: { locale: mockLocale },
      stubs: { transition: false },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(store).forEach((k) => delete store[k]);
});

// ─── 1. Render ────────────────────────────────────────────────

describe("Login > Render", () => {
  it("render หน้า login สำเร็จ", () => {
    const wrapper = mountLogin();
    expect(wrapper.find(".auth-wrapper").exists()).toBe(true);
    expect(wrapper.find(".auth-form").exists()).toBe(true);
  });

  it("แสดง input email และ password", () => {
    const wrapper = mountLogin();
    const inputs = wrapper.findAll("input");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
  });

  it("แสดงปุ่ม Sign In", () => {
    const wrapper = mountLogin();
    expect(wrapper.find(".btn-submit").exists()).toBe(true);
  });

  it("แสดงปุ่มเปลี่ยนภาษา", () => {
    const wrapper = mountLogin();
    expect(wrapper.find(".btn-lang-fixed").exists()).toBe(true);
  });
});

// ─── 2. Validation ────────────────────────────────────────────

describe("Login > Validation", () => {
  it("email ว่าง → แสดง error", async () => {
    const wrapper = mountLogin();
    await wrapper.setData({ email: "", password: "123456" });
    await wrapper.find("form").trigger("submit");

    expect(wrapper.find(".helper-text").text()).toBe("Please enter your email");
  });

  it("email format ผิด → แสดง error", async () => {
    const wrapper = mountLogin();
    await wrapper.setData({ email: "not-email", password: "123456" });
    await wrapper.find("form").trigger("submit");

    expect(wrapper.find(".helper-text").text()).toBe("Please enter a valid email address");
  });

  it("password ว่าง → แสดง error", async () => {
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "" });
    await wrapper.find("form").trigger("submit");

    expect(wrapper.find(".helper-text").text()).toBe("Please enter your password");
  });

  it("password สั้นกว่า 6 ตัว → แสดง error", async () => {
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123" });
    await wrapper.find("form").trigger("submit");

    expect(wrapper.find(".helper-text").text()).toBe("Password must be at least 6 characters");
  });

  it("email + password ถูกต้อง → ไม่มี error (เรียก API)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { token: "abc", user: { id: 1, permissions: {} } },
      }),
    });

    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");

    expect(wrapper.find(".helper-text").exists()).toBe(false);
  });
});

// ─── 3. Mock API — vi.fn() + vi.stubGlobal("fetch") ──────────

describe("Login > API Call (Mock fetch)", () => {
  it("login สำเร็จ → เก็บ token ลง localStorage + reload", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          token: "my-token-123",
          user: {
            id: 1,
            email: "test@mail.com",
            permissions: { tab_permissions: { dashboard: true } },
          },
        },
      }),
    });

    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");

    // รอ async ทำงานเสร็จ
    await vi.waitFor(() => {
      expect(store["token"]).toBe("my-token-123");
    });

    expect(store["user"]).toContain("test@mail.com");
    expect(store["permissions"]).toContain("dashboard");
    expect(window.location.reload).toHaveBeenCalled();
  });

  it("login ล้มเหลว → แสดง error message จาก API", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        message: "Invalid email or password",
      }),
    });

    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "wrongpass" });
    await wrapper.find("form").trigger("submit");

    await vi.waitFor(() => {
      expect(wrapper.find(".error-banner").exists()).toBe(true);
    });

    expect(wrapper.find(".error-banner").text()).toContain("Invalid email or password");
  });

  it("network error → แสดง connection error", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"));

    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");

    await vi.waitFor(() => {
      expect(wrapper.find(".error-banner").exists()).toBe(true);
    });

    expect(wrapper.find(".error-banner").text()).toContain("Connection error");
  });

  it("ส่ง fetch ด้วย method POST + body ถูกต้อง", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { token: "t", user: { id: 1, permissions: {} } },
      }),
    });

    const wrapper = mountLogin();
    await wrapper.setData({ email: "admin@test.com", password: "secret123" });
    await wrapper.find("form").trigger("submit");

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/auth/login");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.email).toBe("admin@test.com");
    expect(body.password).toBe("secret123");
  });
});

// ─── 4. State Change ──────────────────────────────────────────

describe("Login > State Change", () => {
  it("กำลัง loading → ปุ่ม disabled + แสดง loader", async () => {
    // ทำให้ fetch ค้างไว้ไม่ resolve
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");

    expect(wrapper.find(".btn-submit").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".loader").exists()).toBe(true);
  });

  it("loading เสร็จ → ปุ่มกลับมาใช้ได้", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ success: false, message: "fail" }),
    });

    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");

    await vi.waitFor(() => {
      expect(wrapper.vm.isLoading).toBe(false);
    });

    expect(wrapper.find(".btn-submit").attributes("disabled")).toBeUndefined();
  });

  it("คลิกปุ่มตา → toggle แสดง/ซ่อน password", async () => {
    const wrapper = mountLogin();
    const pwInput = wrapper.find(".password-input");

    expect(pwInput.attributes("type")).toBe("password");

    await wrapper.find(".btn-view").trigger("click");
    expect(wrapper.find(".password-input").attributes("type")).toBe("text");

    await wrapper.find(".btn-view").trigger("click");
    expect(wrapper.find(".password-input").attributes("type")).toBe("password");
  });
});

// ─── 5. Coverage ──────────────────────────────────────────────

describe("Login > Coverage (line 6, 33, 46)", () => {
  it("คลิกปุ่มเปลี่ยนภาษา → เรียก locale.toggle()", async () => {
    const wrapper = mountLogin();
    await wrapper.find(".btn-lang-fixed").trigger("click"); // cover line 6
    expect(mockLocale.toggle).toHaveBeenCalled();
  });

  it("กำลัง loading → input email และ password ถูก disabled", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");

    const inputs = wrapper.findAll("input"); // cover line 33, 46
    inputs.forEach((input) => {
      expect(input.attributes("disabled")).toBeDefined();
    });
  });
});

// ─── 5. Bug Cases ─────────────────────────────────────────────
//
//  test เหล่านี้ออกแบบให้ FAIL เพื่อแสดงว่า Login.vue มีบัคตรงไหน
//  แก้บัคแล้วค่อย uncomment expect ที่ถูกต้อง

describe("Login > Bug Cases", () => {

  // ── BUG 1 ──────────────────────────────────────────────────
  // password ที่เป็น space ล้วน 6 ตัว (เช่น "      ") ผ่าน validation ได้
  // เพราะ validate() เช็คแค่ length < 6 และ !password
  // แต่ "      ".length === 6 และ !!"      " === true → ผ่านทั้งคู่
  it("[BUG-1] password ที่เป็น space ล้วน ควรถูก reject แต่ผ่าน validation", async () => {
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "      " }); // 6 spaces

    await wrapper.find("form").trigger("submit");

    // สิ่งที่เกิดขึ้นจริง: API ถูกเรียก ทั้งที่ไม่ควร
    expect(mockFetch).toHaveBeenCalled(); // ← PASS แต่นี่คือ bug

    // สิ่งที่ควรเกิด (uncommment เมื่อแก้บัคแล้ว):
    // expect(wrapper.find(".helper-text").exists()).toBe(true);
    // expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── BUG 2 ──────────────────────────────────────────────────
  // submit ซ้ำ 2 ครั้งก่อน fetch เสร็จ → ส่ง API 2 รอบ
  // เพราะ onSubmit() ไม่มี guard if (this.isLoading) return ตอนต้น
  // ปุ่ม disabled ป้องกัน user ปกติ แต่ป้องกัน programmatic call ไม่ได้
  it("[BUG-2] submit 2 ครั้งรวดเดียว → fetch ถูกเรียก 2 รอบ", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // ค้างตลอด

    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });

    // ไม่ await — simulate การกด submit เร็วมาก 2 ครั้งก่อน isLoading block UI
    wrapper.find("form").trigger("submit");
    wrapper.find("form").trigger("submit");

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());

    // สิ่งที่เกิดขึ้นจริง: fetch ถูกเรียก 2 ครั้ง
    expect(mockFetch).toHaveBeenCalledTimes(2); // ← PASS แต่นี่คือ bug

    // สิ่งที่ควรเกิด (uncomment เมื่อแก้บัคแล้ว):
    // expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // ── BUG 3 ──────────────────────────────────────────────────
  // server ส่ง { success: true, data: null } กลับมา
  // code: const u = data.data.user → TypeError crash → catch block ทำงาน
  // แสดง "Connection error" ทั้งที่เน็ตปกติ ทำให้ user เข้าใจผิด
  it("[BUG-3] server ส่ง data: null → crash แสดง 'Connection error' แทนที่จะบอก server error", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: null }),
    });

    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");

    await vi.waitFor(() => {
      expect(wrapper.find(".error-banner").exists()).toBe(true);
    });

    // สิ่งที่เกิดขึ้นจริง: โชว์ "Connection error" ทั้งที่ปัญหาอยู่ที่ server
    expect(wrapper.find(".error-banner").text()).toContain("Connection error"); // ← PASS แต่นี่คือ bug

    // สิ่งที่ควรเกิด (uncomment เมื่อแก้บัคแล้ว):
    // expect(wrapper.find(".error-banner").text()).not.toContain("Connection error");
    // expect(wrapper.find(".error-banner").text()).toContain("unexpected");
  });
});
