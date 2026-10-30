import { test, expect } from "@playwright/test";
import fs from "node:fs";

test("quick search supports keyboard, exact elements, formulas and focus return", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tìm kiếm nhanh toàn web" }).click();
  const dialog = page.getByRole("dialog", { name: "Bạn muốn khám phá gì?" });
  await dialog.getByRole("searchbox").fill("tinh tan");
  await expect(dialog.locator(".search-result").first()).toContainText("Bảng tính tan");
  await page.keyboard.press("Escape");
  await expect(page.locator("#open-search")).toBeFocused();
  await page.keyboard.press("Control+k");
  await dialog.getByRole("searchbox").fill("H2O");
  await expect(dialog.locator(".search-result").first()).toContainText("Nước");
  await dialog.getByRole("searchbox").fill("29");
  await page.keyboard.press("ArrowDown");
  await expect(dialog.locator(".search-result").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#detail h2")).toHaveText("Đồng");
});

test("element filters, sort, URL restoration and empty recovery work together", async ({ page }) => {
  await page.goto("/?view=list&category=noble_gas&property=electronegativity&sort=mass&element=Ne");
  await expect(page.locator(".element")).toHaveCount(7);
  await expect(page.locator("#detail h2")).toHaveText("Neon");
  await page.locator("#search").fill("29");
  await expect(page.locator("#no-results")).toBeVisible();
  await page.locator("#empty-reset").click();
  await expect(page.locator(".element")).toHaveCount(118);
  await page.locator("#search").fill("Cu");
  await expect(page.locator(".element")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("#search")).toHaveValue("Cu");
  await expect(page.locator(".element")).toHaveCount(1);
  await page.locator("#search").fill("");
  await page.locator("#advanced-filters summary").click();
  await page.locator("#period").selectOption("3");
  await page.locator("#phase").selectOption("gas");
  await expect(page.locator(".element")).toHaveCount(2);
  await page.reload();
  await expect(page.locator("#advanced-filters")).toHaveAttribute("open", "");
  await expect(page.locator(".element")).toHaveCount(2);
});

test("comparison persists, removes individual elements and exports a sourced CSV", async ({ page }) => {
  await page.goto("/?element=Cu");
  await page.locator("#compare").click();
  await page.goto("/?element=He");
  await page.locator("#compare").click();
  await expect(page.locator("#comparison")).toContainText("Đồng");
  await expect(page.locator("#comparison")).toContainText("áp suất");
  await page.reload();
  const downloaded = page.waitForEvent("download");
  await page.locator("#export-compare").click();
  const download = await downloaded;
  const csv = fs.readFileSync(await download.path(), "utf8");
  expect(csv).toContain("63.546");
  expect(csv).toContain("https://ciaaw.org/abridged-atomic-weights.htm");
  await page.getByRole("button", { name: "Bỏ Đồng khỏi so sánh" }).click();
  await expect(page.locator("#comparison")).not.toContainText("Đồng");
  await page.locator("#clear-compare").click();
  await expect(page.locator("#comparison")).toBeEmpty();
});

test("tool directory searches without accents, filters and saves favorites", async ({ page }) => {
  await page.goto("/tien-ich/");
  await expect(page.locator(".tool-card")).toHaveCount(25);
  await page.locator("#tool-search").fill("tinh tan");
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.locator("[data-favorite-tool='tinh-tan']").click();
  await page.locator("#tool-search").fill("");
  await page.locator("#tool-favorites").check();
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.locator("[data-favorite-tool='tinh-tan']").click();
  await expect(page.locator("#tool-cards")).toContainText("Chưa có công cụ phù hợp");
  await page.locator("#tool-empty-reset").click();
  await expect(page.locator(".tool-card")).toHaveCount(25);
  await page.getByRole("button", { name: "Phương trình", exact: true }).click();
  await expect(page.locator(".tool-card")).toHaveCount(5);
});

test("study statistics update immediately and unanswered mode advances", async ({ page }) => {
  await page.goto("/on-tap/");
  await page.locator("#unanswered").click();
  const firstQuestion = await page.locator("#quiz h2").textContent();
  await page.locator("[data-answer]").first().click();
  await expect(page.locator("#stats")).toContainText("Đã làm 1/60");
  await page.locator("#next").click();
  await expect(page.locator("#quiz h2")).not.toHaveText(firstQuestion);
  await page.locator("#all").click();
  await page.reload();
  await expect(page.locator("#stats")).toContainText("Đã làm 1/60");
});

test("360px layouts and search dialog remain usable in both themes", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of ["/", "/tien-ich/", "/on-tap/", "/tien-ich/cau-truc-3d/"]) {
    await page.goto(route);
    for (let theme = 0; theme < 2; theme++) {
      await expect(page.locator("#open-search")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.locator("#open-search").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("dialog").getByRole("searchbox").fill("phuong trinh");
      await page.getByRole("button", { name: "Đóng tìm kiếm" }).click();
      await page.locator("#theme").click();
    }
  }
  expect(errors).toEqual([]);
});

test("mobile list reveals elements progressively and can search beyond the first batch", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/?view=list");
  await expect(page.locator(".element")).toHaveCount(24);
  await page.locator("#load-more-elements").click();
  await expect(page.locator(".element")).toHaveCount(48);
  await page.locator("#search").fill("Og");
  await expect(page.locator(".element")).toHaveCount(1);
  await page.locator(".element").click();
  await expect(page.locator("#detail h2")).toContainText("Oganesson");
});

test("storage restrictions preserve lookup and report unsaved preferences", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Storage unavailable", "SecurityError"); } }));
  await page.goto("/?element=Cu");
  await expect(page.locator("#detail h2")).toHaveText("Đồng");
  await page.locator("#favorite").click();
  await expect(page.locator("#toast")).toContainText("Không thể lưu yêu thích");
  await page.locator("#open-search").click();
  await page.getByRole("dialog").getByRole("searchbox").fill("H2O");
  await expect(page.locator(".search-result").first()).toContainText("Nước");
});
