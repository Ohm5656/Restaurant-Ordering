import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("customer can browse details and add an item", async ({ page }) => {
  await page.goto("/order/demo");
  await expect(page.getByText("เลือกความอร่อยของคุณ")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page
    .locator(".food-card-main")
    .filter({ hasText: "เนื้อย่างวากิว" })
    .click();
  await expect(page.locator(".food-detail-sheet")).toBeVisible();
  await page.locator(".modifier-group").getByText("Medium rare").click();
  await page
    .getByRole("button", { name: /เพิ่มลงตะกร้า/ })
    .last()
    .click();
  await expect(page.getByRole("button", { name: /ดูตะกร้า/ })).toBeVisible();
});

test("owner can sign in and view operations", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("อีเมล").fill("owner@savour.local");
  await page.getByLabel("รหัสผ่าน").fill("Demo1234!");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/admin\/tables/);
  await expect(page.getByText("Table Operations")).toBeVisible();
  await expect(page.getByText("20").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("kitchen board renders tickets after sign in", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("อีเมล").fill("owner@savour.local");
  await page.getByLabel("รหัสผ่าน").fill("Demo1234!");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/admin\/tables/);
  await page.goto("/admin/orders");
  await expect(
    page.locator(".page-title", { hasText: "ออเดอร์และครัว" }),
  ).toBeVisible();
  await expect(
    page.locator(".kds-column", { hasText: "ออเดอร์ใหม่" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /ยกเลิกออเดอร์/ }).first(),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("owner can inspect a table and edit menu modifiers", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("อีเมล").fill("owner@savour.local");
  await page.getByLabel("รหัสผ่าน").fill("Demo1234!");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();

  await page.locator(".game-table", { hasText: "A02" }).click();
  await expect(page.locator(".table-panel")).toBeVisible();
  const panelBox = await page.locator(".table-panel").boundingBox();
  const viewport = page.viewportSize();
  if (panelBox && viewport && viewport.width <= 800) {
    expect(panelBox.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(panelBox.height).toBeGreaterThanOrEqual(viewport.height - 1);
  }
  await expect(page.locator(".panel-order-list")).toContainText("ORDER #");

  await page.goto("/admin/menu");
  await page
    .locator(".menu-management-row", { hasText: "เนื้อย่างวากิว" })
    .getByRole("button", { name: "แก้ไข" })
    .click();
  await expect(
    page.getByText("ตัวเลือกเพิ่มเติม", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "เพิ่มกลุ่ม" })).toBeVisible();
  await expect(page.locator('input[value="Medium rare"]')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
