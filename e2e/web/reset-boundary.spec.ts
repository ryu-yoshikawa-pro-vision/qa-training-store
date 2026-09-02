import { expect, test } from "./fixtures";

test.describe("Scenario reset browser boundary", () => {
  test("resets one Browser Context while preserving the primary Page", async ({
    page,
    context,
    scenario,
  }) => {
    const extraPage = await context.newPage();

    await scenario("default");

    expect(extraPage.isClosed()).toBe(true);
    expect(context.pages()).toHaveLength(1);
    expect(context.pages()[0]).toBe(page);
    await expect(page).toHaveURL(/\/$/);
    await expect
      .poll(() => page.evaluate(async () => window.__TEST_API__!.getMetadata()))
      .toMatchObject({ scenario: "default" });
  });
});
