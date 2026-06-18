import { test, expect } from "@playwright/test";

// ─── helpers ────────────────────────────────────────────────────
const SUPER_ADMIN = {
  id: 1,
  email: "admin@test.com",
  role: "super_admin",
  permissions: { tab_permissions: {} },
};

const VIEWER_USER = {
  id: 2,
  email: "viewer@test.com",
  role: "viewer",
  permissions: { tab_permissions: { dashboard: true, interaction: true } },
  tab_permissions: { dashboard: true, interaction: true },
};

const setupAuth = async (page, user) => {
  await page.addInitScript((u) => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("user", JSON.stringify(u));
    const perms = u.permissions?.tab_permissions || u.tab_permissions || {};
    localStorage.setItem("permissions", JSON.stringify(perms));
  }, user);
};

const mockAllAPIs = async (page) => {
  await page.route("**/api/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/dashboard/cards")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            address_id: 1,
            device_name: "Heater-01",
            label: "Temperature",
            data_type: "number",
            last_value: 42.5,
            plc_address: "D100",
            room_name: "Room A",
            is_connected: true,
            updated_at: new Date().toISOString(),
          },
        ]),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
};

const switchToEN = async (page) => {
  const langBtns = page.locator("button:has(.fa-globe)");
  const count = await langBtns.count();
  for (let i = 0; i < count; i++) {
    const btn = langBtns.nth(i);
    if (await btn.isVisible()) {
      const text = await btn.textContent();
      if (text.includes("TH")) {
        await btn.click();
        break;
      }
    }
  }
};

// ─── Tests ──────────────────────────────────────────────────────

test.describe("Dashboard & Navigation — Super Admin", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page, SUPER_ADMIN);
    await mockAllAPIs(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator(".nav-tabs").waitFor({ state: "visible" });
    await switchToEN(page);
  });

  // ── Auth Guard ────────────────────────────────────────────────
  test("should show main app (not login) when authenticated", async ({ page }) => {
    await expect(page.locator(".nav-tabs")).toBeVisible();
    await expect(page.locator('input[type="email"]')).not.toBeVisible();
  });

  // ── Tab Rendering ─────────────────────────────────────────────
  test("super_admin should see all 6 tabs", async ({ page }) => {
    const tabs = page.locator(".nav-tabs .nav-link");
    await expect(tabs).toHaveCount(6);
  });

  test("default tab should be Dashboard (active)", async ({ page }) => {
    const activeTab = page.locator(".nav-tabs .nav-link.active");
    await expect(activeTab).toHaveCount(1);
    await expect(activeTab).toContainText(/Dashboard/i);
  });

  // ── Tab Navigation ────────────────────────────────────────────
  test("should navigate to Setting tab", async ({ page }) => {
    const tab = page.locator(".nav-tabs .nav-link", { hasText: /Setting/i });
    await tab.click();
    await expect(tab).toHaveClass(/active/);
  });

  test("should navigate to OEE tab", async ({ page }) => {
    const tab = page.locator(".nav-tabs .nav-link", { hasText: /OEE/i });
    await tab.click();
    await expect(tab).toHaveClass(/active/);
  });

  test("should navigate to Interaction tab", async ({ page }) => {
    const tab = page.locator(".nav-tabs .nav-link", { hasText: /Interaction/i });
    await tab.click();
    await expect(tab).toHaveClass(/active/);
  });

  test("should navigate to Alarm History tab", async ({ page }) => {
    const tab = page.locator(".nav-tabs .nav-link", { hasText: /Alarm/i });
    await tab.click();
    await expect(tab).toHaveClass(/active/);
  });

  test("should navigate to Demo tab", async ({ page }) => {
    const tab = page.locator(".nav-tabs .nav-link", { hasText: /Demo/i });
    await tab.click();
    await expect(tab).toHaveClass(/active/);
  });

  test("should switch between tabs and only show active content", async ({ page }) => {
    const settingTab = page.locator(".nav-tabs .nav-link", { hasText: /Setting/i });
    await settingTab.click();
    await expect(settingTab).toHaveClass(/active/);

    const dashTab = page.locator(".nav-tabs .nav-link", { hasText: /Dashboard/i });
    await dashTab.click();
    await expect(dashTab).toHaveClass(/active/);
    await expect(settingTab).not.toHaveClass(/active/);
  });

  // ── Profile Dropdown ──────────────────────────────────────────
  test("should show user email in profile area", async ({ page }) => {
    await expect(page.locator("text=admin@test.com")).toBeVisible();
  });

  test("should open profile dropdown on click", async ({ page }) => {
    await page.locator(".btn-profile-trigger").click();
    await expect(page.locator(".profile-dropdown-menu")).toBeVisible();
  });

  test("super_admin should see Role Setting and User Management in dropdown", async ({ page }) => {
    await page.locator(".btn-profile-trigger").click();
    const menu = page.locator(".profile-dropdown-menu");
    await expect(menu).toBeVisible();
    const menuText = await menu.textContent();
    expect(
      menuText.includes("Role Setting") || menuText.includes("จัดการบทบาท")
    ).toBeTruthy();
    expect(
      menuText.includes("User Management") || menuText.includes("จัดการผู้ใช้")
    ).toBeTruthy();
  });

  test("should close dropdown when clicking outside", async ({ page }) => {
    await page.locator(".btn-profile-trigger").click();
    await expect(page.locator(".profile-dropdown-menu")).toBeVisible();
    await page.locator(".tab-content").click({ force: true });
    await expect(page.locator(".profile-dropdown-menu")).not.toBeVisible();
  });

  // ── Logout ────────────────────────────────────────────────────
  test("should have logout button visible in dropdown", async ({ page }) => {
    await page.locator(".btn-profile-trigger").click();
    const logoutBtn = page.locator(".btn-logout-custom");
    await expect(logoutBtn).toBeVisible();
    const text = await logoutBtn.textContent();
    expect(text.includes("Logout") || text.includes("ออกจากระบบ")).toBeTruthy();
  });

  // ── Language Toggle (main app) ────────────────────────────────
  test("should toggle language in main app", async ({ page }) => {
    const langBtn = page.locator("button:has(.fa-globe)").first();
    await expect(langBtn).toContainText("EN");
    await langBtn.click();
    await expect(langBtn).toContainText("TH");
  });
});

