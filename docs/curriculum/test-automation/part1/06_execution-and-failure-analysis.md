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
- `training/playwright/diagnostic-exercises/`
- `output/training/playwright/`
- `playwright.config.ts` / `output/playwright/`（Formal比較教材）

Part 1-5と同様に、この段階では `e2e/web/fixtures.ts` の内部設計は読み解きません。Training Test HarnessがSeed Scenario Resetや必要な実行記録の収集を提供する前提で、まずFailureを観測・分類・改善することに集中します。

## このLessonのInput / Output

| 項目 | 受講者が確認・実施する内容 |
| --- | --- |
| Input | P1-5で実装した複数の受講者Case、Workbookの条件・期待結果・`implementation_path`、Reset方法、Playwrightの実行結果。Receiptを作る前に、対象Case ID、実行するProject、保存する`handoff-root`を決める。C09では既存の決定的なDiagnostic fixtureも使う |
| Activity | 教材が用意した正式な入口で目的に応じたSuiteを実行し、run全体の終了結果とCaseごとの状態を分けて読む。Error、Trace、Screenshot、Video、HTML Report、Console Errorから最初の異常を探し、原因を仮説化して最小修正後に別runで再実行する |
| Observation | Expected／Actual、FailureしたTest Case ID、Retryと受講者修正後の再実行の違い、Evidenceの差、Product／Test／Data／Locator／Timing／Environmentのどこで起きたか。Receiptの引数を暗記できたかではなく、どの記録から何を観測したかを確認する |
| Output | `04_execution-improvement.csv`の実行Context別記録、Failure分析メモ、初期／修正後のExecution ReceiptとEvidence。編集場所は自由で、評価時は`handoff-root/workbook/`、`receipts/`、`evidence/`へ集約する |
| Self-check | 最初の異常と派生エラー、Expected／Actual、原因分類、Evidence、修正、再実行結果を説明する。Retryを「受講者が修正した」と読み替えず、C09のinitial Failureとrepaired Passを別Contextで示す。Error、Screenshot、Video、Trace、HTML Reportをどこから確認したかも書く |
| Completion | 意図的Failureまたは意味のあるDiagnostic／Learner Failureを1件以上分析し、対象・操作・事象がEvidenceと一致する。C09は`diagnostic-initial`の決定的Failure、原因説明、修正、`diagnostic-repaired`の別run／別Evidenceを記録する。initial Failureだけを通常の最終FAILへ集約しない |
| Recovery | 学習不足はP1-3〜P1-5へ戻る。テスト／製品のFailureはExpected／Actualと仕様を再確認する。Browser、Base URL、Harness、Artifact不足は環境として分ける。Diagnostic初期状態はGit操作なしの復元手順で受講者コピーへ戻し、修正済みEvidenceを初期Evidenceへ上書きしない。Receiptの引数で止まったら、下記の固定入口と変更してよい引数だけを確認する |
| Handoff | P1-8（共通経路）またはP1-7（Native選択）へ、改善前後のCase ID、実装Path、Failure分類、原因、Action、再実行結果、Receipt／Evidence、`04_execution-improvement.csv`のContextを渡す |

## 実行コマンドの扱い

現行Repositoryには、Formal RegressionとTrainingを目的別に実行するScriptがあります。`pnpm run test:e2e:*`などのFormal入口は既存Suiteの構成を理解するための比較教材であり、受講者のTraining specを実行する入口ではありません。

### 通常Exerciseで使う固定入口

受講者が覚える実行入口は、次のReceipt付きcommandです。コマンドはRepositoryのRoot Directoryで実行します。

```bash
pnpm run training:web:exercise:with-receipt -- --suite exercise --project training-chromium --root <handoff-root> --run-context learner-exercise
```

このコマンドで、`<handoff-root>/code/training/playwright/exercises/`へ集約した受講者specを実行し、Receiptとその実行に対応するEvidenceをまとめて保存します。`<handoff-root>/code/`はRunnerが読むローカルのコード実行root、`<handoff-root>/`はWorkbook・Code・Receipt・Evidenceを保存する固定rootです。P1-5で別の場所に作成したspecは、実行前にRepository相対Pathを保ったままこのcode配下へコピーします。

