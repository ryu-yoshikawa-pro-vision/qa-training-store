import { test } from "@playwright/test";
import { resetScenario } from "../support/reset-scenario";

// このFileはP1-4で構造を読み、P1-5で自分のTest Caseを別の受講者specへ実装するための足場です。
// ここには完成答案を追加しません。まずWorkbookのCase ID、条件、期待結果、Reset方法を準備してください。
test("starter exercise: implement a risk-based catalog check", async ({ page }) => {
  // 受講者はP1-3で選んだCaseに合わせてAction、意味のあるLocator、Assertionを追加します。
  // 実行時はresetの後に画面を観察し、期待した状態と実際の状態を記録します。
  await resetScenario(page, "default");
  await page.goto("/products");
  // 受講者はWorkbookの条件、意味のあるLocator、Assertionをここへ追加します。
});