// ─── Viewer (limited permissions) ───────────────────────────────

test.describe("Dashboard & Navigation — Viewer", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page, VIEWER_USER);
    await mockAllAPIs(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator(".nav-tabs").waitFor({ state: "visible" });
  });

  test("viewer should only see permitted tabs (2 tabs)", async ({ page }) => {
    const tabs = page.locator(".nav-tabs .nav-link");
    await expect(tabs).toHaveCount(2);
  });

  test("viewer should NOT see Setting tab", async ({ page }) => {
    const allText = await page.locator(".nav-tabs").textContent();
    const lower = allText.toLowerCase();
    expect(lower.includes("setting") || lower.includes("ตั้งค่า")).toBeFalsy();
  });

  test("viewer should NOT see Role Setting in dropdown", async ({ page }) => {
    await page.locator(".btn-profile-trigger").click();
    const menu = page.locator(".profile-dropdown-menu");
    await expect(menu).toBeVisible();
    const menuText = await menu.textContent();
    expect(
      menuText.includes("Role Setting") || menuText.includes("จัดการบทบาท")
    ).toBeFalsy();
  });
});

// ─── Logout Flow (no addInitScript so reload shows login) ───────

test.describe("Logout", () => {
  test("should clear storage and show login after logout", async ({ page }) => {
    await mockAllAPIs(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Set auth via page.evaluate (NOT addInitScript, so it won't re-run on reload)
    await page.evaluate(() => {
      localStorage.setItem("token", "fake-token");
      localStorage.setItem("user", JSON.stringify({
        id: 1, email: "admin@test.com", role: "super_admin",
        permissions: { tab_permissions: {} },
      }));
      localStorage.setItem("permissions", JSON.stringify({}));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".nav-tabs").waitFor({ state: "visible" });

    await page.locator(".btn-profile-trigger").click();
    const logoutBtn = page.locator(".btn-logout-custom");
    await expect(logoutBtn).toBeVisible();

    const reloadPromise = page.waitForEvent("load");
    await logoutBtn.click();
    await reloadPromise;

    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeNull();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

// ─── No Token → Login ───────────────────────────────────────────

test.describe("Auth Guard", () => {
  test("should show login when no token", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    });
    await page.goto("/");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator(".nav-tabs")).not.toBeVisible();
  });
});
