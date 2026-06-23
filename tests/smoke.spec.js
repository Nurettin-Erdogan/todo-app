const { test, expect } = require("@playwright/test");

test("a task can be added, completed, and deleted", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sıradaki adımlar" })).toBeVisible();

  await page.getByLabel("Yeni görev").fill("Playwright smoke görevi");
  await page.getByRole("button", { name: "Görev Ekle" }).click();

  const task = page.locator(".task-item", { hasText: "Playwright smoke görevi" });
  await expect(task).toBeVisible();

  await task.locator(".task-check").click();
  await expect(task).toHaveClass(/is-completed/);

  await task.locator(".delete-btn").click();
  await expect(task).toHaveCount(0);
});