```text
<handoff-root>/
├ code/training/playwright/exercises/<learner-spec>.spec.ts
├ code/training/playwright/support/<learner-helper>.ts（追加した場合）
├ workbook/
├ receipts/
└ evidence/
```

変更してよい引数は次のとおりです。

- `--project`: Desktopなら`training-chromium`、Mobile Webなら`training-mobile-chromium`
- `--root`: Receipt／Evidenceを保存する自分の固定`handoff-root`
- `--run-context`: `learner-exercise`や`desktop-exercise`など、実行の目的を表す重複しない名前

`--suite exercise`は変更しません。通常Exerciseでは`--test-root`を追加せず、上記の`<handoff-root>/code/`をRunnerの実行rootとして使います。`corepack pnpm exec tsx`や`--force`も追加しません。コマンドは常にRepository Rootから実行します。Mobile Webへ切り替える場合だけ`--project training-mobile-chromium`へ変更します。

正常終了（exit code 0）の後は、`<handoff-root>/receipts/`のExecution Receiptを開き、対象Caseが`passed`であること、`implementation_path`が自分のspecを指すこと、CaseにEvidence参照があることを確認します。終了コードだけを見て完了にしません。失敗した場合は、ReceiptのCase／Retry状態と、同じContextのEvidenceから最初の異常を確認します。

Browser、Base URL、Training Copy、権限など、教材理解とは独立した環境が利用できず実行できない場合は、成功したようにReceiptを作りません。正式入口の実行結果または環境確認メモへ、`BLOCKED`、具体的な理由、確認できなかった対象を記録し、Workbookの該当行は`Not run`とします。環境が復旧した後に実行できた場合は、別Context・別Evidenceとして追加し、以前の`Not run`やEvidenceを上書きしません。

### C09 Diagnosticの手順

Diagnosticは正本Repositoryを書き換えず、正本Repository外の`<exercise-copy>`で行います。開始前に次の形でコピーを作ります。

```text
<exercise-copy>/
├ diagnostic-exercises/diagnostic-cart.spec.ts
└ support/reset-scenario.ts
```

`training/playwright/diagnostic-exercises/diagnostic-cart.spec.ts`と、Runnerが利用する提供済み`training/playwright/support/reset-scenario.ts`を、それぞれ`<exercise-copy>`の同じ相対位置へ配置します。Canonical Helperは受講者成果物ではないため、正式な`<handoff-root>/code/`へコピーしません。`<exercise-copy>`は自分が書き込みできる一時Directoryであり、正本の`training/playwright/`でもありません。

初回は次の入口を実行します。

```bash
pnpm run training:web:exercise:with-receipt -- --suite diagnostic --project training-chromium --test-root <exercise-copy> --root <handoff-root> --run-context diagnostic-initial
```

`--test-root`は実際にTestを読む演習コピー、`--root`はReceipt／Evidenceを保存する固定Handoff rootです。初回は決定的な期待値Failureになるため、Error Message、Screenshot、Trace、VideoまたはHTML Reportを確認し、ExpectedとActual、原因、最小修正を`04_execution-improvement.csv`へ記録します。修正するのは`<exercise-copy>/diagnostic-exercises/diagnostic-cart.spec.ts`だけです。

修正後は同じ`<exercise-copy>`を使い、次の別Contextで実行します。

```bash
pnpm run training:web:exercise:with-receipt -- --suite diagnostic --project training-chromium --test-root <exercise-copy> --root <handoff-root> --run-context diagnostic-repaired
```

`diagnostic-initial`と`diagnostic-repaired`のReceipt／Evidenceは別のDirectoryとして残ります。初回Evidenceを削除、修正後Evidenceで上書き、またはRetryを修正後の実行として記録してはいけません。既存の`pnpm run training:web:diagnostic`は互換的な直接実行入口ですが、C09の正式な記録には上記のReceipt付き入口を使います。

C09のWorkbookには、`diagnostic-initial`を`Fail`として、同じCase ID・同じ実装Pathの初期Evidence、`failure_category`、`cause`、`action`を記録します。`diagnostic-repaired`は同じCaseの`Pass`として別Receipt・別Evidenceへ記録します。修正後の実行が初回より後であること、実装の`code_digest`が変わっていることもReceiptで確認します。RetryだけでPassした結果や、別Case・別Pathの結果を修正後の記録へ置き換えません。

