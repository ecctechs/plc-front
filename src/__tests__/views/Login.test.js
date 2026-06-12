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

// ─── 5. Bug Cases (FAIL จนกว่าจะแก้ Login.vue) ───────────────
//
//  กติกา: ห้ามแก้ test — ต้องแก้ Login.vue เท่านั้น

describe("Login > Bug Cases", () => {

  // ── BUG-1 ─────────────────────────────────────────────────
  // validate() เช็ค !password และ length < 6
  // แต่ "      " (6 spaces) → ไม่ empty, length = 6 → ผ่านทั้งคู่
  // ควร trim ก่อนเช็ค
  it("[BUG-1] password ที่เป็น space ล้วน ควรแสดง error ไม่ใช่เรียก API", async () => {
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "      " });
    await wrapper.find("form").trigger("submit");

    expect(wrapper.vm.passwordError).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── BUG-2 ─────────────────────────────────────────────────
  // onSubmit() ไม่มี guard if (isLoading) return ตอนต้น
  // ทำให้ submit 2 ครั้งก่อน fetch แรกเสร็จ → ส่ง API 2 รอบ
  it("[BUG-2] submit 2 ครั้งรวด → API ต้องถูกเรียกแค่ 1 ครั้ง", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });

    wrapper.find("form").trigger("submit");
    wrapper.find("form").trigger("submit");

    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // ── BUG-3 ─────────────────────────────────────────────────
  // server ส่ง { success: true, data: null }
  // code: data.data.user → TypeError → catch → "Connection error"
  // error message ทำให้ user เข้าใจผิดว่าเน็ตหาย
  it("[BUG-3] server ส่ง data: null → ไม่ควรแสดง 'Connection error'", async () => {
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
    expect(wrapper.find(".error-banner").text()).not.toContain("Connection error");
  });

  // ── BUG-4 ─────────────────────────────────────────────────
  // server ส่ง success: true แต่ไม่มี token ใน response
  // code: localStorage.setItem('token', undefined) → บันทึก string "undefined"
  // ทำให้ token ที่เก็บไว้ใช้งานไม่ได้
  it("[BUG-4] server ไม่ส่ง token → ไม่ควรบันทึก 'undefined' ลง localStorage", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { user: { id: 1, permissions: {} } }, // ไม่มี token
      }),
    });
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");

    await vi.waitFor(() => {
      expect(
        store["token"] !== undefined || wrapper.find(".error-banner").exists()
      ).toBe(true);
    });
    expect(store["token"]).not.toBe("undefined");
  });
});
