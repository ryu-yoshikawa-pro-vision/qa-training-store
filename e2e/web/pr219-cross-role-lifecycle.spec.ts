import { writeFile } from "node:fs/promises";
import type { Page, TestInfo } from "@playwright/test";
import type { TestMetadata } from "@/application/contracts";
import { AxeBuilder } from "@axe-core/playwright";
import { addDefaultAddress, expect, login, test } from "./fixtures";

// Read-only, per-table digests; never attach record contents or authentication secrets.
async function indexedDbTableDigests(page: Page, tableNames?: readonly string[]) {
  return page.evaluate(
    async (requestedTables: string[] | null) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ec-automation-training");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const names = (requestedTables ?? Array.from(database.objectStoreNames)).sort();
        const transaction = database.transaction(names, "readonly");
        const rowsByTable = await Promise.all(
          names.map(
            (name) =>
              new Promise<unknown[]>((resolve, reject) => {
                const request = transaction.objectStore(name).getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
              }),
          ),
        );
        const entries = await Promise.all(
          names.map(async (name, index) => {
            const bytes = new TextEncoder().encode(JSON.stringify(rowsByTable[index]));
            const digest = await crypto.subtle.digest("SHA-256", bytes);
            const hash = Array.from(new Uint8Array(digest))
              .map((byte) => byte.toString(16).padStart(2, "0"))
              .join("");
            return [name, hash] as const;
          }),
        );
        return Object.fromEntries(entries);
      } finally {
        database.close();
      }
    },
    tableNames === undefined ? null : [...tableNames],
  );
}

// Explicit output files remain available to the CI artifact uploader after a passing test.
// Keep only table names and SHA-256 digests: no raw records, credentials or Session IDs.
async function attachIndexedDbDigests(
  testInfo: TestInfo,
  name: string,
  evidence: { before: Record<string, string>; after: Record<string, string>; tables?: string[] },
) {
  const outputPath = testInfo.outputPath(`${name}.json`);
  await writeFile(outputPath, JSON.stringify(evidence, null, 2) + "\n", "utf8");
  await testInfo.attach(name, { path: outputPath, contentType: "application/json" });
}

// Persist only axe rule IDs, impact levels and affected counts; DOM excerpts,
// accessible names and element HTML may contain private user data.
async function attachSafeAxeSummary(
  testInfo: TestInfo,
  name: string,
  width: number,
  violations: readonly { id: string; impact?: string | null; nodes: unknown[] }[],
) {
  const outputPath = testInfo.outputPath(`${name}.json`);
  const safe = {
    caseName: testInfo.title,
    width,
    violations: violations.map((issue) => ({
      id: issue.id,
      impact: issue.impact ?? null,
      affectedNodes: issue.nodes.length,
    })),
  };
  await writeFile(outputPath, JSON.stringify(safe, null, 2) + "\n", "utf8");
  await testInfo.attach(name, { path: outputPath, contentType: "application/json" });
}

// Keep Scenario/State/viewport in the file name so the Artifact can be
// matched to an assertion without decoding Playwright's hashed HTML names.
async function attachEvidenceScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const outputPath = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path: outputPath, fullPage: true });
  await testInfo.attach(name, { path: outputPath, contentType: "image/png" });
}

// Log only public scenario/build metadata. Never log credentials, user records or Session IDs.
function logRuntimeMetadata(evidenceCaseKey: string, metadata: TestMetadata) {
  console.log(
    "PR219_RUNTIME_METADATA " +
      JSON.stringify({
        evidenceCaseKey,
        scenario: metadata.scenario,
        clockObservedAtReset: metadata.clock,
        buildSha: metadata.buildSha,
        appVersion: metadata.appVersion,
        schemaVersion: metadata.schemaVersion,
        seedVersion: metadata.seedVersion,
      }),
  );
}

// The shared fixture keeps full console details in TestInfo attachments. These
// limited per-case counters are safe to retain in the CI job log on successful runs.
interface CaseRuntimeCounters {
  consoleErrors: number;
  pageErrors: number;
  failedRequests: number;
  http5xxResponses: number;
}

const caseRuntimeCounters = new WeakMap<Page, CaseRuntimeCounters>();

