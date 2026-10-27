import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error" && !/\b(400|403|404|422)\b/.test(message.text()))
    errors.push(message.text());
});
const base = process.env.BASE_URL || "http://127.0.0.1:8002/";
const wait = (selector, text) =>
  page.locator(selector).filter({ hasText: text }).waitFor();
try {
  await page.goto(base);
  await page.getByRole("button", { name: "Explore the demo", exact: true }).click();
  await page.getByRole("heading", { name: /Your job search/ }).waitFor();
  await page
    .getByRole("button", { name: "View Linear application", exact: true })
    .waitFor();
  await mkdir("docs/screenshots", { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/screenshots/overview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add application", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Company", { exact: true }).fill("Northstar Labs");
  await editor.getByLabel("Role", { exact: true }).fill("Python Backend Engineer");
  await editor.getByLabel("Location", { exact: true }).fill("Almaty");
  await editor
    .getByLabel("Notes", { exact: false })
    .fill("A fictional role for the browser test. <script>must stay text</script>");
  await editor.getByRole("button", { name: "Add application", exact: true }).click();
  await page
    .getByRole("button", { name: "View Northstar Labs application", exact: true })
    .click();
  await page.getByLabel("Application status", { exact: true }).selectOption("INTERVIEW");
  await wait(".detail-identity .status-badge", "Interview");
  await page.getByRole("button", { name: /^Activity/ }).click();
  await wait(".history-list", "Applied to Interview");
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Role", { exact: true })
    .fill("Senior Python Backend Engineer");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("heading", { name: "Senior Python Backend Engineer", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Workspace views" })
    .getByRole("link", { name: /Applications/ })
    .click();
  await page
    .getByRole("textbox", { name: "Search applications", exact: true })
    .fill("Northstar");
  await page
    .getByRole("button", { name: "View Northstar Labs application", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll(".application-table tbody tr").length === 1,
  );
  await page.reload();
  await page.getByRole("heading", { name: "Your applications.", exact: true }).waitFor();
  await page
    .getByRole("textbox", { name: "Search applications", exact: true })
    .fill("Northstar");
  await page
    .getByRole("button", { name: "View Northstar Labs application", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete application", exact: true }).click();
  await page.getByRole("button", { name: "Keep application", exact: true }).click();
  await page.getByRole("button", { name: "Delete application", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete application", exact: true })
    .click();
  await page
    .getByRole("button", { name: "View Northstar Labs application", exact: true })
    .waitFor({ state: "hidden" });
  await page
    .getByRole("navigation", { name: "Workspace views" })
    .getByRole("link", { name: "Insights", exact: true })
    .click();
  await page.getByRole("heading", { name: "See your momentum.", exact: true }).waitFor();
  await page.screenshot({
    path: "docs/screenshots/insights-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open account settings", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export your data/ }).click();
  const download = await downloadEvent;
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(exported.applications.length, 14);
  assert.equal("password" in exported.user, false);
  assert.equal("owner" in exported.applications[0], false);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Workspace views" })
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  if (await page.getByRole("button", { name: "Dismiss notification" }).count())
    await page.getByRole("button", { name: "Dismiss notification" }).click();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      true,
      `Overflow at ${width}px`,
    );
    if (width === 390)
      await page.screenshot({
        path: "docs/screenshots/overview-mobile.png",
        fullPage: true,
      });
  }
  const other = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const otherPage = await other.newPage();
  await otherPage.goto(base);
  await otherPage.getByRole("button", { name: "Create an account", exact: true }).click();
  const email = `nextstep-test-${Date.now()}@example.invalid`;
  await otherPage.getByLabel("Full name", { exact: true }).fill("Nova Test");
  await otherPage.getByLabel("Email address", { exact: true }).fill(email);
  await otherPage.getByLabel("Password", { exact: true }).fill("PineHill!Orbit2026");
  await otherPage
    .getByRole("button", { name: "Create your workspace", exact: true })
    .click();
  await otherPage
    .getByRole("heading", { name: "Your next chapter starts here.", exact: true })
    .waitFor();
  assert.equal(
    await otherPage
      .getByRole("button", { name: "View Linear application", exact: true })
      .count(),
    0,
  );
  await otherPage
    .getByRole("button", { name: "Open account settings", exact: true })
    .click();
  await otherPage.getByRole("button", { name: /Delete account/ }).click();
  await otherPage.getByLabel("Type DELETE to confirm", { exact: true }).fill("DELETE");
  await otherPage
    .getByLabel("Current password", { exact: true })
    .fill("PineHill!Orbit2026");
  await otherPage.getByRole("button", { name: "Delete account", exact: true }).click();
  await otherPage
    .getByRole("heading", { name: "A fresh perspective.", exact: true })
    .waitFor();
  await other.close();
  assert.deepEqual(errors, [], errors.join("; "));
  console.log(
    "Browser journey passed: demo, CRUD, status history, search, reload, export, account isolation, account deletion and responsive layouts.",
  );
} finally {
  await context.close();
  await browser.close();
}
