import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import Login from "../../views/Login.vue";

// ─── Mock ─────────────────────────────────────────────────────

const mockLocale = {
  current: "th",
  t: (key) => key,
  toggle: vi.fn(),
};

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const store = {};
vi.stubGlobal("localStorage", {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = val; },
  removeItem: (key) => { delete store[key]; },
});

delete window.location;
window.location = { reload: vi.fn() };

function mountLogin(locale = mockLocale) {
  return mount(Login, {
    global: {
      provide: { locale },
      stubs: { transition: false },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(store).forEach((k) => delete store[k]);
});

// ═══════════════════════════════════════════════════════════
// 1. Render
// ═══════════════════════════════════════════════════════════
describe("Login > Render", () => {
  it("render หน้า login สำเร็จ", () => {
    const wrapper = mountLogin();
    expect(wrapper.find(".auth-wrapper").exists()).toBe(true);
    expect(wrapper.find(".auth-form").exists()).toBe(true);
  });

  it("แสดง input email และ password", () => {
    const wrapper = mountLogin();
    expect(wrapper.findAll("input").length).toBeGreaterThanOrEqual(2);
  });

  it("แสดงปุ่ม Sign In", () => {
    const wrapper = mountLogin();
    expect(wrapper.find(".btn-submit").exists()).toBe(true);
  });

  it("แสดงปุ่มเปลี่ยนภาษา", () => {
    const wrapper = mountLogin();
    expect(wrapper.find(".btn-lang-fixed").exists()).toBe(true);
  });

  it("locale.current = 'th' → แสดง 'TH' บนปุ่มภาษา", () => {
    const wrapper = mountLogin();
    expect(wrapper.find(".btn-lang-fixed").text()).toContain("TH");
  });

  it("locale.current = 'en' → แสดง 'EN' บนปุ่มภาษา (EN branch)", () => {
    // ครอบคลุม: locale.current === 'th' ? 'TH' : 'EN' → 'EN' branch
    const enLocale = { current: "en", t: (k) => k, toggle: vi.fn() };
    const wrapper = mountLogin(enLocale);
    expect(wrapper.find(".btn-lang-fixed").text()).toContain("EN");
  });

  it("แสดง footer Industrial Control System v2.0", () => {
    const wrapper = mountLogin();
    expect(wrapper.text()).toContain("Industrial Control System v2.0");
  });

  it("error-banner ไม่แสดงเมื่อ errorMessage ว่าง (v-if=false)", () => {
    const wrapper = mountLogin();
    expect(wrapper.find(".error-banner").exists()).toBe(false);
  });

  it("error-banner แสดงเมื่อ errorMessage มีค่า (v-if=true)", async () => {
    const wrapper = mountLogin();
    wrapper.vm.errorMessage = "Some error";
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".error-banner").exists()).toBe(true);
    expect(wrapper.find(".error-banner").text()).toContain("Some error");
  });
});

// ═══════════════════════════════════════════════════════════
// 2. Validation
// ═══════════════════════════════════════════════════════════
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

  it("validate() คืน true เมื่อ email และ password ถูกต้อง", () => {
    const wrapper = mountLogin();
    wrapper.vm.email = "test@mail.com";
    wrapper.vm.password = "123456";
    const result = wrapper.vm.validate();
    expect(result).toBe(true);
    expect(wrapper.vm.emailError).toBe("");
    expect(wrapper.vm.passwordError).toBe("");
  });

  it("validate() คืน false เมื่อ email ผิด", () => {
    const wrapper = mountLogin();
    wrapper.vm.email = "";
    wrapper.vm.password = "123456";
    expect(wrapper.vm.validate()).toBe(false);
  });

  it("password เป็น space ล้วน → trim แล้วว่าง → error", async () => {
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "      " });
    await wrapper.find("form").trigger("submit");
    // ครอบคลุม: const pw = this.password ? this.password.trim() : '' → "" → !pw = true
    expect(wrapper.vm.passwordError).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// 3. API Call
