import { test, expect } from "@playwright/test";

// ─── helpers ────────────────────────────────────────────────────
const SUPER_ADMIN = {
  id: 1, email: "admin@test.com", role: "super_admin",
  permissions: { tab_permissions: {} },
};

const setupAuth = async (page) => {
  await page.addInitScript((u) => {
    localStorage.setItem("token", "fake-token");
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("permissions", JSON.stringify({}));
  }, SUPER_ADMIN);
};

const NOW = new Date().toISOString();
const HOUR_AGO = new Date(Date.now() - 3600000).toISOString();

const MOCK_EVENTS = [
  {
    id: 1, event_type: "TRIGGER", value: 85.3, created_at: HOUR_AGO,
    address_id: 1, alarm_rule_id: 10,
    device: { id: 1, name: "Heater-01", room: { id: 1, name: "Room A" } },
    rule: { id: 10, name: "High Temp", address_id: 1, condition_type: "MT", min_value: 80, max_value: null },
  },
  {
    id: 2, event_type: "RECOVER", value: 75.0, created_at: NOW,
    address_id: 1, alarm_rule_id: 10,
    device: { id: 1, name: "Heater-01", room: { id: 1, name: "Room A" } },
    rule: { id: 10, name: "High Temp", address_id: 1, condition_type: "MT", min_value: 80, max_value: null },
  },
  {
    id: 3, event_type: "TRIGGER", value: 0, created_at: NOW,
    address_id: 2, alarm_rule_id: 20,
    device: { id: 2, name: "Pump-01", room: { id: 2, name: "Room B" } },
    rule: { id: 20, name: "Pump Off", address_id: 2, condition_type: "EXACT", min_value: 0, max_value: null },
  },
];

const mockAPIs = async (page) => {
  await page.route("**/api/dashboard/cards", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
  );
  await page.route("**/api/events/all**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_EVENTS) })
  );
  await page.route("**/api/rooms", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [{ id: 1, name: "Room A" }, { id: 2, name: "Room B" }] }),
    })
  );
  await page.route("**/api/alarm-history/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) })
  );
};

const goToAlarmTab = async (page) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(".nav-tabs").waitFor({ state: "visible" });
  const tab = page.locator(".nav-tabs .nav-link", { hasText: /Alarm|ประวัติ/i });
  await tab.click();
  await expect(tab).toHaveClass(/active/);
};

// ─── Tests ──────────────────────────────────────────────────────

test.describe("Alarm History — Render", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToAlarmTab(page);
  });

  test("should display Alarm History page title", async ({ page }) => {
    await expect(page.locator("h3", { hasText: /Alarm History|ประวัติ/i })).toBeVisible();
  });

  test("should display filter controls", async ({ page }) => {
    await expect(page.locator("input[type='text']").first()).toBeVisible();
    await expect(page.locator("select").first()).toBeVisible();
    await expect(page.locator("input[type='date']").first()).toBeVisible();
  });

  test("should have Search button", async ({ page }) => {
    await expect(page.locator("button", { hasText: /Search|ค้นหา/i })).toBeVisible();
  });

  test("should have Export button for super_admin", async ({ page }) => {
    await expect(page.locator("button", { hasText: /Export|ส่งออก/i })).toBeVisible();
  });
});

test.describe("Alarm History — Table Data", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToAlarmTab(page);
  });

  test("should display alarm events in table", async ({ page }) => {
    await expect(page.locator("td", { hasText: "Heater-01" }).first()).toBeVisible();
    await expect(page.locator("td", { hasText: "Pump-01" }).first()).toBeVisible();
  });

  test("should display TRIGGER and RECOVERY badges", async ({ page }) => {
    await expect(page.locator("span.badge", { hasText: "TRIGGER" }).first()).toBeVisible();
    await expect(page.locator("span.badge", { hasText: "RECOVERY" }).first()).toBeVisible();
  });

  test("should display alarm names", async ({ page }) => {
    await expect(page.locator("td", { hasText: "High Temp" }).first()).toBeVisible();
    await expect(page.locator("td", { hasText: "Pump Off" }).first()).toBeVisible();
  });

  test("should display threshold values", async ({ page }) => {
    const thresholdCells = page.locator("td.text-center.fw-bold.text-primary");
    await expect(thresholdCells.first()).toBeVisible();
  });

  test("should display room names in table", async ({ page }) => {
    await expect(page.locator("span.badge", { hasText: "Room A" }).first()).toBeVisible();
    await expect(page.locator("span.badge", { hasText: "Room B" }).first()).toBeVisible();
  });
});

test.describe("Alarm History — Summary Cards", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToAlarmTab(page);
  });

  test("should display summary stat cards", async ({ page }) => {
    await expect(page.locator(".stat-danger").first()).toBeVisible();
    await expect(page.locator(".stat-warning").first()).toBeVisible();
    await expect(page.locator(".stat-info").first()).toBeVisible();
    await expect(page.locator(".stat-primary").first()).toBeVisible();
  });

  test("should show total alarms count as 2", async ({ page }) => {
    const alarmCard = page.locator(".stat-warning .fs-2");
    await expect(alarmCard).toContainText("2");
  });

  test("should show affected devices count", async ({ page }) => {
    const deviceCard = page.locator(".stat-primary .fs-2");
    await expect(deviceCard).toContainText("2");
  });
});

test.describe("Alarm History — Filters", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToAlarmTab(page);
  });

  test("should filter by device name", async ({ page }) => {
    const searchInput = page.locator("input[type='text']").first();
    await searchInput.fill("Pump");
    await expect(page.locator("td", { hasText: "Pump-01" }).first()).toBeVisible();
  });

  test("should filter by room", async ({ page }) => {
    const roomSelect = page.locator("select").first();
    await roomSelect.selectOption("Room B");
    await expect(page.locator("td", { hasText: "Pump-01" }).first()).toBeVisible();
  });

  test("should have date range filters", async ({ page }) => {
    const dateInputs = page.locator("input[type='date']");
    await expect(dateInputs).toHaveCount(2);
  });
});

test.describe("Alarm History — Search Button", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToAlarmTab(page);
  });

  test("should call API when Search is clicked", async ({ page }) => {
    let apiCalled = false;
    await page.route("**/api/events/all**", (route) => {
      apiCalled = true;
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    await page.locator("button", { hasText: /Search|ค้นหา/i }).click();
    expect(apiCalled).toBe(true);
  });
});
