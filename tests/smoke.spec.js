const { test, expect } = require("@playwright/test");

test("a task can be added, completed, and deleted", async ({ page }) => {
  const taskName = "Playwright smoke görevi";

  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  await expect(page.getByRole("heading", { name: /Sıradaki adımlar/i })).toBeVisible();
  await expect(page.locator("#taskInput")).toBeVisible();

  await page.locator("#taskInput").fill(taskName);
  await page.locator("#addBtn").click();

  await expect
    .poll(async () => {
      return page.evaluate((text) => {
        const tasks = JSON.parse(localStorage.getItem("gorev-listesi.tasks.v1") || "[]");
        return tasks.some((task) => task.text === text);
      }, taskName);
    })
    .toBe(true);

  const task = page.locator("#taskList .task-item", { hasText: taskName });
  await expect(task).toBeVisible();

  await task.locator(".task-check").click();
  await expect(task).toHaveClass(/is-completed/);

  await task.locator(".delete-btn").click();
  await expect(page.locator("#taskList .task-item", { hasText: taskName })).toHaveCount(0);
});
