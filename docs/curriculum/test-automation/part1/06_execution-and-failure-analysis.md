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

Failureの**発生源**と、報告上の**Outcome**は別に記録します。Outcomeは次のいずれかです。

- **Bug**: Current Normative SpecificationのBR / ACに反することを、再現条件とEvidenceで確認できた。
- **UX**: 仕様違反とは断定できないが、利用者が迷う・誤操作しやすい観測上の問題がある。
- **Suggestion**: 現行仕様を満たしているが、新しい仕様や改善として提案する。
- **未確定**: 再現条件、観測、またはEvidenceが不足し、上の分類を断定できない。

### Security成立条件の最小確認

`<script>`のような文字列を入力・保存・表示できることだけでは、Security Bugとは断定しません。少なくとも、**入力 → 保存 → escapeされた表示か → HTMLとして解釈されたか → JavaScriptが実行されたか、または実行可能なsinkへ到達したか**を分けて記録します。ここでは誤分類を防ぐ最小確認だけを扱い、Security専門のLessonやProduct変更は行いません。

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
| Outcome | Bug / UX / Suggestion / 未確定 |
| Evidence | Trace / Screenshotなど |
| 整合 | 対象・操作・観測事象がEvidenceと一致しているか |
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

## 自己確認

### 回答の最低判定基準

- Product / Test / Test Data / Locator / Timing / Environment / External / Flakyの発生源を区別し、発生源だけでProduct Bugと断定していない。
- Trace、Screenshot、Video、Console Errorを、何を観測できるEvidenceかで使い分けている。
- Retry / Timeoutを増やす前に、再現、同期、状態依存、Environmentを確認する理由を説明している。
- OutcomeをBug / UX / Suggestion / 未確定へ分け、BugにはBR / ACと再現条件、未確定には不足Evidenceを示している。
- Securityの回答で入力・保存・escape表示・HTML解釈・実行 / executable sinkを別段階として扱っている。
- Failure報告の対象・操作・事象がScreenshot / TraceなどのEvidenceと一致し、不足時に断定を避けている。
- 最小修正後の再実行結果を記録し、意図的Failureの練習と実際のmeaningful diagnosisを区別している。

### Recovery

分類が揺れる場合はLesson 2〜8を使い、最初の異常と派生エラーを分けて1件の分析表を書き直します。Commandが起動しない、Browser / Base URLがない、Artifactが生成されない場合はEnvironment blockとして記録し、実行できた後もExpected / Actual / Evidenceを説明できない場合だけ学習上のRecoveryとして再分析します。

## 完了条件

- 意図的または実際のFailureを1件分析し、Evidenceから発生源と原因仮説を分けて記録している。
- Bug / UX / Suggestion / 未確定のOutcomeを、BR / AC・観測・Evidenceの有無に応じて分類している。
- 報告の対象・操作・事象がEvidenceと一致し、Evidence不足時は未確定としている。
- 固定待機または不安定Locatorを1件以上改善している。
- RetryとTimeoutの利用判断を説明できる。
- Training用Testと既存正式Suiteの実行目的を区別できる。
- Failure Evidenceを利用できることと、その収集実装をFixtureで設計することを別の学習段階として区別できる。

## 次の行動

Native specializationを選択する場合は[Part 1-7: MaestroによるNative UI自動化](./07_maestro-native-automation.md)へ、Common routeの場合は[Part 1-8: テスト管理と保守性改善](./08_test-management-and-maintainability.md)へ進みます。