test.beforeEach(({ page }) => {
  const counters: CaseRuntimeCounters = {
    consoleErrors: 0,
    pageErrors: 0,
    failedRequests: 0,
    http5xxResponses: 0,
  };
  caseRuntimeCounters.set(page, counters);
  page.on("console", (message) => {
    if (message.type() === "error") counters.consoleErrors += 1;
  });
  page.on("pageerror", () => {
    counters.pageErrors += 1;
  });
  page.on("requestfailed", () => {
    counters.failedRequests += 1;
  });
  page.on("response", (response) => {
    if (response.status() >= 500) counters.http5xxResponses += 1;
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const metadata = await page
    .evaluate(() => window.__TEST_API__?.getMetadata() ?? null)
    .catch(() => null);
  const counters = caseRuntimeCounters.get(page);
  // Playwright may return an expected failure for a known product defect.
  // Always report the test outcome and product acceptance separately.
  console.log(
    "PR219_CASE_RUN " +
      JSON.stringify({
        caseName: testInfo.title,
        project: testInfo.project.name,
        testStatus: testInfo.status,
        expectedStatus: testInfo.expectedStatus,
        retry: testInfo.retry,
        scenario: metadata?.scenario ?? null,
        clockObservedAtEnd: metadata?.clock ?? null,
        buildSha: metadata?.buildSha ?? null,
        consoleErrors: counters?.consoleErrors ?? null,
        pageErrors: counters?.pageErrors ?? null,
        failedRequests: counters?.failedRequests ?? null,
        http5xxResponses: counters?.http5xxResponses ?? null,
        productAcceptance: "not-evaluated-by-this-summary",
      }),
  );
});

test.describe("PR #219: WEB Role and direct-route acceptance", () => {
  test("SCREEN-BOUNDARY-FORBIDDEN-A01-01: guest direct routes do not expose protected UI", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await page.goto("/checkout/address");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fcheckout%2Faddress$/);
    await expect(page.getByRole("heading", { name: "配送先を選択" })).toHaveCount(0);

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "ユーザー管理" })).toHaveCount(0);
  });

  test("SCREEN-BOUNDARY-FORBIDDEN-A01-01: customer can view own order, not admin UI", async ({
    page,
    scenario,
  }) => {
    await scenario("regular-member");
    await page.goto("/orders/order-paid");
    await expect(page.getByRole("heading", { name: "ORD-20260701-0002" })).toBeVisible();

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(
      page.getByRole("heading", { name: "このページを表示する権限がありません" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "ユーザー管理" })).toHaveCount(0);
  });

  test("SCREEN-BOUNDARY-FORBIDDEN-A01-01: operator cannot open admin-only or customer routes", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "operator@example.com", "/admin");
    await page.goto("/admin/inventories");
    await expect(page.getByRole("heading", { name: "在庫管理" })).toBeVisible();

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByRole("heading", { name: "ユーザー管理" })).toHaveCount(0);

    await page.goto("/checkout/address");
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByRole("heading", { name: "配送先を選択" })).toHaveCount(0);
  });

  test("SCREEN-BOUNDARY-FORBIDDEN-A01-01: admin can manage users but cannot checkout", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "ユーザー管理" })).toBeVisible();

    await page.goto("/checkout/address");
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(page.getByRole("heading", { name: "配送先を選択" })).toHaveCount(0);
  });

  for (const seed of ["suspended-user", "withdrawn-user"] as const) {
    test(`BR-AUTH-001: ${seed} cannot access customer checkout via direct URL`, async ({
      page,
      scenario,
    }) => {
      await scenario(seed);
      await page.goto("/checkout/address");
      await expect(page).toHaveURL(/\/(login|forbidden)(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: "配送先を選択" })).toHaveCount(0);
    });
  }

  for (const account of [
    { status: "suspended", email: "suspended@example.com", message: "利用停止中" },
    { status: "withdrawn", email: "withdrawn@example.com", message: "退会済み" },
  ] as const) {
    test(`SCREEN-AUTH-LOGIN-A02-01 ${account.status}`, async ({ page, scenario }, testInfo) => {
      await scenario("default");
      await page.goto("/login");
      const before = await indexedDbTableDigests(page);

      await page.getByLabel("メールアドレス").fill(account.email);
      await page.getByLabel("パスワード").fill("testpass1");
      await page.getByRole("button", { name: "ログイン" }).click();

      await expect(page.getByRole("alert")).toContainText(account.message);
      await expect(page).toHaveURL(/\/login$/);
      await expect
        .poll(() => page.evaluate(() => localStorage.getItem("scenario-shop.session-id")))
        .toBeNull();

      // Failed authentication cannot create a Session or modify any other table.
      // Attach only hashes for review; never write credentials or DB rows to logs.
      const after = await indexedDbTableDigests(page);
      await attachIndexedDbDigests(testInfo, `pr219-${account.status}-login-denial-db-digests`, {
        before,
        after,
      });
      expect(after).toEqual(before);

      console.log(
        "PR219_CASE_EVIDENCE " +
          JSON.stringify({
            behavior: "SCREEN-AUTH-LOGIN-A02-01",
            requirement: "BR-AUTH-001",
            condition: "login-rejected-without-session",
            accountStatus: account.status,
            tablesChecked: Object.keys(before).length,
            allTablesUnchanged: true,
            productAcceptance: "not-evaluated-by-this-case",
          }),
      );
    });
  }

  test("BR-AUTH-002: a different customer cannot see another user's order", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "gold@example.com");
    await page.goto("/orders/order-paid");
    await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ORD-20260701-0002" })).toHaveCount(0);
  });

  test("SCREEN-ADMIN-USER-DETAIL-A01-02: role update invalidates the old operator session", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "operator@example.com", "/admin");
    const previousSession = await page.evaluate(() =>
      localStorage.getItem("scenario-shop.session-id"),
    );
    expect(previousSession).not.toBeNull();

    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users/user-operator");
    await page.getByLabel("役割").selectOption("admin");
    await page.getByRole("button", { name: "役割を変更" }).click();
    const dialog = page.getByRole("alertdialog", { name: "管理役割を変更しますか" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "変更する" }).click();
    await expect(page.getByRole("status")).toContainText("役割を変更しました");

    await page.evaluate((oldSession) => {
      localStorage.setItem("scenario-shop.session-id", oldSession);
    }, previousSession!);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "ユーザー管理" })).toHaveCount(0);
  });

  test("SCREEN-ADMIN-USERS-A01-02: keyword, role and account status filters combine", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users");
    await page.getByLabel("メール・表示名").fill("regular@example.com");
    await page.getByLabel("役割").selectOption("customer");
    await page.getByLabel("状態").selectOption("active");

    await expect(page.getByRole("row").filter({ hasText: "regular@example.com" })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: "admin@example.com" })).toHaveCount(0);

    await page.getByLabel("役割").selectOption("operator");
    await expect(page.locator(".state-panel--filter-empty")).toBeVisible();
  });

  test("SCREEN-ADMIN-USER-DETAIL-A01-03: rank update persists after a new page load", async ({
    page,
    scenario,
  }) => {
    await scenario("checkout-resume");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users/user-customer-regular");
    await page.getByLabel("ランク").selectOption("gold");
    await page.getByRole("button", { name: "ランクを変更" }).click();
    await expect(page.getByRole("status")).toContainText("ランクを変更しました");

    await page.goto("/admin/users/user-customer-regular");
    await expect(page.getByLabel("ランク")).toHaveValue("gold");
  });

  test("SCREEN-ADMIN-USER-DETAIL-A02-01: self role and status edits are disabled", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users/user-admin");

    await expect(page.getByLabel("役割")).toBeDisabled();
    await expect(page.getByRole("button", { name: "役割を変更" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "利用停止" })).toBeDisabled();
    await expect(page.getByText("自分自身の役割は変更できません。")).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });

  test("SCREEN-ADMIN-USER-DETAIL-A02-02: withdrawn customer is read only", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users/user-customer-withdrawn");

    await expect(page.getByText("退会済みユーザーは読取専用です。")).toBeVisible();
    await expect(page.getByLabel("ランク")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "利用再開" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "利用停止" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "役割を変更" })).toHaveCount(0);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });

  test("SCREEN-ADMIN-USER-DETAIL-A01-04: suspension is confirmed and login is rejected", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/users/user-customer-regular");
    await page.getByRole("button", { name: "利用停止" }).click();
    const dialog = page.getByRole("alertdialog", {
      name: "このユーザーを利用停止にしますか",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "利用停止にする" }).click();
    await expect(page.getByRole("status")).toContainText("利用停止にしました");

    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("regular@example.com");
    await page.getByLabel("パスワード").fill("testpass1");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page.getByRole("alert")).toContainText("このアカウントは利用停止中です");
  });
});