// ═══════════════════════════════════════════════════════════
describe("Login > API Call", () => {
  it("login สำเร็จ → เก็บ token + user + permissions ลง localStorage + reload", async () => {
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
    await vi.waitFor(() => { expect(store["token"]).toBe("my-token-123"); });
    expect(store["user"]).toContain("test@mail.com");
    expect(store["permissions"]).toContain("dashboard");
    expect(window.location.reload).toHaveBeenCalled();
  });

  it("login สำเร็จ ด้วย u.tab_permissions โดยตรง (middle || branch)", async () => {
    // ครอบคลุม: u.permissions?.tab_permissions (undefined) || u.tab_permissions (truthy) || {}
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          token: "tok-perm",
          user: {
            id: 2,
            tab_permissions: { oee: true },   // ไม่มี permissions object → fallback ถึง u.tab_permissions
          },
        },
      }),
    });
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");
    await vi.waitFor(() => expect(window.location.reload).toHaveBeenCalled());
    expect(store["permissions"]).toContain("oee");
  });

  it("login ล้มเหลว → แสดง error message จาก API", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ success: false, message: "Invalid email or password" }),
    });
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "wrongpass" });
    await wrapper.find("form").trigger("submit");
    await vi.waitFor(() => { expect(wrapper.find(".error-banner").exists()).toBe(true); });
    expect(wrapper.find(".error-banner").text()).toContain("Invalid email or password");
  });

  it("login ล้มเหลว ไม่มี message → ใช้ fallback locale.t (|| branch)", async () => {
    // ครอบคลุม: data.message || locale.t('Invalid email or password') → falsy → fallback
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ success: false }), // ไม่มี message field
    });
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "wrongpass" });
    await wrapper.find("form").trigger("submit");
    await vi.waitFor(() => { expect(wrapper.find(".error-banner").exists()).toBe(true); });
    expect(wrapper.vm.errorMessage).toBe("Invalid email or password");
  });

  it("network error → แสดง connection error", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"));
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");
    await vi.waitFor(() => { expect(wrapper.find(".error-banner").exists()).toBe(true); });
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
    await vi.waitFor(() => { expect(mockFetch).toHaveBeenCalled(); });
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/auth/login");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.email).toBe("admin@test.com");
    expect(body.password).toBe("secret123");
  });

  it("server ส่ง data: null → แสดง 'Invalid response' (ไม่ crash)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: null }),
    });
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");
    await vi.waitFor(() => { expect(wrapper.find(".error-banner").exists()).toBe(true); });
    expect(wrapper.vm.errorMessage).toContain("Invalid response from server");
  });

  it("server ส่ง success: true แต่ไม่มี token → แสดง 'Invalid response'", async () => {
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
    await vi.waitFor(() => { expect(wrapper.find(".error-banner").exists()).toBe(true); });
    expect(store["token"]).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
// 4. State Change
// ═══════════════════════════════════════════════════════════
describe("Login > State Change", () => {
  it("กำลัง loading → ปุ่ม disabled + แสดง loader", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");
    expect(wrapper.find(".btn-submit").attributes("disabled")).toBeDefined();
    expect(wrapper.find(".loader").exists()).toBe(true);
  });

  it("isLoading = true → text แสดง 'Signing in...' (ternary branch)", async () => {
    const wrapper = mountLogin();
    wrapper.vm.isLoading = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".btn-submit").text()).toContain("Signing in...");
  });

  it("isLoading = false → text แสดง 'Sign In'", () => {
    const wrapper = mountLogin();
    expect(wrapper.find(".btn-submit").text()).toContain("Sign In");
  });

  it("loading เสร็จ → ปุ่มกลับมาใช้ได้", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ success: false, message: "fail" }),
    });
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");
    await vi.waitFor(() => { expect(wrapper.vm.isLoading).toBe(false); });
    expect(wrapper.find(".btn-submit").attributes("disabled")).toBeUndefined();
  });

  it("คลิกปุ่มตา → toggle แสดง/ซ่อน password (fa-eye/fa-eye-slash)", async () => {
    const wrapper = mountLogin();
    expect(wrapper.find(".password-input").attributes("type")).toBe("password");
    await wrapper.find(".btn-view").trigger("click");
    expect(wrapper.find(".password-input").attributes("type")).toBe("text");
    await wrapper.find(".btn-view").trigger("click");
    expect(wrapper.find(".password-input").attributes("type")).toBe("password");
  });

  it("emailError มีค่า → input-control มี class 'error'", async () => {
    const wrapper = mountLogin();
    wrapper.vm.emailError = "bad email";
    await wrapper.vm.$nextTick();
    const emailControl = wrapper.findAll(".input-control")[0];
    expect(emailControl.classes()).toContain("error");
  });

  it("passwordError มีค่า → input-control มี class 'error'", async () => {
    const wrapper = mountLogin();
    wrapper.vm.passwordError = "bad pw";
    await wrapper.vm.$nextTick();
    const pwControl = wrapper.findAll(".input-control")[1];
    expect(pwControl.classes()).toContain("error");
  });

  it("onSubmit() ขณะ isLoading=true → return ก่อนทำอะไร", async () => {
    const wrapper = mountLogin();
    wrapper.vm.isLoading = true;
    await wrapper.vm.onSubmit();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// 5. DOM Interactions (template compiled functions)
// ═══════════════════════════════════════════════════════════
describe("Login > DOM Interactions", () => {
  it("คลิกปุ่มเปลี่ยนภาษา → เรียก locale.toggle()", async () => {
    const wrapper = mountLogin();
    await wrapper.find(".btn-lang-fixed").trigger("click");
    expect(mockLocale.toggle).toHaveBeenCalled();
  });

  it("กำลัง loading → input email และ password ถูก disabled", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");
    wrapper.findAll("input").forEach((input) => {
      expect(input.attributes("disabled")).toBeDefined();
    });
  });

  it("DOM: พิมพ์ใน email input → v-model setter อัปเดต email (line 33)", async () => {
    // ต้องใช้ setValue() ไม่ใช่ setData() เพื่อ trigger compiled v-model setter function
    const wrapper = mountLogin();
    const emailInput = wrapper.find('input[type="email"]');
    await emailInput.setValue("typed@example.com");
    expect(wrapper.vm.email).toBe("typed@example.com");
  });

  it("DOM: พิมพ์ใน password input → v-model setter อัปเดต password (line 46)", async () => {
    // trigger compiled v-model setter สำหรับ password input
    const wrapper = mountLogin();
    const passInput = wrapper.find(".password-input");
    await passInput.setValue("typedpassword");
    expect(wrapper.vm.password).toBe("typedpassword");
  });

  it("DOM: กด submit → เรียก onSubmit (form @submit.prevent)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { token: "t", user: { id: 1, permissions: {} } } }),
    });
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    const spy = vi.spyOn(wrapper.vm, "onSubmit");
    await wrapper.find("form").trigger("submit");
    expect(spy).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════
// 6. Bug Cases (PASS — เดิม ยืนยันว่า component จัดการถูกต้อง)
// ═══════════════════════════════════════════════════════════
describe("Login > Bug Cases (PASS)", () => {
  it("[BUG-1] password space ล้วน → trim แล้วว่าง → error ไม่เรียก API", async () => {
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "      " });
    await wrapper.find("form").trigger("submit");
    expect(wrapper.vm.passwordError).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("[BUG-2] submit 2 ครั้งรวด → isLoading guard → API ถูกเรียกแค่ 1 ครั้ง", async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    wrapper.find("form").trigger("submit");
    wrapper.find("form").trigger("submit");
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("[BUG-3] server ส่ง data: null → แสดง 'Invalid response' ไม่ใช่ crash", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: null }),
    });
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");
    await vi.waitFor(() => { expect(wrapper.find(".error-banner").exists()).toBe(true); });
    expect(wrapper.find(".error-banner").text()).not.toContain("Connection error");
  });

  it("[BUG-4] server ไม่ส่ง token → guard !data.data.token → ไม่บันทึก 'undefined'", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { user: { id: 1, permissions: {} } } }),
    });
    const wrapper = mountLogin();
    await wrapper.setData({ email: "test@mail.com", password: "123456" });
    await wrapper.find("form").trigger("submit");
    await vi.waitFor(() => {
      expect(store["token"] !== undefined || wrapper.find(".error-banner").exists()).toBe(true);
    });
    expect(store["token"]).not.toBe("undefined");
  });
});
