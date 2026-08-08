# Part 1-6: テスト実行・結果分析・改善

## 学習目標

- Playwright Testを目的に応じて実行できる。
- Test ResultをPass / Failだけで終わらせず、失敗原因を分類できる。
- Trace、Screenshot、Video、HTML Report、Console Errorを使ってFailureを調査できる。
- Product Bug、Test Bug、Environment Issue、Flakyなどを区別できる。
- RetryやTimeout延長を安易な解決策にせず、原因に応じた改善ができる。

## 教材

**このモジュールでは、このリポジトリのScenario ShopとPlaywright設定・既存E2Eを使用します。**

主な参照先:

- `playwright.config.ts`
- `output/playwright/`
- `e2e/web/`
- `e2e/web/fixtures.ts`

## 実行コマンドの扱い

現行Repositoryには、正式Regressionを目的別に実行するScriptがあります。

例:

```bash
pnpm run test:e2e:chromium
pnpm run test:e2e:mobile
pnpm run test:a11y
pnpm run test:e2e:cross-role
```

これらは**既存Suiteの構成を理解するための教材**です。

Part 1で受講者自身が作成したTraining用specは、教材提供時に用意されるTraining専用の実行入口で実行します。現行Scriptが受講者の新規specを自動的に実行するものとは扱いません。

## Lesson 1: テストを目的別に実行する

すべてを毎回実行するのではなく、変更内容と調査目的に応じて実行対象を選びます。

例えば次を区別します。

- 自分が作成したTraining Testだけを再実行する。
- DesktopとMobileを比較する。
- Accessibility Suiteを確認する。
- 既存Cross-role Regressionを読む・実行して挙動を比較する。

「どのコマンドを暗記するか」ではなく、「今の調査目的に必要なTest Scopeは何か」を考えます。

## Lesson 2: Failureを分類する

テストが赤くなったとき、すぐに「アプリのバグ」と判断しません。

最低限次に分類します。

- Product Bug
- Test Code Bug
- Test Data / Initial State問題
- Locator問題
- Timing / Synchronization問題
- Environment問題
- External Dependency問題
- Flaky

Failure分類ができると、修正すべき対象を誤りにくくなります。

## Lesson 3: Trace

Playwright Traceでは、Failure前後の操作やDOM状態などを確認できます。

Scenario Shopの設定ではFailure時のTraceを保持します。

確認すること:

- どこまで操作が成功していたか。
- 対象要素は存在していたか。
- URLは期待した状態だったか。
- Assertion時の画面はどうなっていたか。
- NetworkやConsoleに異常がなかったか。

Training実行環境でも同等のEvidenceを取得できることを教材要件とします。

## Lesson 4: Screenshot / Video

ScreenshotはFailure時点の視覚状態を確認するのに向きます。

Videoは操作の流れや一瞬の表示変化を見るのに役立ちます。

Trace、Screenshot、Videoは重複もあります。何でも永続保存すればよいのではなく、調査価値と保存コストを考えます。

## Lesson 5: Console Error

既存 `e2e/web/fixtures.ts` ではConsole Errorと`pageerror`を収集しています。

画面上の期待結果がPassしていても、Console Errorが発生していれば品質上の問題が残る場合があります。

なぜ既存Fixtureがテスト終了時にConsole Errorを検証しているかを考えます。

## Lesson 6: Flaky Test

Flaky Testは、同じコード・同じ前提でも成功と失敗が不安定に変わるテストです。

よくある原因:

- 固定時間待機
- 不安定なLocator
- 非同期状態を待てていない
- Test間の状態依存
- 外部環境依存
- Animation / Transition
- Parallel実行時の競合

RetryはFailureを見えにくくする可能性があります。

`retries`を増やす前に、なぜ失敗したかを調べます。

## Lesson 7: Timeout

Timeoutを延ばすと一時的にPassする場合がありますが、根本原因が遅延なのか同期不足なのかを区別します。

次を比較します。

```ts
await page.waitForTimeout(5000);
```

と

```ts
await expect(page.getByRole("status")).toContainText("完了");
```

意味のある状態を待つ設計を基本とします。

## Lesson 8: 改善サイクル

Failureを次の流れで改善します。

```text
再現
↓
Evidence確認
↓
Failure分類
↓
仮説
↓
最小修正
↓
再実行
↓
回帰確認
```

盲目的に同じコマンドを繰り返すことは分析ではありません。

## ハンズオン1: 意図的に失敗させる

Training用Playwright TestのAssertionを意図的に誤らせます。

Failure後に次を確認します。

- Error message
- Screenshot
- Trace
- Video

どのEvidenceが最も原因特定に役立ったか記録します。

## ハンズオン2: Locator Failure

Training用Testで不安定なLocatorを作り、よりsemanticなLocatorへ改善します。

## ハンズオン3: Timing Failure

固定待機を入れたテストとAuto-wait / Assertionを使ったテストを比較します。

## ハンズオン4: Failure分析メモ

次の形式で1件以上記録します。

| 項目 | 内容 |
| --- | --- |
| Test ID | 対象ケース |
| Failure | 発生内容 |
| 分類 | Product / Test / Env / Flakyなど |
| Evidence | Trace / Screenshotなど |
| 原因 | 調査結果 |
| 修正 | 実施内容 |
| 再発防止 | 必要なら記載 |

## 確認問題

1. Test FailureをすぐProduct Bugと判断してはいけない理由は何か。
2. TraceとScreenshotの使い分けは何か。
3. Retryを増やす前に確認すべきことは何か。
4. Timeout延長でPassした場合でも問題が解決したとは限らないのはなぜか。
5. Console ErrorをE2Eで検出する価値は何か。
6. 既存Regression ScriptとTraining用Testの実行入口を分ける理由は何か。

## 完了条件

- 意図的なFailureを1件以上作り、Evidenceから原因を特定している。
- Failure分類を記録している。
- 固定待機または不安定Locatorを1件以上改善している。
- RetryとTimeoutの利用判断を説明できる。
- Training用Testと既存正式Suiteの実行目的を区別できる。