test.describe("PR #219: storefront empty result boundaries", () => {
  test("SCREEN-STOREFRONT-PRODUCT-LIST-S-empty: unfiltered empty breadcrumb", async ({
    page,
    scenario,
  }) => {
    await scenario("empty-catalog");
    await page.goto("/products");
    await expect(
      page.getByRole("heading", { name: "現在、表示できる商品はありません" }),
    ).toBeVisible();
    const empty = page.locator(".state-panel--empty");
    await expect(empty).toBeVisible();
    await expect(empty.locator("a, button")).toHaveCount(0);
    await expect(page.getByText("0件の商品")).toBeVisible();

    const home = page.getByRole("link", { name: "ホーム", exact: true });
    await expect(home).toHaveAttribute("href", "/");
    await home.focus();
    await expect(home).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/$/);
  });

  test("SCREEN-STOREFRONT-PRODUCT-LIST-S-empty: filtered zero has a reset action", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await page.goto("/products?minPrice=999999");
    await expect(page.locator(".state-panel--filter-empty")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "現在、表示できる商品はありません" }),
    ).toHaveCount(0);
    await page
      .locator(".state-panel--filter-empty")
      .getByRole("button", { name: "条件をすべて解除" })
      .click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.locator(".product-card").first()).toBeVisible();
  });
});

