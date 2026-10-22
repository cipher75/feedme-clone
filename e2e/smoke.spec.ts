import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 주소 입력란이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("URL to Markdown");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Markdown");
  await expect(page.getByLabel("웹 페이지 주소")).toBeVisible();
});
