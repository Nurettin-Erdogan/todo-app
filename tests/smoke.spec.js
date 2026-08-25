const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

test("a task can be added, completed, and deleted", async ({ page }) => {
  const taskName = "Playwright smoke görevi";

  await expect(page.getByRole("heading", { name: /Sıradaki adımlar/i })).toBeVisible();
  await expect(page.locator("#taskInput")).toBeVisible();

  await page.locator("#taskInput").fill(taskName);
  await page.locator("#addBtn").click();

  let task = page.locator("#taskList .task-item", { hasText: taskName });
  await expect(task).toBeVisible();

  await page.reload();
  task = page.locator("#taskList .task-item", { hasText: taskName });
  await expect(task).toBeVisible();

  await task.locator(".task-check").click();
  await expect(task).toHaveClass(/is-completed/);

  await task.locator(".delete-btn").click();
  await expect(page.locator("#taskList .task-item", { hasText: taskName })).toHaveCount(0);

  await page.reload();
  await expect(page.locator("#taskList .task-item", { hasText: taskName })).toHaveCount(0);
});

test("a task can be edited, searched, filtered, and restored", async ({ page }) => {
  await page.locator("#taskInput").fill("Portföy açıklamasını güncelle");
  await page.locator("#taskPriority").selectOption("high");
  await page.locator("#addBtn").click();

  const task = page.locator("#taskList .task-item").filter({ hasText: "Portföy açıklamasını güncelle" });
  await task.locator(".edit-btn").click();
  await page.locator("#editTaskText").fill("Portföy README dosyasını güncelle");
  await page.getByRole("button", { name: "Değişiklikleri Kaydet" }).click();

  const editedTask = page.locator("#taskList .task-item").filter({ hasText: "Portföy README dosyasını güncelle" });
  await expect(editedTask).toBeVisible();
  await page.locator("#searchInput").fill("README");
  await expect(editedTask).toBeVisible();
  await page.locator("#searchInput").fill("bulunmayan görev");
  await expect(page.locator("#taskList .task-item")).toHaveCount(0);

  await page.locator("#searchInput").fill("");
  await editedTask.locator(".task-check").click();
  await page.locator("#filterCompleted").click();
  await expect(editedTask).toBeVisible();

  await editedTask.locator(".delete-btn").click();
  await page.getByRole("button", { name: "Geri Al" }).click();
  await expect(page.locator("#taskList .task-item").filter({ hasText: "Portföy README dosyasını güncelle" })).toBeVisible();
});

test("today view separates current and future tasks", async ({ page }) => {
  const today = new Date();
  const future = new Date(today);
  future.setDate(future.getDate() + 10);
  const toDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  await page.locator("#taskInput").fill("Bugünün görevi");
  await page.locator("#taskDate").fill(toDateInput(today));
  await page.locator("#addBtn").click();
  await page.locator("#taskInput").fill("Gelecek haftanın görevi");
  await page.locator("#taskDate").fill(toDateInput(future));
  await page.locator("#addBtn").click();

  await page.locator("#viewToday").click();
  await expect(page.locator("#taskList .task-item").filter({ hasText: "Bugünün görevi" })).toBeVisible();
  await expect(page.locator("#taskList .task-item").filter({ hasText: "Gelecek haftanın görevi" })).toHaveCount(0);
});

test("PWA assets and Vercel security policy are release-ready", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(200);
  expect(manifestResponse.headers()["content-type"]).toContain("application/manifest+json");
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("Görev Listesi");
  expect(manifest.icons).toHaveLength(2);

  const serviceWorkerResponse = await request.get("/service-worker.js");
  expect(serviceWorkerResponse.status()).toBe(200);
  expect(await serviceWorkerResponse.text()).toContain("gorev-listesi-");

  const socialImageResponse = await request.get("/docs/screenshots/gorev-listesi.jpg");
  expect(socialImageResponse.status()).toBe(200);
  expect(socialImageResponse.headers()["content-type"]).toBe("image/jpeg");

  const deploymentConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"),
  );
  const globalHeaders = deploymentConfig.headers.find((entry) => entry.source === "/(.*)").headers;
  const headerMap = Object.fromEntries(globalHeaders.map((header) => [header.key, header.value]));
  expect(headerMap["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  expect(headerMap["X-Frame-Options"]).toBe("DENY");
  expect(headerMap["X-Content-Type-Options"]).toBe("nosniff");
});
