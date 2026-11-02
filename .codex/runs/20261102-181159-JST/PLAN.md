# Plan（計画）

## Objective（目的）

- PR #199で再発しているStyle QualityとCheckout必須E2Eの原因を調査し、PRの許可範囲内で安全に解消する。

## Scope（対象範囲）

- In: 最新CIが報告した12ファイル（学習用スクリプト1、契約テスト10、`M07.json`）の意味不変なPrettier修正、Checkout失敗のTrace/Screenshot/Reset/Seed/正式BR・AC/画面からUse Caseまでの根拠付き診断、必要なローカルゲート、最新head CI確認。
- Out: PR #199の製品コード、正式製品仕様、既存製品E2E、Seed/Reset、Assertionの緩和、分析状態の推測変更、merge/release/force push。製品側修正が必要と判定した場合は原因・影響・再現・候補をPR #210の既存資料へ記録する。

## Assumptions（仮定）

- PR #199はOPEN、baseは`main`、作業branchは`docs/plan-ai-agent-qa-curriculum-redesign`。
- 作業開始時の指定基準`9ca8c66`以後もbranchは進行している。編集対象はfetch済みの現行headから再取得する。現在の確認headは`8c36c75fb88d738dd3277e77d3e156a86889fa32`。
- CI失敗の説明やPR本文の記載だけでは原因を確定せず、実行ログ・artifact・正式仕様を根拠にする。

## Questions / Ambiguity（質問・曖昧性）

- 必ず質問する不透明点: なし。製品の仕様判断が必要なら診断と記録で止める。
- 仮定してよい細部: CIログで特定済みの書式違反は、既存の意味と値を維持したPrettier適用として扱う。
- 未回答の重要質問: Checkout失敗がテスト期待値、製品経路、Seed/Reset、または環境のどれに由来するか。

## Hypotheses（仮説）

- H1: 最新CIの12件は書式だけの差で、Prettier適用後もテスト/採点値が不変。
- H2: Checkout assertionの期待文言または導線が現行の正式契約/表示と合っていない。
- H3: 価格・在庫・Rank変更後にcheckout session/cart versionの失効経路が動かず、製品SUT側に不整合がある。
- H4: Traceのpage/network/console証拠からは再現できず、CI実行環境またはSeed/Resetの差が原因である。

## Research Plan（調査計画）

- Round 1: PR/current head/body/Target/task plan/最新CIと指定Runを照合し、CIログ・Trace・Screenshot・error contextを調査する。
- Round 2: 関連Seed/Reset、正式`BR-CHECKOUT-002`/`AC-CHECKOUT-002`、Web画面からUse Case/repositoryの経路を照合し、原因分類と変更境界を決める。
- Round 3: 12ファイルの値・式・Assertion・採点JSONを保護して書式のみ修正し、直接テスト/validator/Style Qualityを確認する。
- Exit Criteria: 直接原因と境界内修正の有無を証拠付きで分類し、関連ローカル検証と修正headの必須CI状態を報告する。未解決の製品候補はPR #210資料へ記録する。

## Approach（進め方）

- 1. fetched branchを確認済みfast-forwardで取り込み、current task PlanとTargetを確認する。
- 2. 指定Run #41411886158と現行headの最新Runから失敗ログ・Playwright artifactを確認する。
- 3. Reset/Seed/正式要件/実装経路を読み合わせ、failure taxonomy上の原因を分類する。
- 4. 最新CIの12対象を再取得してPrettier修正する。値や期待を変えない。
- 5. 依頼された直接テスト、`format:check:strict`、関連validatorを実行し、差分と意味不変を確かめる。
- 6. 通常のPR branch配信を行い、更新後の正確なheadに紐づくCIを確認する。force push/merge/releaseはしない。

## Definition of Done（完了条件）

- 現行HEADとPR/Target/Taskの初期状態を照合済み。
- 最新CI報告12ファイルを特定し、修正は形式だけでASTとJSONの意味値が不変。
- Checkout E2EをTrace/Screenshot/Seed/Reset/正式仕様/画面→Use Caseで診断し、原因の種類と確度を明示。
- 許可範囲の直接テスト、`format:check:strict`、関連validatorを実行して結果を報告。
- 製品変更が必要な場合はPR #210の既存管理資料へ記録し、PR #199に混ぜない。
- 必須CIの結果は修正後の正確なheadについて報告する。未完了/失敗をPASS扱いしない。

## Risks / Unknowns（リスク・未知点）

- 証拠未確認のままtest assertionや製品の期待値を変えると仕様と回帰を隠す。TraceとBR/ACを照合してから判断する。
- 同一branchの並行更新が続く。編集前とcommit/push前にhead・statusを再確認し、競合時はfast-forwardのみ、force pushをしない。
- GitHub artifactの一時URLやCI状態は期限/更新により変わる。正確なrun/headとローカル保存artifactを紐づける。

## Thinking Log（判断記録）

- 2026-11-02 JST: ローカルは当初`47abfee`でclean、GitHub PR #199はOPEN/base `main`。最新branch `509b1485486cbe5d621186a656244ec1cbeaf2bb`を取得し、ancestor確認後にfast-forwardした。
- PR bodyの記載HEADは`a982090...`だが、PR API/headとorigin/localは`509b148...`。body statusは最新headに同期していない。
- 指定Run #41411886158と現行headのWeb CI #41416246383はいずれもStyle Qualityと`Chromium E2E (required)`がfailure、`Vitest (contracts)`がsuccess。E2Eは同一Checkout text assertionで3回失敗。
- 作業はCIの再現・診断中。製品コード/仕様/既存E2E/Seed/Resetは未変更。
- 2026-11-02 JST 更新: 共有branchを`0ca6a828`、続いて`8c36c75f`までfast-forward。追加commitはPlanと`supported-behaviors.json`のみで、今回の12 Prettier対象とは重ならない。現行PR API headとlocal/originは`8c36c75fb88d738dd3277e77d3e156a86889fa32`。
- 最新CI #41422210721のStyle Qualityログは12ファイル（9件の初期列挙に未掲載だったcourse-core scriptとassessment contractを含む）を報告。ローカル全体Prettier check、JS/TS/TSX AST signature比較、M07 parsed JSON値比較は通過。
- Checkout Traceは`/checkout/confirm`遷移後、7,500msで期待文言を待つところまで進み、Artifact screenshotは汎用エラー本文と`/checkout/payment`リンクを表示。詳細はPR #210 follow-up管理資料へ記録済み。