test.describe("PR #219: admin product list and selected-filter boundary", () => {
  test("SCREEN-ADMIN-PRODUCTS-A01-02: product code, stock and status are AND-filtered", async ({
    page,
    scenario,
  }) => {
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/products");
    await page.locator('.admin-page input[type="search"]').fill("P-0006");
    await expect(page.getByRole("row").filter({ hasText: "P-0006" })).toHaveCount(1);
    await page.getByLabel("在庫").selectOption("out_of_stock");
    await expect(page.getByRole("row").filter({ hasText: "スポーツボトル" })).toHaveCount(1);
    await page.getByLabel("状態").selectOption("draft");
    await expect(page.getByRole("row").filter({ hasText: "P-0006" })).toHaveCount(0);
  });

  test("SCREEN-ADMIN-PRODUCTS-A01-02: selection is cleared if no selected row remains", async ({
    page,
    scenario,
  }) => {
    // The current product UI retains an off-screen selection and an enabled bulk action.
    // This is a known acceptance failure, not a valid product PASS.
    test.fail(true, "Selected product IDs remain when the filter removes all visible rows.");
    await scenario("default");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/products");
    await page.getByRole("checkbox", { name: "ベーシックTシャツを選択" }).check();
    await expect(page.getByText("1件選択")).toBeVisible();

    await page.locator('.admin-page input[type="search"]').fill("PR219-NO-MATCH");
    await expect(page.getByText("0件選択")).toBeVisible();
    await expect(page.getByRole("button", { name: "選択を公開" })).toBeDisabled();
  });
});

async function prepareCheckoutStaleCart(page: Page) {
  await addDefaultAddress(page);
  await page.goto("/checkout/address");
  await page.locator('input[name="address"]').check();
  await page.getByRole("button", { name: "この配送先を使用" }).click();
  await expect(page).toHaveURL(/\/checkout\/payment$/);
  await page
    .getByRole("radio", {
      name: "テスト決済（成功） 支払い完了を再現します。",
    })
    .check();
  await page.getByRole("button", { name: /を確認する$/ }).click();
  await expect(page).toHaveURL(/\/checkout\/confirm$/);
  await expect(page.getByRole("heading", { name: "注文内容を確認" })).toBeVisible();

  // Confirm-ready Checkout becomes stale after the Cart version changes.
  await page.goto("/cart");
  const quantity = page.getByLabel("数量").first();
  await quantity.selectOption("3");
  await expect(quantity).toHaveValue("3");
}

async function openCheckoutStaleCartConflict(page: Page) {
  await prepareCheckoutStaleCart(page);
  await page.goto("/checkout/confirm");
  await expect(page.getByRole("heading", { name: "購入手続きを続けられません" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "注文内容を確認" })).toHaveCount(0);
  return page.getByRole("link", { name: "戻って確認する" });
}

