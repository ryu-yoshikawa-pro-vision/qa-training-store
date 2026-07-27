import { expect, test as base, type Page, type TestInfo } from "@playwright/test";
import type { TestMetadata } from "@/application/contracts";
import type { PhaseOneScenario } from "@/seeds/metadata";

type ScenarioController = (scenario: PhaseOneScenario) => Promise<TestMetadata>;

interface Fixtures {
  scenario: ScenarioController;
}

const sessionScenarios = new Set<PhaseOneScenario>([
  "regular-member",
  "gold-member",
  "platinum-member",
  "suspended-user",
  "checkout-resume",
  "checkout-replaced",
  "cart-version-invalidates-checkout",
]);

export const test = base.extend<Fixtures>({
  scenario: async ({ page, context }, use, testInfo) => {
    const consoleMessages: string[] = [];
    let selectedScenario: PhaseOneScenario | null = null;
    let metadata: TestMetadata | null = null;
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleMessages.push(message.text());
      }
    });
    const reset: ScenarioController = async (scenario) => {
      selectedScenario = scenario;
      for (const extraPage of context.pages()) {
        if (extraPage !== page) {
          await extraPage.close();
        }
      }
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__TEST_API__ !== undefined);
      metadata = await page.evaluate(
        async (scenarioName) => window.__TEST_API__!.reset({ scenario: scenarioName }),
        scenario,
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__TEST_API__ !== undefined);
      metadata = await page.evaluate(async () => window.__TEST_API__!.getMetadata());
      expect(metadata.scenario).toBe(scenario);
      const identity = await page.evaluate(() => ({
        guestId: localStorage.getItem("scenario-shop.guest-id"),
        sessionId: localStorage.getItem("scenario-shop.session-id"),
      }));
      expect(identity.guestId).toBe("guest-default-001");
      if (sessionScenarios.has(scenario)) {
        expect(identity.sessionId).not.toBeNull();
      } else {
        expect(identity.sessionId).toBeNull();
      }
      return metadata;
    };

    await use(reset);

    if (selectedScenario === null) {
      throw new Error("E2E test must explicitly reset a Phase 1 scenario");
    }
    const artifact = {
      scenario: selectedScenario,
      metadata,
      console: consoleMessages,
    };
    await testInfo.attach("scenario-metadata-console", {
      body: JSON.stringify(artifact, null, 2),
      contentType: "application/json",
    });
    expect(
      consoleMessages.filter((message) => !message.includes("Download the React DevTools")),
    ).toEqual([]);
  },
});

export { expect };

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill("testpass1");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/$/);
}

export async function expectSessionIdCleared(page: Page) {
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("scenario-shop.session-id")))
    .toBeNull();
}

export async function addDefaultAddress(page: Page) {
  await page.goto("/account/addresses");
  if (await page.getByText("E2E配送先").count()) {
    return;
  }
  await page.getByLabel("ラベル").fill("E2E配送先");
  await page.getByLabel("宛名").fill("E2E 太郎");
  await page.getByLabel("郵便番号").fill("1000001");
  await page.getByLabel("都道府県").fill("東京都");
  await page.getByLabel("市区町村").fill("千代田区");
  await page.getByLabel("番地").fill("1-1");
  await page.getByLabel("電話番号").fill("09012345678");
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("status")).toContainText("配送先を登録しました");
}

export async function completeCheckout(
  page: Page,
  paymentMethod: "TEST-SUCCESS" | "TEST-DECLINED" = "TEST-SUCCESS",
) {
  const paymentLabel =
    paymentMethod === "TEST-SUCCESS"
      ? "テスト決済（成功） 学習用の決定的な模擬結果を返します。"
      : "テスト決済（利用拒否） 学習用の決定的な模擬結果を返します。";
  await page.goto("/checkout/address");
  await expect(page.getByRole("heading", { name: "配送先を選択" })).toBeVisible();
  await page.locator('input[name="address"]').check();
  await page.getByRole("button", { name: "この配送先を使用" }).click();
  await expect(page).toHaveURL(/\/checkout\/payment$/);
  await page.getByRole("radio", { name: paymentLabel }).check();
  await page.getByRole("button", { name: /を確認する$/ }).click();
  await expect(page).toHaveURL(/\/checkout\/confirm$/);
  await page.getByRole("button", { name: /を支払う$/ }).click();
  await expect(page).toHaveURL(/\/checkout\/(processing|complete|failed)\?orderId=/);
  const orderId = new URL(page.url()).searchParams.get("orderId");
  expect(orderId).not.toBeNull();
  await expect(page).toHaveURL(
    paymentMethod === "TEST-SUCCESS" ? /\/checkout\/complete/ : /\/checkout\/failed/,
  );
  return orderId!;
}

export async function expectAdminMobileBoundary(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name !== "mobile-chromium") return false;
  await expect(
    page.getByRole("heading", { name: "管理画面はデスクトップで利用してください" }),
  ).toBeVisible();
  return true;
}