### Artifactを開く順番

Receipt付き実行後は、`<handoff-root>/evidence/<run-context>-<timestamp>/`を開きます。実行ごとにtimestampが変わるため、まず次のように一覧を確認します。

```bash
find <handoff-root>/evidence -type f
```

Windows PowerShellの場合は次を使えます。

```powershell
Get-ChildItem <handoff-root>/evidence -Recurse -File
```

確認対象ごとの場所と最初に見る点は次のとおりです。

| 確認対象 | 生成場所・開き方 | 最初に見ること |
| --- | --- | --- |
| Error Message | `<handoff-root>/evidence/<context>-<timestamp>/run.log`、`report.json`、`<handoff-root>/receipts/`のReceiptをテキストエディタで開く | 最初に失敗したFile／行、Error Type、Expected／Actual、case／Retryのstatus |
| Screenshot | 同じEvidence Directory内の`playwright/`配下にある画像を画像Viewerまたはファイル一覧から開く | Failure時点の画面、対象要素、表示された値やメッセージ |
| Video | 同じ`playwright/`配下の動画FileをVideo Playerで開く | 操作がどこまで進み、いつ表示や状態が変わったか |
| Trace | 同じ`playwright/`配下の`trace.zip`を次で開く: `pnpm exec playwright show-trace <trace.zip>` | 操作履歴、Failure直前のDOM／URL、Network／Consoleの異常 |
| HTML Report | 同じ`playwright/`配下の`report/`を次で開く: `pnpm exec playwright show-report <report-directory>` | Test一覧、Failure箇所、各Attemptと添付Artifact |

Error Messageで最初の異常を絞り、Screenshot／Video／Traceでその時点の事実を確かめ、HTML ReportとReceiptでCase・Attempt・Evidenceの対応を確認します。Receiptの内部Schemaや全引数を理解することは学習目標ではありません。

initialの期待Failure、`training:web:check-expected-failure`が扱う期待された非0終了、受講者Caseの自然なFailureは別の意味です。Playwrightの自動Retryは修正後の再実行ではありません。診断の初期Failureを確認するために、完成答案を正本fixtureへ書き戻さず、必要なら次のGitless Recoveryで演習用コピーを初期状態へ戻します。

```bash
corepack pnpm exec tsx scripts/training/restore-diagnostic-exercise.ts --root <exercise-copy> --target <exercise-copy>/diagnostic-exercises/diagnostic-cart.spec.ts --force
```

`--root`はcanonical repositoryの外側にある演習コピーを明示し、`--target`はそのroot配下の`.spec.ts`だけを指定します。root外、`.git`配下、symlink経由のPathは復元対象にできません。`--force`は既存Fileを意図的に上書きする確認であり、root境界の代わりにはなりません。

Receiptを生成したら、`04_execution-improvement.csv`の`run_context`にはcommandへ渡した同じContext、`result`にはReceiptのCase statusに対応する`Pass`または`Fail`、`evidence`にはそのCaseのReceiptが実際に参照している`evidence/...`を記録します。予定していたPathや、別Case・別ContextのEvidenceを先に記入しません。未実行なら`Not run`とし、Receiptだけを手作業で作って埋めないでください。

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

- **Bug**: 現在の正式な仕様のBR / ACに反することを、再現条件と実行記録で確認できた。
- **UX**: 仕様違反とは断定できないが、利用者が迷う・誤操作しやすい観測上の問題がある。
- **Suggestion**: 現行仕様を満たしているが、新しい仕様や改善として提案する。
- **未確定**: 再現条件、観測、または実行記録が不足し、上の分類を断定できない。

### 発展リファレンス: Security成立条件の最小確認

`<script>`のような文字列を入力・保存・表示できることだけでは、Security Bugとは断定しません。少なくとも、**入力 → 保存 → escapeされた表示か → HTMLとして解釈されたか → JavaScriptが実行されたか、または実行可能なsinkへ到達したか**を分けて記録します。これは誤分類を防ぐ参考情報であり、C09の共通必須成果物や修了条件には含めません。Security専門のLessonやProduct変更は行いません。

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

