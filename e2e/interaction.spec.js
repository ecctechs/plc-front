import { test, expect } from "@playwright/test";

// ─── helpers ────────────────────────────────────────────────────
const SUPER_ADMIN = {
  id: 1, email: "admin@test.com", role: "super_admin",
  permissions: { tab_permissions: {} },
};

const VIEWER_USER = {
  id: 2, email: "viewer@test.com", role: "viewer",
  permissions: { tab_permissions: { interaction: true, dashboard: true } },
  tab_permissions: { interaction: true, dashboard: true },
};

const setupAuth = async (page, user = SUPER_ADMIN) => {
  await page.addInitScript((u) => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("user", JSON.stringify(u));
    const perms = u.permissions?.tab_permissions || u.tab_permissions || {};
    localStorage.setItem("permissions", JSON.stringify(perms));
  }, user);
};

const MOCK_LAYOUT = {
  id: 3,
  name: "Factory Floor",
  aspect_ratio_width: 16,
  aspect_ratio_height: 9,
  machine_image: null,
  elements: [
    { id: 1, element_type: "status_lamp", name: "Lamp-1", address_id: 1, x_percent: 10, y_percent: 20, size_width: 50, bg_color: "#22c55e", inactive_color: "#ccc", is_visible: true },
    { id: 2, element_type: "number_display", name: "Temp-1", address_id: 2, x_percent: 30, y_percent: 40, size_width: 60, bg_color: "#3b82f6", text_color: "#fff", unit: "°C", precision: 1, is_visible: true },
    { id: 3, element_type: "control_button", name: "Start-1", address_id: 3, x_percent: 50, y_percent: 60, size_width: 50, active_color: "#22c55e", inactive_color: "#ef4444", is_visible: true },
  ],
};

const mockAPIs = async (page) => {
  await page.route("**/api/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/dashboard/cards")) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify([
          { address_id: 1, device_name: "Lamp", label: "Status", data_type: "onoff", last_value: 1, plc_address: "M10", room_name: "Room A", is_connected: true, device: { name: "Lamp", room_name: "Room A", room_id: 1, type: "Heater" } },
          { address_id: 2, device_name: "Heater", label: "Temp", data_type: "number", last_value: 42.5, plc_address: "D100", room_name: "Room A", is_connected: true, device: { name: "Heater", room_name: "Room A", room_id: 1, type: "Heater" } },
          { address_id: 3, device_name: "Motor", label: "Control", data_type: "onoff", last_value: 0, plc_address: "M20", room_name: "Room A", is_connected: true, device: { name: "Motor", room_name: "Room A", room_id: 1, type: "Pump" } },
        ]),
      });
    }
    if (url.match(/interaction\/layouts\/\d+/)) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_LAYOUT) });
    }
    if (url.includes("/api/interaction/layouts")) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify([{ id: 3, name: "Factory Floor" }]),
      });
    }
    if (url.includes("/api/plc/write")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
  });
};

const goToInteractionTab = async (page) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(".nav-tabs").waitFor({ state: "visible" });
  const tab = page.locator(".nav-tabs .nav-link", { hasText: /Interaction|ควบคุม/i });
  await tab.click();
  await expect(tab).toHaveClass(/active/);
  await page.waitForTimeout(1000);
};

// ─── Tests ──────────────────────────────────────────────────────

test.describe("Interaction Page — Render", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToInteractionTab(page);
  });

  test("should display Interaction page title", async ({ page }) => {
    await expect(page.locator("h3", { hasText: /Interaction|ควบคุม/i })).toBeVisible();
  });

  test("should display layout selector", async ({ page }) => {
    const select = page.locator("#layout-select");
    await expect(select).toBeVisible();
  });

  test("should show layout options from API", async ({ page }) => {
    const select = page.locator("#layout-select");
    await expect(select).toContainText("Factory Floor");
  });

  test("should display Add Element button for super_admin", async ({ page }) => {
    await expect(page.locator("button", { hasText: /Add Element|เพิ่ม/i })).toBeVisible();
  });

  test("should show machine background container", async ({ page }) => {
    await expect(page.locator(".machine-background")).toBeVisible();
  });
});

test.describe("Interaction Page — Elements", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToInteractionTab(page);
    await page.waitForTimeout(500);
  });

  test("should render status lamp element", async ({ page }) => {
    const lamp = page.locator("text=Lamp-1").first();
    await expect(lamp).toBeVisible();
  });

  test("should render number display element", async ({ page }) => {
    const numDisplay = page.locator("text=Temp-1").first();
    await expect(numDisplay).toBeVisible();
  });

  test("should render control button element", async ({ page }) => {
    const btn = page.locator("text=Start-1").first();
    await expect(btn).toBeVisible();
  });
});

test.describe("Interaction Page — Viewer Permissions", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page, VIEWER_USER);
    await mockAPIs(page);
    await goToInteractionTab(page);
  });

  test("viewer should NOT see Add Element button", async ({ page }) => {
    await expect(page.locator("button", { hasText: /Add Element/i })).not.toBeVisible();
  });
});
