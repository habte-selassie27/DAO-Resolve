import { test, expect } from "@playwright/test";

// This suite reads the deployed StudioNet contract through the Vite /api proxy.
// It is opt-in because the public RPC is rate limited and the data is live.
//   npm run test:e2e:real
test.skip(process.env.E2E_REAL !== "1", "set E2E_REAL=1 to run against the deployed contract");

const READY = { timeout: 30000 };
const RATE_LIMITED = /rate-limited/i;

async function loadLive(page, path, ready) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(path);
    try {
      await ready();
      return;
    } catch (error) {
      const limited = await page.getByText(RATE_LIMITED).count();
      if (!limited) throw error;
      if (attempt === 1) throw error;
      // StudioNet allows 30 requests per minute. The UI explains the limit and offers
      // a retry; the test waits out the window instead of pretending it did not happen.
      await page.waitForTimeout(65000);
    }
  }
}

test.describe("deployed contract reads", () => {
  test("overview renders live totals without errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await loadLive(page, "/", async () => {
      await expect(page.getByRole("heading", { name: /Did the process hold/ })).toBeVisible(READY);
      await expect(page.locator("table tbody tr").first()).toBeVisible(READY);
    });
    const metrics = await page.locator(".metric").allTextContents();
    expect(metrics.length).toBeGreaterThanOrEqual(3);
    expect(metrics.some((value) => value.trim() !== "0")).toBe(true);
    await expect(page.getByText("Mock mode.")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("D1 is a code-decided reassessment", async ({ page }) => {
    await loadLive(page, "/disputes/D1", async () => {
      await expect(page.getByRole("heading", { name: "Dispute D1" })).toBeVisible(READY);
      await expect(page.getByText("RE_EVALUATED").first()).toBeVisible(READY);
      await expect(page.getByText("Compliant").first()).toBeVisible(READY);
      await expect(page.getByText("Rule check").first()).toBeVisible(READY);
      await expect(page.getByText(/challenge window closed/i).last()).toBeVisible(READY);
    });
  });

  test("D4 is a finalized consensus assessment", async ({ page }) => {
    await loadLive(page, "/disputes/D4", async () => {
      await expect(page.getByRole("heading", { name: "Dispute D4" })).toBeVisible(READY);
      await expect(page.getByText("Finalized record")).toBeVisible(READY);
      await expect(page.getByText("Inconclusive").first()).toBeVisible(READY);
      await expect(page.getByText("Validator consensus").first()).toBeVisible(READY);
    });
  });

  test("ENS-7.1 shows the recorder's sourced events", async ({ page }) => {
    await loadLive(page, "/proposals/ENS-7.1", async () => {
      await expect(page.getByRole("heading", { name: "ENS-7.1" })).toBeVisible(READY);
      await expect(page.getByRole("heading", { name: "Process rail" })).toBeVisible(READY);
      await expect(page.getByText("SUBMITTED").first()).toBeVisible(READY);
      await expect(page.getByText("VOTING_STARTED").first()).toBeVisible(READY);
      await expect(page.getByText("VOTING_ENDED").first()).toBeVisible(READY);
      await expect(page.getByText("snapshot.box").first()).toBeVisible(READY);
    });
  });
});
