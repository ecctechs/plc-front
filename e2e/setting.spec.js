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

const mockAPIs = async (page) => {
  await page.route("**/api/dashboard/cards", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
  );
  await page.route("**/api/device-types", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [
          { id: 1, name: "Heater", description: "Temp sensor", display_types: ["onoff", "number"] },
          { id: 2, name: "Pump", description: "", display_types: ["onoff"] },
        ]}),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });
  await page.route("**/api/rooms", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [
          { id: 1, name: "Room A" },
          { id: 2, name: "Room B" },
        ]}),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });
  await page.route("**/api/products", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [
        { id: 1, name: "Product A", cycle_time: 30, image_url: null, image_path: null },
      ]}),
    })
  );
  await page.route("**/api/products/plc-addresses", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, plc_address_output: "D100", plc_address_active: "M10", plc_address_complete: "", plc_address_reject: "" }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "Saved" }) });
  });
  await page.route("**/api/devices**", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ data: [
        { id: 1, name: "Heater-01", device_type: { id: 1, name: "Heater" }, room: { id: 1, name: "Room A" }, addresses: [{ id: 1, label: "Temp", data_type: "number", plc_address: "D100" }] },
      ]}),
    })
  );
  await page.route("**/api/employees", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [
          { id: 1, employee_id: "EMP001", first_name: "John", last_name: "Doe", position: "Operator", department: "Production", phone: "0812345678" },
        ]}),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });
  await page.route("**/api/working-times**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) })
  );
  await page.route("**/api/plc/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) })
  );
};

const goToSettingTab = async (page) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(".nav-tabs").waitFor({ state: "visible" });
  const settingTab = page.locator(".nav-tabs .nav-link", { hasText: /setting|ตั้งค่า/i });
  await settingTab.click();
  await expect(settingTab).toHaveClass(/active/);
};

// ─── Tests ──────────────────────────────────────────────────────

test.describe("Setting Page — Sections Render", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToSettingTab(page);
  });

  test("should display Setting page title", async ({ page }) => {
    await expect(page.locator("h3", { hasText: /System Settings|ตั้งค่าระบบ/i })).toBeVisible();
  });

  test("should display all setting sections", async ({ page }) => {
    await expect(page.locator("h5", { hasText: /Type Setting|ประเภท/i }).first()).toBeVisible();
    await expect(page.locator("h5", { hasText: /Room Setting|ห้อง/i }).first()).toBeVisible();
    await expect(page.locator("h5", { hasText: /Product Setting|ผลิตภัณฑ์/i }).first()).toBeVisible();
    await expect(page.locator("h5", { hasText: /Employee Setting|พนักงาน/i }).first()).toBeVisible();
  });
});

test.describe("Setting Page — Type CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToSettingTab(page);
  });

  test("should display device types in table", async ({ page }) => {
    await expect(page.locator("td", { hasText: "Heater" }).first()).toBeVisible();
    await expect(page.locator("td", { hasText: "Pump" }).first()).toBeVisible();
  });

  test("should open Add Type modal", async ({ page }) => {
    const addBtn = page.locator("button", { hasText: /Add Type|เพิ่มประเภท/i });
    await addBtn.click();
    await expect(page.locator(".modal.show")).toBeVisible();
    await expect(page.locator("text=Add Device Type").or(page.locator("text=เพิ่มประเภทอุปกรณ์"))).toBeVisible();
  });

  test("should show display type checkboxes in Type modal", async ({ page }) => {
    const addBtn = page.locator("button", { hasText: /Add Type|เพิ่มประเภท/i });
    await addBtn.click();
    await expect(page.locator(".modal .form-check-label", { hasText: "ON/OFF" })).toBeVisible();
    await expect(page.locator(".modal .form-check-label", { hasText: "Number Gauge" })).toBeVisible();
    await expect(page.locator(".modal .form-check-label", { hasText: "Level" })).toBeVisible();
  });

  test("should close modal on Cancel", async ({ page }) => {
    const addBtn = page.locator("button", { hasText: /Add Type|เพิ่มประเภท/i });
    await addBtn.click();
    await expect(page.locator(".modal.show")).toBeVisible();
    await page.locator("button", { hasText: /Cancel|ยกเลิก/i }).first().click();
    await expect(page.locator(".modal.show")).not.toBeVisible();
  });
});

test.describe("Setting Page — Room CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToSettingTab(page);
  });

  test("should display rooms in table", async ({ page }) => {
    await expect(page.locator("td", { hasText: "Room A" }).first()).toBeVisible();
    await expect(page.locator("td", { hasText: "Room B" }).first()).toBeVisible();
  });

  test("should open Add Room modal", async ({ page }) => {
    const addBtn = page.locator("button", { hasText: /Add Room|เพิ่มห้อง/i });
    await addBtn.click();
    await expect(page.locator(".modal.show")).toBeVisible();
  });
});

test.describe("Setting Page — Product Section", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToSettingTab(page);
  });

  test("should display products in table", async ({ page }) => {
    await expect(page.locator("td", { hasText: "Product A" }).first()).toBeVisible();
  });

  test("should display PLC Address Configuration", async ({ page }) => {
    await expect(page.locator("text=/PLC Address|PLC/i").first()).toBeVisible();
  });

  test("should have Save PLC Addresses button", async ({ page }) => {
    const saveBtn = page.locator("button", { hasText: /Save PLC|บันทึก.*PLC/i });
    await expect(saveBtn).toBeVisible();
  });
});

test.describe("Setting Page — Device Section", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToSettingTab(page);
  });

  test("should display devices in table", async ({ page }) => {
    await expect(page.locator("td", { hasText: "Heater-01" }).first()).toBeVisible();
  });

  test("should have search and room filter", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='Device Name']");
    await expect(searchInput).toBeVisible();
    const roomFilter = page.locator("select").filter({ hasText: /All Rooms|ทุกห้อง/i });
    await expect(roomFilter).toBeVisible();
  });
});

test.describe("Setting Page — Employee Section", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockAPIs(page);
    await goToSettingTab(page);
  });

  test("should display employees in table", async ({ page }) => {
    await expect(page.locator("td", { hasText: "EMP001" }).first()).toBeVisible();
    await expect(page.locator("td", { hasText: "John Doe" }).first()).toBeVisible();
  });

  test("should open Add Employee modal", async ({ page }) => {
    const addBtn = page.locator("button", { hasText: /Add Employee|เพิ่มพนักงาน/i });
    await addBtn.click();
    await expect(page.locator(".modal.show")).toBeVisible();
  });

  test("should show all fields in Employee modal", async ({ page }) => {
    const addBtn = page.locator("button", { hasText: /Add Employee|เพิ่มพนักงาน/i });
    await addBtn.click();
    await expect(page.locator("input[placeholder='e.g. EMP001']")).toBeVisible();
    await expect(page.locator("input[placeholder='e.g. 0812345678']")).toBeVisible();
  });
});