test.describe("PR #219: Checkout confirm-ready stale Cart boundary", () => {
  test("KNOWN DEFECT REPRO: confirmed Checkout returns to payment instead of Cart", async ({
    page,
    scenario,
  }) => {
    await scenario("regular-member");
    const recovery = await openCheckoutStaleCartConflict(page);
    await expect(recovery).toHaveAttribute("href", "/checkout/payment");
  });

  test("SCREEN-CHECKOUT-CONFIRM-S-stale-cart: rejected confirmation preserves DB transaction tables", async ({
    page,
    scenario,
  }, testInfo) => {
    const metadata = await scenario("regular-member");
    logRuntimeMetadata("PR219-WEB-025", metadata);
    await prepareCheckoutStaleCart(page);

    // The entire persisted state, not only order/payment tables, must stay
    // unchanged after rejecting stale Checkout. This includes Session and
    // settings. No database values or digest hashes are printed in CI logs.
    const before = await indexedDbTableDigests(page);

    await page.goto("/checkout/confirm");
    await expect(page.getByRole("heading", { name: "購入手続きを続けられません" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "注文内容を確認" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /を支払う$/ })).toHaveCount(0);

    const after = await indexedDbTableDigests(page);
    await attachIndexedDbDigests(testInfo, "pr219-stale-confirm-rejected-db-digests", {
      tables: Object.keys(before),
      before,
      after,
    });
    expect(after).toEqual(before);

    // Print only the equality result, never DB contents/hashes, for durable
    // GitHub job-log evidence when successful attachments are not uploaded.
    console.log(
      "PR219_CASE_EVIDENCE " +
        JSON.stringify({
          behavior: "SCREEN-CHECKOUT-CONFIRM-S-stale-cart",
          condition: "rejected-confirm-no-db-mutation",
          tableCount: Object.keys(before).length,
          allTablesUnchanged: true,
        }),
    );
  });

  test("SCREEN-CHECKOUT-CONFIRM-S-stale-cart: conflict widths, axe and keyboard recovery", async ({
    page,
    scenario,
  }, testInfo) => {
    const metadata = await scenario("regular-member");
    logRuntimeMetadata("PR219-WEB-023", metadata);
    const recovery = await openCheckoutStaleCartConflict(page);

    // Independent visual/a11y validation: do not change the defect reproduction result.
    for (const viewport of [
      { width: 320, height: 700 },
      { width: 390, height: 844 },
      { width: 767, height: 900 },
      { width: 768, height: 900 },
      { width: 1023, height: 900 },
      { width: 1024, height: 900 },
      { width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole("heading", { name: "購入手続きを続けられません" })).toBeVisible();
      await expect(recovery).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await attachEvidenceScreenshot(
        page,
        testInfo,
        `pr219-checkout-stale-conflict-${viewport.width}`,
      );
      if (viewport.width === 320 || viewport.width === 1024) {
        const axe = await new AxeBuilder({ page }).analyze();
        await attachSafeAxeSummary(
          testInfo,
          `pr219-checkout-stale-conflict-axe-${viewport.width}`,
          viewport.width,
          axe.violations,
        );
        const blocking = axe.violations.filter((issue) =>
          ["serious", "critical"].includes(issue.impact ?? ""),
        );
        expect(blocking).toEqual([]);
      }
    }

    await recovery.focus();
    await expect(recovery).toBeFocused();
    await page.keyboard.press("Enter");
    // The visual/keyboard case only requires leaving the blocked confirmation
    // screen. The destination's correctness is a separate defect test.
    await expect(page).not.toHaveURL(/\/checkout\/confirm$/);
    const observedRecoveryPath = new URL(page.url()).pathname;

    console.log(
      "PR219_CASE_EVIDENCE " +
        JSON.stringify({
          behavior: "SCREEN-CHECKOUT-CONFIRM-S-stale-cart",
          condition: "conflict-responsive-keyboard",
          widthsChecked: [320, 390, 767, 768, 1023, 1024, 1440],
          axeWidthsChecked: [320, 1024],
          observedRecoveryPath,
          productAcceptance: "not-evaluated-by-this-case",
        }),
    );
  });
});

test.describe("PR #219: many-products filter and pagination boundary", () => {
  test("KNOWN DEFECT REPRO: many-products filtered page must reset to first page", async ({
    page,
    scenario,
  }) => {
    await scenario("many-products");
    await login(page, "admin@example.com", "/admin");
    await page.goto("/admin/products");

    const pager = page.getByRole("navigation", { name: "ページ送り" });
    await expect(pager).toContainText("1 / 50ページ");
    await pager.getByRole("button", { name: "次へ" }).click();
    await expect(pager).toContainText("2 / 50ページ");

    await page.getByLabel("最低価格").fill("5400");
    await expect(page.getByLabel("最低価格")).toHaveValue("5400");
    // All 20 products with minimum price 5400 belong on page 1 after filtering.
    test.fail(true, "Changing a non-keyword filter retains page 2 of a one-page result.");
    await expect(page.getByRole("row").filter({ hasText: "LOAD-0049" })).toHaveCount(1);
  });
});

// Full-page images can show the fixed navigation over the footer even when
// the viewport's final scroll position keeps footer content reachable.
async function assertMobileCatalogPageEndReachable(
  page: Page,
  state: "empty-catalog" | "filter-empty",
  width: number,
) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const navigation = page.getByRole("navigation", { name: "モバイルナビゲーション" });
  const pageEnd = page.getByText("実際の注文・決済・配送は行われません。").last();
  const [navigationBox, pageEndBox] = await Promise.all([
    navigation.boundingBox(),
    pageEnd.boundingBox(),
  ]);
  expect(navigationBox).not.toBeNull();
  expect(pageEndBox).not.toBeNull();
  expect((pageEndBox?.y ?? 0) + (pageEndBox?.height ?? 0)).toBeLessThanOrEqual(
    navigationBox?.y ?? 0,
  );
  console.log(
    "PR219_CASE_EVIDENCE " +
      JSON.stringify({
        behavior: "SCREEN-STOREFRONT-PRODUCT-LIST-S-empty",
        condition: "mobile-footer-not-obscured-by-fixed-navigation",
        state,
        width,
        pageEndReachable: true,
      }),
  );
}

