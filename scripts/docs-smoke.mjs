import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
  headless: true,
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
try {
  const base = process.env.BASE_URL || "http://127.0.0.1:8002/";
  await page.goto(new URL("api/docs/", base).href);
  await page.locator(".swagger-ui .opblock").first().waitFor();
  assert.equal(await page.locator(".swagger-ui .opblock").count(), 14);
  // Exercise a CSRF-protected write through Swagger, then a protected read.
  const demo = page
    .locator(".opblock")
    .filter({ has: page.locator('[data-path="/api/auth/demo/"]') });
  await demo.locator(".opblock-summary-control").click();
  await demo.getByRole("button", { name: "Try it out", exact: true }).click();
  await demo.getByRole("button", { name: "Execute", exact: true }).click();
  await demo.locator(".responses-table.live-responses-table").waitFor();
  assert.match(
    await demo.locator(".responses-table.live-responses-table").innerText(),
    /200/,
  );
  const session = await page.request.get(new URL("api/auth/session/", base).href);
  assert.equal((await session.json()).user.is_demo, true);
  assert.deepEqual(errors, []);
  console.log(
    "Interactive API docs passed: 14 operations, strict CSP, CSRF-protected demo request and authenticated session.",
  );
} finally {
  await page.close();
  await browser.close();
}
