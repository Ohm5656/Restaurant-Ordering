import { chromium } from "@playwright/test";

const browser = await chromium.launch();

async function login(page) {
  await page.goto("http://127.0.0.1:8443/admin/login");
  await page.getByLabel("อีเมล").fill("owner@savour.local");
  await page.getByLabel("รหัสผ่าน").fill("Demo1234!");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.waitForURL(/\/admin\/tables/);
}

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const desktopPage = await desktop.newPage();
await login(desktopPage);
await desktopPage.screenshot({
  path: ".tmp-admin-desktop.png",
  fullPage: true,
});
await desktopPage.goto("http://127.0.0.1:8443/admin/orders");
await desktopPage.screenshot({ path: ".tmp-kds-desktop.png", fullPage: true });
await desktopPage.goto("http://127.0.0.1:8443/admin/tables");
await desktopPage.locator(".game-table", { hasText: "A02" }).click();
await desktopPage.locator(".table-panel").screenshot({
  path: ".tmp-table-panel-desktop.png",
});
await desktopPage.goto("http://127.0.0.1:8443/admin/menu");
await desktopPage
  .locator(".menu-management-row", { hasText: "เนื้อย่างวากิว" })
  .getByRole("button", { name: "แก้ไข" })
  .click();
await desktopPage.locator(".menu-editor").screenshot({
  path: ".tmp-menu-editor-desktop.png",
});

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
const mobilePage = await mobile.newPage();
await mobilePage.goto("http://127.0.0.1:8443/order/demo");
await mobilePage.screenshot({
  path: ".tmp-customer-mobile.png",
  fullPage: true,
});
await login(mobilePage);
await mobilePage.screenshot({ path: ".tmp-admin-mobile.png", fullPage: true });
await mobilePage.locator(".game-table", { hasText: "A02" }).click();
await mobilePage.waitForTimeout(400);
await mobilePage.screenshot({
  path: ".tmp-table-panel-mobile.png",
});

await browser.close();