test.describe("PR #219: storefront empty responsive and accessibility evidence", () => {
  const viewports = [
    { width: 320, height: 700 },
    { width: 390, height: 844 },
    { width: 767, height: 900 },
    { width: 768, height: 900 },
    { width: 1023, height: 900 },
    { width: 1024, height: 900 },
    { width: 1440, height: 1000 },
  ];

  test("SCREEN-STOREFRONT-PRODUCT-LIST-S-empty: browser Loading stays accessible while an IndexedDB read is blocked", async ({
    page,
    context,
    scenario,
  }, testInfo) => {
    await scenario("empty-catalog");
    const before = await indexedDbTableDigests(page);
    const blocker = await context.newPage();
    try {
      await blocker.goto("/", { waitUntil: "domcontentloaded" });
      await blocker.waitForFunction(() => window.__TEST_API__ !== undefined);
      await blocker.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("ec-automation-training");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        // An open readwrite transaction blocks catalog reads in another tab.
        // Repeated get requests keep it active; there are no data writes.
        const transaction = database.transaction("products", "readwrite");
        const products = transaction.objectStore("products");
        let released = false;
        (window as Window & { __pr219ReleaseCatalogLock?: () => void }).__pr219ReleaseCatalogLock =
          () => {
            released = true;
          };
        const keepTransactionOpen = () => {
          if (released) {
            database.close();
            return;
          }
          const request = products.get("__pr219_lock_probe__");
          request.onsuccess = keepTransactionOpen;
        };
        keepTransactionOpen();
      });

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto("/products", { waitUntil: "domcontentloaded" });
        const loading = page.locator(".product-grid--loading").getByRole("status");
        await expect(loading).toHaveText("商品一覧を読み込んでいます。");
        await expect(page.locator('.catalog-results[aria-busy="true"]')).toBeVisible();
        await expect(page.locator(".state-panel--error")).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await attachEvidenceScreenshot(page, testInfo, `pr219-catalog-loading-${viewport.width}`);
        if (viewport.width === 320 || viewport.width === 1024) {
          const axe = await new AxeBuilder({ page }).analyze();
          const violations = axe.violations.filter((item) =>
            ["critical", "serious"].includes(item.impact ?? ""),
          );
          expect(violations).toEqual([]);
        }
        console.log(
          "PR219_CASE_EVIDENCE " +
            JSON.stringify({
              behavior: "SCREEN-STOREFRONT-PRODUCT-LIST-S-empty",
              condition: "catalog-loading-blocked-indexeddb-read",
              width: viewport.width,
              loadingVisible: true,
              ariaBusy: true,
            }),
        );
      }
    } finally {
      await blocker
        .evaluate(() =>
          (
            window as Window & { __pr219ReleaseCatalogLock?: () => void }
          ).__pr219ReleaseCatalogLock?.(),
        )
        .catch(() => undefined);
      await blocker.close();
    }

    await expect(
      page.getByRole("heading", { name: "現在、表示できる商品はありません" }),
    ).toBeVisible();
    const after = await indexedDbTableDigests(page);
    expect(after).toEqual(before);
    console.log(
      "PR219_CASE_EVIDENCE " +
        JSON.stringify({
          behavior: "SCREEN-STOREFRONT-PRODUCT-LIST-S-empty",
          condition: "catalog-loading-release-no-db-mutation",
          tablesChecked: Object.keys(before).length,
          allTablesUnchanged: true,
          recoveredTo: "empty-catalog",
        }),
    );
  });

  test("SCREEN-STOREFRONT-PRODUCT-LIST-S-empty: browser IndexedDB failure shows Error and Retry at responsive widths", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("empty-catalog");
    const before = await indexedDbTableDigests(page);

    // Isolate a catalog read failure inside the Playwright browser. No Seed,
    // Test API, production Repository, or shared fixture is modified.
    await page.addInitScript(() => {
      const originalGetAll = IDBObjectStore.prototype.getAll;
      const originalOpenCursor = IDBObjectStore.prototype.openCursor;
      const shouldReject = (name: string) =>
        name === "products" && sessionStorage.getItem("pr219.catalog-read-failure") === "on";
      IDBObjectStore.prototype.getAll = function (
        query?: IDBValidKey | IDBKeyRange | null,
        count?: number,
      ) {
        if (shouldReject(this.name)) {
          throw new DOMException("PR219_INJECTED_CATALOG_READ_FAILURE", "UnknownError");
        }
        return originalGetAll.call(this, query, count);
      };
      IDBObjectStore.prototype.openCursor = function (
        query?: IDBValidKey | IDBKeyRange | null,
        direction?: IDBCursorDirection,
      ) {
        if (shouldReject(this.name)) {
          throw new DOMException("PR219_INJECTED_CATALOG_READ_FAILURE", "UnknownError");
        }
        return originalOpenCursor.call(this, query, direction);
      };
    });

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => sessionStorage.setItem("pr219.catalog-read-failure", "on"));
      await page.goto("/products");
      const error = page.locator(".state-panel--error");
      await expect(error).toBeVisible();
      await expect(error.locator("h1")).toBeVisible();
      await expect(page.getByText("PR219_INJECTED_CATALOG_READ_FAILURE")).toHaveCount(0);
      await expect(page.locator(".state-panel--empty")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await attachEvidenceScreenshot(page, testInfo, `pr219-catalog-error-${viewport.width}`);
      if (viewport.width === 320 || viewport.width === 1024) {
        const axe = await new AxeBuilder({ page }).analyze();
        const violations = axe.violations.filter((item) =>
          ["critical", "serious"].includes(item.impact ?? ""),
        );
        expect(violations).toEqual([]);
      }

      // Restore the failed IndexedDB read on the same page, then retry via
      // the actual keyboard-accessible product UI.
      await page.evaluate(() => sessionStorage.removeItem("pr219.catalog-read-failure"));
      const retry = error.getByRole("button", { name: "再試行" });
      await retry.focus();
      await expect(retry).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("heading", { name: "現在、表示できる商品はありません" }),
      ).toBeVisible();
      await expect(error).toHaveCount(0);
      console.log(
        "PR219_CASE_EVIDENCE " +
          JSON.stringify({
            behavior: "SCREEN-STOREFRONT-PRODUCT-LIST-S-empty",
            condition: "catalog-read-failure-and-keyboard-retry",
            width: viewport.width,
            recoveredTo: "empty-catalog",
            errorMessageLeaked: false,
          }),
      );
    }
    const after = await indexedDbTableDigests(page);
    expect(after).toEqual(before);
    console.log(
      "PR219_CASE_EVIDENCE " +
        JSON.stringify({
          behavior: "SCREEN-STOREFRONT-PRODUCT-LIST-S-empty",
          condition: "browser-catalog-read-failure-no-db-mutation",
          tablesChecked: Object.keys(before).length,
          allTablesUnchanged: true,
        }),
    );
  });

  test("SCREEN-STOREFRONT-PRODUCT-LIST-S-empty: empty-catalog at responsive widths", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("empty-catalog");
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/products");
      await expect(
        page.getByRole("heading", { name: "現在、表示できる商品はありません" }),
      ).toBeVisible();
      const empty = page.locator(".state-panel--empty");
      await expect(empty.locator("a, button")).toHaveCount(0);
      const breadcrumb = page.getByRole("navigation", { name: "パンくず" });
      const home = breadcrumb.getByRole("link", { name: "ホーム" });
      await expect(home).toHaveAttribute("href", "/");
      await expect(breadcrumb.getByText("すべての商品", { exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await home.focus();
      await expect(home).toBeFocused();
      await attachEvidenceScreenshot(page, testInfo, `pr219-empty-${viewport.width}`);
      if (viewport.width === 320 || viewport.width === 1024) {
        const axe = await new AxeBuilder({ page }).analyze();
        const violations = axe.violations.filter((item) =>
          ["critical", "serious"].includes(item.impact ?? ""),
        );
        await attachSafeAxeSummary(
          testInfo,
          `pr219-empty-axe-${viewport.width}`,
          viewport.width,
          axe.violations,
        );
        expect(violations).toEqual([]);
      }
      if (viewport.width === 320 || viewport.width === 390) {
        await assertMobileCatalogPageEndReachable(page, "empty-catalog", viewport.width);
      }
    }

    await page
      .getByRole("navigation", { name: "パンくず" })
      .getByRole("link", { name: "ホーム" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/$/);
  });

  test("SCREEN-STOREFRONT-PRODUCT-LIST-S-empty: zero-filter reset at responsive widths", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("default");
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/products?minPrice=999999");
      const filtered = page.locator(".state-panel--filter-empty");
      await expect(filtered).toBeVisible();
      await expect(filtered.getByRole("button", { name: "条件をすべて解除" })).toBeVisible();
      await expect(page.locator(".state-panel--empty")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await attachEvidenceScreenshot(page, testInfo, `pr219-filter-empty-${viewport.width}`);
      if (viewport.width === 320 || viewport.width === 390) {
        await assertMobileCatalogPageEndReachable(page, "filter-empty", viewport.width);
      }
    }
    const reset = page
      .locator(".state-panel--filter-empty")
      .getByRole("button", { name: "条件をすべて解除" });
    await reset.focus();
    await expect(reset).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.locator(".product-card").first()).toBeVisible();
  });
});