Training Test Harnessでは、必要に応じてConsole Errorを実行記録として確認できる構成を教材要件とします。

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

## ハンズオン1: アーティファクト確認用の失敗

Training用Playwright TestのAssertionを意図的に誤らせます。

Failure後に次を確認します。

- Error message
- Screenshot
- Trace
- Video

どの実行記録が最も原因特定に役立ったか記録します。

## ハンズオン2: 原因を診断して修正する

`training/playwright/diagnostic-exercises/`の代表ケースを上記の`diagnostic-initial` Contextで実行します。FailureのTrace / ScreenshotからExpectedとActualを分け、原因を「誤った期待値」「誤ったLocator」「誤った初期状態」などから判断します。原因に合わせて学習者コピーへ最小修正を行い、`diagnostic-repaired` Contextで別runとして再実行し、2つのEvidenceを残します。

## ハンズオン3: Locator Failure

Training用Testで不安定なLocatorを作り、よりsemanticなLocatorへ改善します。

## ハンズオン4: Timing Failure

固定待機を入れたテストとAuto-wait / Assertionを使ったテストを比較します。

## ハンズオン5: Failure分析メモ

次の形式で1件以上記録します。

| 項目 | 内容 |
| --- | --- |
| Test Case ID | 対象ケース |
| Failure | 発生内容 |
| 分類 | Product / Test / Env / Flakyなど |
| Outcome | Bug / UX / Suggestion / 未確定 |
| 実行記録 | Trace / Screenshotなど |
| 整合 | 対象・操作・観測事象が実行記録と一致しているか |
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
- Trace、Screenshot、Video、Console Errorを、何を観測できる実行記録かに応じて使い分けている。
- Retry / Timeoutを増やす前に、再現、同期、状態依存、Environmentを確認する理由を説明している。
- OutcomeをBug / UX / Suggestion / 未確定へ分け、BugにはBR / ACと再現条件、未確定には不足している記録を示している。
- Failure報告の対象・操作・事象がScreenshot / Traceなどの実行記録と一致し、不足時に断定を避けている。
- 最小修正後の再実行結果を記録し、意図的Failureの練習と実際のmeaningful diagnosisを区別している。

### Recovery

分類が揺れる場合はLesson 2〜8を使い、最初の異常と派生エラーを分けて1件の分析表を書き直します。Commandが起動しない、Browser / Base URLがない、Artifactが生成されない場合は環境上の問題として記録し、実行できた後もExpected / Actual / 実行記録を説明できない場合だけ学習上のRecoveryとして再分析します。

## 完了条件

- 意図的または実際のFailureを1件分析し、実行記録から発生源と原因仮説を分けて記録している。
- Bug / UX / Suggestion / 未確定のOutcomeを、BR / AC・観測・記録の有無に応じて分類している。
- 報告の対象・操作・事象が実行記録と一致し、記録不足時は未確定としている。
- C09の診断演習で、Locator / Timing / Assertionなどの意味のあるFailureを1件分析し、失敗時の記録、cause、action、修正後の再実行記録を`04_execution-improvement.csv`へ別の`run_context`で記録している。
- 固定待機または不安定Locatorの改善は、診断結果へ適用するPracticeとして説明できる。
- RetryとTimeoutの利用判断を説明できる。
- Training用Testと既存正式Suiteの実行目的を区別できる。
- 失敗時の記録を利用できることと、その収集実装をFixtureで設計することを別の学習段階として区別できる。
- 恒久的なアーティファクト確認用Failureと、原因確認・修正・再実行を行う診断用Failureを別の実行経路として扱っている。

Securityの入力・保存・HTML解釈・実行確認は発展の参考資料として必要な場合だけ扱い、C09の完了条件へ混ぜません。

## 次の行動

モバイルアプリ自動化の選択課程を選ぶ場合は[Part 1-7: MaestroによるNative UI自動化](./07_maestro-native-automation.md)へ、共通経路の場合は[Part 1-8: テスト管理と保守性改善](./08_test-management-and-maintainability.md)へ進みます。
