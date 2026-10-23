import { test, expect } from "@playwright/test";

const pages = [
  ["/", /Did the process hold\?/],
  ["/rules", /Rules/],
  ["/proposals", /Proposals/],
  ["/disputes", /Disputes/],
  ["/how-it-works", /How a verdict is made/],
  ["/admin", /Admin/],
];

for (const [path, heading] of pages) {
  test(`renders ${path}`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("rule detail shows clause and checks", async ({ page }) => {
  await page.goto("/rules/R1");
  await expect(page.getByRole("heading", { name: "Minimum review period" })).toBeVisible();
  await expect(page.getByText("MIN_ELAPSED").first()).toBeVisible();
  await expect(page.getByText("A dispute pins the version")).toBeVisible();
});

test("proposal process rail marks unsourced events", async ({ page }) => {
  await page.goto("/proposals/P2");
  await expect(page.getByRole("heading", { name: "Process rail" })).toBeVisible();
  await expect(page.getByText("DISCUSSION_OPENED").first()).toBeVisible();
  await expect(page.getByText("unsourced").first()).toBeVisible();
});

test("dispute detail distinguishes code and consensus decisions", async ({ page }) => {
  await page.goto("/disputes/D1");
  await expect(page.getByRole("heading", { name: "Dispute D1" })).toBeVisible();
  await expect(page.getByText("Rule check").first()).toBeVisible();
  await expect(page.getByText("Assessment history")).toBeVisible();
  await expect(page.locator(".notice.violation")).toHaveCount(0);
  await expect(page.getByText("All configured rule checks passed in code")).toBeVisible();

  await page.goto("/disputes/D4");
  await expect(page.getByText("Validator consensus").first()).toBeVisible();
  await expect(page.getByText("Finalized record")).toBeVisible();
  await expect(page.getByText("Inconclusive").first()).toBeVisible();
});

test("transaction lifecycle reaches finalized in mock mode", async ({ page }) => {
  await page.goto("/disputes/D5");
  await page.getByRole("button", { name: "Request assessment" }).first().click();
  await expect(page.getByText("Evaluate D5")).toBeVisible();
  const tray = page.locator(".tx-tray");
  await expect(tray.getByText("Finalized", { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await expect(tray).not.toContainText("PENDING");
  await expect(tray).not.toContainText("COMMITTING");
});