test.describe("PR #219: Checkout resume after authentication Session replacement", () => {
  test("SCREEN-CHECKOUT-ADDRESS-S-resume-notice: new login retains the one-time notice boundary", async ({
    page,
    scenario,
  }, testInfo) => {
    await scenario("checkout-resume");
    const firstSessionId = await page.evaluate(() =>
      localStorage.getItem("scenario-shop.session-id"),
    );
    expect(firstSessionId).not.toBeNull();

    await page.goto("/checkout/address");
    await expect(page.getByText("以前の購入手続きを再開しました。")).toBeVisible();
    await page.reload();
    await expect(page.getByText("以前の購入手続きを再開しました。")).toHaveCount(0);

    await page.goto("/account/profile");
    await page.locator("#main-content").getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL(/\/$/);
    await login(page, "regular@example.com");
    const secondSessionId = await page.evaluate(() =>
      localStorage.getItem("scenario-shop.session-id"),
    );
    expect(secondSessionId).not.toBeNull();
    expect(secondSessionId).not.toBe(firstSessionId);

    await page.goto("/checkout/address");
    await expect(page.getByRole("heading", { name: "配送先を選択" })).toBeVisible();
    await expect(page.getByText("以前の購入手続きを再開しました。")).toHaveCount(0);
    await expect(
      page.getByText("カートの更新により、購入手続きを最新の内容へ置き換えました。"),
    ).toHaveCount(0);
    await attachEvidenceScreenshot(page, testInfo, "pr219-checkout-resume-new-auth-session");
  });
});

