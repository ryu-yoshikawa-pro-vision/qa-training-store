import { expect, test } from "@playwright/test";

test("expected failure exercise: inspect the generated failure evidence", async ({ page }) => {
  // このTestはTrace／Screenshot／Videoを確認するための意図的なFailureです。
  // 受講者の自然なFailureやC09のdiagnostic initialとは別物として記録し、非0終了を期待結果として扱います。
  await page.goto("/");
  expect(true, "このAssertionはexpected-failure workflowのため意図的に失敗します").toBe(false);
});
