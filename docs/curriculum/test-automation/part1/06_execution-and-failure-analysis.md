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

- `playwright.training.config.ts`
- `training/playwright/baseline/`
- `training/playwright/failure-exercises/`
- `output/training/playwright/`
- `playwright.config.ts` / `output/playwright/`（Formal比較教材）

Part 1-5と同様に、この段階では `e2e/web/fixtures.ts` の内部設計は読み解きません。Training Test HarnessがSeed Scenario Resetや必要なEvidence収集を提供する前提で、まずFailureを観測・分類・改善することに集中します。

## 実行コマンドの扱い

現行Repositoryには、Formal RegressionとTrainingを目的別に実行するScriptがあります。

例:

```bash
pnpm run test:e2e:chromium
pnpm run test:e2e:mobile
pnpm run test:a11y
pnpm run test:e2e:cross-role
```

これらは**既存Suiteの構成を理解するためのFormal比較教材**です。

Part 1で受講者自身が作成したTraining用specは、`PLAYWRIGHT_BASE_URL`をTraining Runtimeへ向け、`pnpm run training:web:baseline`または対象specをTraining Configで実行します。Formal ScriptがTraining specを自動的に実行することはありません。

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

### 探索で観測した事象のDisposition

技術的なFailure分類とは別に、探索で見つけた事象の結論を次の4つから選びます。これは新しいFinding DBや管理taxonomyではなく、断定前の学習上の整理です。

| 分類 | 判断の根拠 |
| --- | --- |
| 仕様・Expected Behavior違反 | BR / ACなどの明確な契約、再現条件、Actual Deviation、Evidenceが同じ事象を示す |
| 仕様違反とは確定しないUX上の懸念 | 利用しにくさや分かりにくさはあるが、現行のnormative contract違反までは確認できない |
| 改善提案 | 新しい挙動や能力を望む提案で、現行仕様の違反とは別に扱う |
| 未確定（Evidence / 再現条件不足） | 再現できない、対象・操作・事象をEvidenceで結び付けられない、または仕様根拠が不足している |

### Securityに関する最小限の成立条件

`<script>`の文字列を入力できたことだけでは、Security FindingやJavaScript実行のEvidenceにはなりません。次を順に分けて確認します。

1. 入力できる。
2. その値が保存される。
3. escapeされた文字列として表示される。
4. HTMLとして解釈される。
5. JavaScriptが実行される、またはexecutable sinkへ到達する。

表示された文字列がescape済みなら、HTML解釈・実行を確認したことにはなりません。実行またはsink到達のEvidenceがない場合は、仕様違反やSecurity成立を断定せず、上の「未確定」または観測事実として記録します。ここではSecurity専門の調査手順や新しいLessonを作りません。

### Evidenceと報告内容の一致

Failureメモや報告を書くときは、本文の対象画面・操作・事象がScreenshot、Video、Trace、ConsoleなどのEvidenceと一致していることを確認します。Evidenceだけを見ても「何が起きたか」が分からない場合、再現不足として断定を避け、対象・操作・期待結果・Actualを再収集します。

## Lesson 3: Trace

Playwright Traceでは、Failure前後の操作やDOM状態などを確認できます。

Scenario Shopの設定ではFailure時のTraceを保持します。

確認すること:

- どこまで操作が成功していたか。
- 対象要素は存在していたか。
- URLは期待した状態だったか。
- Assertion時の画面はどうなっていたか。
- NetworkやConsoleに異常がなかったか。

Training実行環境では `output/training/playwright/`へTrace、Screenshot、Video、HTML Reportを保存します。

## Lesson 4: Screenshot / Video

ScreenshotはFailure時点の視覚状態を確認するのに向きます。

Videoは操作の流れや一瞬の表示変化を見るのに役立ちます。

Trace、Screenshot、Videoは重複もあります。何でも永続保存すればよいのではなく、調査価値と保存コストを考えます。

## Lesson 5: Console Error

画面上の期待結果がPassしていても、Console ErrorやPage Errorが発生していれば品質上の問題が残る場合があります。

Training Test Harnessでは、必要に応じてConsole ErrorをEvidenceとして確認できる構成を教材要件とします。

この時点では「Console ErrorもFailure分析の情報になる」ことを理解できれば十分です。現在のScenario Shopがその収集をどのようにFixtureへ組み込んでいるかは、Part 1-8で `e2e/web/fixtures.ts` を読みながら確認します。

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
| Test Case ID | 対象ケース |
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
5. Console ErrorをE2EのFailure分析情報として扱う価値は何か。
6. 既存Regression ScriptとTraining用Testの実行入口を分ける理由は何か。
7. Failure分析の段階でFixture内部設計まで先に学ばない理由は何か。

## 自己確認とRecovery

1件のFailureまたは探索観測について、技術的Failure分類と、上の4つのDispositionを別々に書けることを確認します。さらに、報告本文の対象画面・操作・事象をEvidenceだけで追えるかを確認します。`<script>`を表示できたことだけで実行と結論付けていないことも確認します。

不一致があれば、まず実行の最初の異常と派生エラーを分け、次にBR / AC、Reset条件、Trace / Screenshot / Videoへ戻ります。再現またはEvidenceが不足する場合は「未確定」のままにし、Product Codeや仕様を推測して変更しません。次はPart 1-7を選ぶかskipし、Common routeではP1-8へ進みます。

## 完了条件

- 意図的なFailureを1件以上作り、Evidenceから原因を特定している。
- Failure分類を記録している。
- 固定待機または不安定Locatorを1件以上改善している。
- RetryとTimeoutの利用判断を説明できる。
- Training用Testと既存正式Suiteの実行目的を区別できる。
- Failure Evidenceを利用できることと、その収集実装をFixtureで設計することを別の学習段階として区別できる。