test.describe("PR #219: suspended staff forbidden-link loop", () => {
  test("KNOWN DEFECT REPRO: suspended operator with a surviving Session loops to forbidden without DB mutations", async ({
    page,
    scenario,
  }, testInfo) => {
    const metadata = await scenario("default");
    logRuntimeMetadata("PR219-WEB-024", metadata);
    await login(page, "operator@example.com", "/admin");

    // Isolated browser-only interleaving: suspension after authentication, before
    // the old Session is revoked. No existing Seed/Reset or product code is edited.
    await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ec-automation-training");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction("users", "readwrite");
          const users = transaction.objectStore("users");
          const request = users.get("user-operator");
          request.onsuccess = () => {
            if (!request.result) {
              transaction.abort();
              return;
            }
            users.put({
              ...request.result,
              accountStatus: "suspended",
              version: request.result.version + 1,
            });
          };
          transaction.oncomplete = () => resolve();
          transaction.onabort = () => reject(transaction.error);
          transaction.onerror = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }
    });

    const before = await indexedDbTableDigests(page);
    await page.reload();
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(
      page.getByRole("heading", { name: "このページを表示する権限がありません" }),
    ).toBeVisible();

    // The action should not link back to a protected staff page for this actor.
    // Record the actual product defect; this green assertion is not acceptance PASS.
    const returnLink = page.getByRole("link", { name: "管理画面へ" });
    await expect(returnLink).toHaveAttribute("href", "/admin");
    await returnLink.focus();
    await expect(returnLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/forbidden$/);
    await expect(returnLink).toBeVisible();
    const after = await indexedDbTableDigests(page);
    await attachIndexedDbDigests(testInfo, "pr219-forbidden-indexeddb-digests", {
      before,
      after,
    });
    expect(after).toEqual(before);
    console.log(
      "PR219_CASE_EVIDENCE " +
        JSON.stringify({
          behavior: "SCREEN-BOUNDARY-FORBIDDEN-A01-01",
          condition: "suspended-operator-surviving-session",
          tablesChecked: Object.keys(before).length,
          allTablesUnchanged: true,
          observedReturnPath: "/admin",
          productAcceptance: "FAIL",
        }),
    );
  });
});
