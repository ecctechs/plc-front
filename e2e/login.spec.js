import { test, expect } from "@playwright/test";

// ─── helpers ────────────────────────────────────────────────────
const mockLoginAPI = (page, { ok = true, token = "fake-token", user = null, message } = {}) =>
  page.route("**/api/auth/login", (route) => {
    if (ok) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            token,
            user: user ?? {
              id: 1,
              email: "admin@test.com",
              role: "super_admin",
              permissions: { tab_permissions: {} },
            },
          },
        }),
      });
    } else {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: message ?? "Invalid email or password" }),
      });
    }
  });

const switchToEN = async (page) => {
  const langBtn = page.locator(".btn-lang-fixed");
  const text = await langBtn.textContent();
  if (text.includes("TH")) {
    await langBtn.click();
    await expect(langBtn).toContainText("EN");
  }
};

// ─── Tests ──────────────────────────────────────────────────────

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await switchToEN(page);
  });

  // ── Render ────────────────────────────────────────────────────
  test("should display login form with title and inputs", async ({ page }) => {
    await expect(page.locator("text=PLC Dashboard")).toBeVisible();
    await expect(page.locator("text=Please sign in to continue")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator("button[type=submit]")).toBeVisible();
  });

  test("should have default email and password prefilled", async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toHaveValue("superadmin@example.com");
    await expect(page.locator('input[type="password"]')).toHaveValue("SuperAdmin123!");
  });

  test("should display footer text", async ({ page }) => {
    await expect(page.locator("text=Industrial Control System v2.0")).toBeVisible();
  });

  // ── Language Toggle ───────────────────────────────────────────
  test("should toggle language between EN and TH", async ({ page }) => {
    const langBtn = page.locator(".btn-lang-fixed");
    await expect(langBtn).toContainText("EN");

    await langBtn.click();
    await expect(langBtn).toContainText("TH");
    await expect(page.locator("text=แดชบอร์ด PLC")).toBeVisible();

    await langBtn.click();
    await expect(langBtn).toContainText("EN");
    await expect(page.locator("text=PLC Dashboard")).toBeVisible();
  });

  // ── Password Visibility ───────────────────────────────────────
  test("should toggle password visibility", async ({ page }) => {
    const pwInput = page.locator('input[type="password"]');
    await expect(pwInput).toBeVisible();

    await page.locator(".btn-view").click();
    const visibleInput = page.locator('.password-input[type="text"]');
    await expect(visibleInput).toBeVisible();

    await page.locator(".btn-view").click();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  // ── Validation ────────────────────────────────────────────────
  test("should show error when email is empty", async ({ page }) => {
    await page.locator('input[type="email"]').clear();
    await page.locator("button[type=submit]").click();
    await expect(page.locator(".helper-text").first()).toContainText("email");
  });

  test("should show error for invalid email format", async ({ page }) => {
    await page.locator('input[type="email"]').fill("not-an-email");
    await page.locator("button[type=submit]").click();
    await expect(page.locator(".helper-text").first()).toContainText("valid email");
  });

  test("should show error when password is empty", async ({ page }) => {
    await page.locator('input[type="password"]').clear();
    await page.locator("button[type=submit]").click();
    await expect(page.locator(".helper-text")).toContainText(/password/i);
  });

  test("should show error when password is too short", async ({ page }) => {
    await page.locator('input[type="password"]').fill("ab");
    await page.route("**/api/auth/login", (route) => route.abort());
    await page.locator("button[type=submit]").click();
    await expect(page.locator(".helper-text")).toContainText("6");
  });

  // ── Login Success ─────────────────────────────────────────────
  test("should login successfully and reload", async ({ page }) => {
    await mockLoginAPI(page, { ok: true });

    await page.locator('input[type="email"]').fill("admin@test.com");
    await page.locator('input[type="password"]').fill("Password123!");

    const reloadPromise = page.waitForEvent("load");
    await page.locator("button[type=submit]").click();
    await reloadPromise;

    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBe("fake-token");
  });

  // ── Login Failure ─────────────────────────────────────────────
  test("should show error banner on wrong credentials", async ({ page }) => {
    await mockLoginAPI(page, { ok: false, message: "Invalid email or password" });

    await page.locator('input[type="email"]').fill("wrong@test.com");
    await page.locator('input[type="password"]').fill("WrongPass1!");
    await page.locator("button[type=submit]").click();

    await expect(page.locator(".error-banner")).toContainText("Invalid email or password");
  });

  // ── Network Error ─────────────────────────────────────────────
  test("should show connection error on network failure", async ({ page }) => {
    await page.route("**/api/auth/login", (route) => route.abort());

    await page.locator('input[type="email"]').fill("admin@test.com");
    await page.locator('input[type="password"]').fill("Password123!");
    await page.locator("button[type=submit]").click();

    await expect(page.locator(".error-banner")).toContainText("Connection error");
  });

  // ── Loading State ─────────────────────────────────────────────
  test("should show loading spinner during submit", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "slow" }),
      });
    });

    await page.locator('input[type="email"]').fill("admin@test.com");
    await page.locator('input[type="password"]').fill("Password123!");
    await page.locator("button[type=submit]").click();

    await expect(page.locator(".loader")).toBeVisible();
    await expect(page.locator("button[type=submit]")).toBeDisabled();
  });

  // ── Stores user data in localStorage ──────────────────────────
  test("should store user and permissions in localStorage after login", async ({ page }) => {
    await mockLoginAPI(page, {
      ok: true,
      user: {
        id: 1,
        email: "admin@test.com",
        role: "super_admin",
        permissions: { tab_permissions: { dashboard: true, setting: true } },
      },
    });

    // mock post-reload API calls so the page doesn't hang
    await page.route("**/api/devices**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) })
    );
    await page.route("**/api/dashboard-cards**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) })
    );

    await page.locator('input[type="email"]').fill("admin@test.com");
    await page.locator('input[type="password"]').fill("Password123!");

    const reloadPromise = page.waitForEvent("load");
    await page.locator("button[type=submit]").click();
    await reloadPromise;

    const user = await page.evaluate(() => JSON.parse(localStorage.getItem("user")));
    expect(user.email).toBe("admin@test.com");
    expect(user.role).toBe("super_admin");

    const perms = await page.evaluate(() => JSON.parse(localStorage.getItem("permissions")));
    expect(perms.dashboard).toBe(true);
  });
});
