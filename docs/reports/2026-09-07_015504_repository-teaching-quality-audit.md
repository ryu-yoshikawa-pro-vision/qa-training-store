# Scenario Shop 教材品質・Repository-wide Audit 中間レポート

## 結論

現時点での評価は、**「豊富なTest対象と良い学習設計方針がある一方、受講者が実際に演習を進めるための接続と、能力を実証する課題が十分には揃っていない」**です。

特に優先すべきなのは、機能の追加よりも、次の3点です。

1. Training Copy・CI検証・受講者作成テストの実行経路を整合させる。
2. Lessonが提供済みと説明するScenario Resetを、Training exerciseから実際に使えるようにする。
3. 定数Assertionの失敗確認から、原因の異なるFailureをEvidenceで切り分ける演習へ進める。

現在のCommonの卒業像は、明示的に **entry-levelの汎用Test Automation Engineer、bounded Level 2** です。ユーザーが求める「実務で設計・実装・改善できる能力」へ近づけるには、この入口を重くせず、認証・状態分離・非同期・保守変更・CI運用を扱う実践課題を後段へ接続するのが適切です。

**このレポートは監査途中の結果です。** ユーザーの「現時点での調査結果をレポートにまとめて終了」という指示に従い、追加調査を停止しました。Repository全体の網羅的な監査、学習者による実証、改善実装は完了していません。

## 監査対象と証拠の強さ

- 対象Repository: [ryu-yoshikawa-pro-vision/qa-training-store](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store)
- 対象commit: [`856a14eb448a6ad6bf9722f623cf0d094b7a7d2a`](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/commit/856a14eb448a6ad6bf9722f623cf0d094b7a7d2a)
- 2026-09-07 01:54 JSTの確認では、local HEAD、remote HEAD、remote mainが一致。開始時worktreeはclean、branchは `report/2026-09-07`。
- PR #124のTraining Baseline / Exercise / Evidence整備、PR #116の自己学習改善、ADR-0022のCommon / Native specialization分離を含む現行状態を評価した。
- 調査方法: source / 文書 / validator / workflowの静的追跡、ローカル診断、既存GitHub Actions結果の読み取り、Playwright公式文書との照合。
- Product / Curriculumの分担調査2件は実行基盤の利用上限で結果未回収。Native / AIの分担調査は静的結果を回収した。親が直接確認した範囲を中心に結論を構成した。

以下では「実行確認」「静的確認」「改善候補」を区別します。静的に矛盾する経路が見つかっても、未実行の環境で失敗を再現したとは記載しません。学習者の到達率、所要時間、誤答率、評価者間の一致率は未測定です。

優先度はセキュリティSeverityではなく、教材としての影響です。**高**は学習経路・主要能力の獲得に直接関係するもの、**中**は実務への応用・評価の確実性を高めるものです。

## 優先Finding

### F01・高 — Training CopyとCurriculum検証の参照先が整合していない

- Location / Evidence: [prepare-training-copy.ts](../../scripts/training/prepare-training-copy.ts) は元の `.github/workflows/*.yml` を `.github/training-copy-source-workflows/` へ移し、active WorkflowをTraining用2件へ置き換える。一方、[validate-curriculum.ts](../../scripts/validate-curriculum.ts) の593行以降は `.github/workflows/ci.yml` と `native-ci.yml` を必須ファイルとして読む。[Training Web template](../../training/github-actions/training-ci.yml) の48〜49行はCI開始時に `validate:curriculum` を実行する。
- 現状: Source Repositoryでのvalidator PASSと、配布用Training Copyで同じvalidatorを実行できることが接続されていない。既存の [Training contract test](../../tests/contracts/training-curriculum.test.ts) のCopy演習は、移動・allowlist・`validate-training-copy.ts` の成功を確認するが、このCopy上の `validate:curriculum` までは確認していない。
- 学習への影響: 標準の配布経路を使った受講者が、自分のTestをCIで実行する前に教材側の参照不整合に遭遇する可能性が高い。これはCIやテスト設計を学ぶために意味のある難しさではない。
- Suggested fix: 配布時の検証と、学習中の検証を分ける。元のFormal Workflowを確認する処理は、Copyでは保管先を正しく参照するか、Source Repository専用の検証へ限定する。Training CIはCopy内のactive Training契約を検証する。
- 達成判定: fresh Training Copy上で、配布検証 → `validate:curriculum` → Web baselineまで成功する統合確認を追加する。Production Workflowの無効化は維持する。
- Open questions / confidence / Verdict: **静的確認・高確信度**。作成した実Training Copy上での再現は未実施。最優先の再現・修正候補とする。

### F02・高 — Part 1の自作TestをPart 2のCIへ接続する標準経路が弱い

- Location / Evidence: [P2-5](../curriculum/test-automation/part2/05_playwright-ci.md) の30行はPart 1の自作TestをCIから実行すると説明するが、198〜204行のハンズオンと [Training Web template](../../training/github-actions/training-ci.yml) の54〜59行はbaselineとexpected-failureだけを実行する。[workflow-contract.ts](../../scripts/training/workflow-contract.ts) の16〜23行の許可集合にWeb exerciseはない。
- 実行確認: `validateTrainingWorkflow()` に対し、templateのbaselineコマンドをメモリ上で置換した診断では、`test:unit`、`format:check`、`lint:markdown`、`lint`、`typecheck`、`training:web:exercise`、`training:web:mobile:exercise` の7件すべてが拒否された。P2-4のハンズオンはUnitと品質チェックを追加する構成である。
- 適用条件: この拒否は**templateを変更して検証する経路**の結果である。active `.github/workflows/training-ci.yml` だけを編集した場合、`validate:curriculum` はsource templateを読むため、この診断だけで実CIが必ず停止すると断定できない。ただし [validate-training-copy.ts](../../scripts/training/validate-training-copy.ts) の63〜71行は初期Source SHAとtemplateとの完全一致を要求するため、学習後のCopyを同じ手順で再検証する用途にも合わない。
- 学習への影響: 「配布済みTestが緑になった」と「自作TestがPRを保護した」が分離されたままになる。受講者がどのファイルを変更し、変更後にどの検証を使うかも一意ではない。
- Suggested fix: P2-5ハンズオン1で、Part 1の `TC-CART-*` を持つexerciseをactive Training Workflowへ接続する。P2-4で教える安全なコマンドも実行契約へ明示する。配布時のSource SHA確認と、学習中の編集許可・検証は別の責務にする。
- 達成判定: 自作Testの誤った期待値でPRの該当Stepが赤くなり、そのTest Case IDのArtifactを取得できる。期待値を正しく直した次runで緑へ戻る。baselineだけの成功ではこの演習を完了としない。
- Open questions / confidence / Verdict: **診断確認・高確信度**。learner-owned active Workflowの変更後検証契約を明確にする必要がある。任意コマンドの無制限許可は推奨しない。

### F03・高 — P1-5が前提にするTraining Resetの使い口が提供されていない

- Location / Evidence: [P1-5](../curriculum/test-automation/part1/05_playwright-e2e-practice.md) の27行、35〜44行、90行は、Training HarnessがScenario Resetを提供し、内部設計はP1-8で扱うと説明する。[baseline](../../training/playwright/baseline/training-baseline.spec.ts) の3〜13行のReset関数は非exportかつ `default` 固定。[exercise starter](../../training/playwright/exercises/training-exercise-starter.spec.ts) は `@playwright/test` を直接importし、Resetを持たない。
- 学習への影響: `out-of-stock` や `low-stock` を使う段階で、受講者はまだ教わっていないTest API呼出し・非同期ready・reloadを自分で組み立てるか、Formal fixtureを先に読み解く必要が生じる。計画した難易度の順序と実装の入口がずれている。
- Suggested fix: Training専用の小さな `scenario(name)` または `resetScenario(page, name)` を提供する。P1-5では引数と観測結果だけを利用し、P1-8でその内部を読み、test fixtureへ整理する。Formal fixtureの全責務を初学者へ一度に持ち込まない。
- 達成判定: 受講者が公開された使い口だけで `default` / `out-of-stock` / `low-stock` を指定できる。2本のTestを単独・まとめて実行しても初期状態が同じになり、selected ScenarioのEvidenceを説明できる。
- 反証・注意: Playwrightの標準Page/Context分離は存在する。今回のFindingは「すべてのTestが状態を共有する」という主張ではなく、教材が約束する明示的Scenario準備の使い口の不足である。
- Open questions / confidence / Verdict: **静的確認・高確信度**。Training assetとして補完する価値が高い。

### F04・高 — Flaky / Failureの説明に比べ、原因を診断する実行課題が薄い

- Location / Evidence: [P1-6](../curriculum/test-automation/part1/06_execution-and-failure-analysis.md) はFailure分類、Trace、Console、同期、仮説と最小修正を説明する。一方、配布済みの [expected-failure.spec.ts](../../training/playwright/failure-exercises/expected-failure.spec.ts) は `expect(true).toBe(false)` の1件。Locator / Timingハンズオンは受講者に自分で不安定なTestを作らせる短い指示である。
- 学習への影響: Artifactを見る練習はできるが、「結果が同じ赤でも原因が違う」「何を追加観測すれば仮説を棄却できるか」を十分に練習できない。自分で原因を仕込んだTestだけでは、未知のFailureを診断する能力の確認が難しい。
- Suggested fix: P1-6に、同じCart / Checkoutを使う3つの小課題を追加する。①対象を誤選択するLocator、②決済遅延に対する固定wait、③共有Pageまたは共有setupを意図的に使った状態依存。問題文では症状と仕様だけを示し、原因名は回答後に開示する。
- 実施方法: ①TraceのDOMと選択対象、②短い遅延・長い遅延での観測、③単独・順序変更・まとめ実行を比較する。ランダムsleepに頼らず、条件を固定してFailure機序を再現可能にする。これらの診断用変種は通常baselineへ含めない。
- 達成判定: 観測事実、2つ以上の仮説、仮説を分ける確認、原因、最小修正、条件を変えた再確認を残す。Retry回数増加やAssertion削除だけでは達成としない。
- 反証・注意: 現行本文はRetryを解決策とみなさず、meaningful diagnosisも完了条件に含めている。不足は原則ではなく、その能力を練習・判定できる素材である。
- Open questions / confidence / Verdict: **静的確認・高確信度**。教材効果への影響は学習者pilotで検証する。

### F05・中 — Expected Failureの判定が、失敗原因の正しさを確かめない

- Location / Evidence: [run-expected-failure.ts](../../scripts/training/run-expected-failure.ts) は子プロセスが成功していないことと、`.zip` / `.png` / `.webm` / `.html` の存在を確認する。指定Testが狙ったAssertionで失敗したか、起動・Navigation等の別工程で失敗したかは判定していない。
- 学習への影響: 必要な拡張子のArtifactが生成される別Failureでも、checked entryが成功となり得る。「意図したFailureを観測した」と「何らかのFailureを記録した」の違いを学ぶ際に曖昧さが残る。
- Suggested fix: Reporterの構造化結果から対象Test、失敗工程、期待したAssertion、不意のTest / setup Failureを区別する。checked commandの成功は「意図した失敗と証拠の確認」であり、C09修了ではないと表示する。
- 達成判定: 狙ったAssertion失敗だけを受理し、起動不能・Navigation失敗・別Test失敗・Artifact欠落を拒否する。既存Evidenceを消さないattempt別出力も設計する。
- Open questions / confidence / Verdict: **静的確認・高確信度**。別Failureの誤受理の実行再現は未実施。今回、既存共通出力を削除するwrapperは起動していない。

### F06・中 — 実務への応用に必要な認証・状態分離・Network・並列実行の実装練習が弱い

- Location / Evidence: 確認した [P1-4](../curriculum/test-automation/part1/04_playwright-foundations.md)、[P1-5](../curriculum/test-automation/part1/05_playwright-e2e-practice.md)、[P1-8](../curriculum/test-automation/part1/08_test-management-and-maintainability.md)、[P2-5](../curriculum/test-automation/part2/05_playwright-ci.md)、Training Web 3 specでは、Locator / Assertion / Reset / Mobileの入口に比べ、認証再利用・worker単位のデータ・Network制御を実装して比較する課題が薄い。Productは [Repository README](../../README.md) が明示するlocal DB / Mock Paymentの教材である。
- 学習への影響: このアプリで得た経験を、HTTP API・認証状態・共有サーバーデータのある実務へ移す際の違いが分かりにくい。`fullyParallel: false` は全ファイルの直列実行を意味しないため、設定値だけからIsolationを理解させるのも不十分である。
- Suggested fix: P1-8後の発展課題として、①新Contextと同一Context内の別PageでDB / Session共有範囲を比較、②UI Login・Seed Session・保存した認証状態の適用範囲を比較、③同じScenario Shopの住所検索等1つのPortに任意のlocal HTTP adapterを置き、成功 / 遅延 / 失敗 / 再試行を観測、④独立したTestをworker数1と複数で比較する。
- 達成判定: どの状態を誰が所有するかを説明し、UI経由で保証すべきLogin Testを残せる。遅延・失敗で誤った完了表示にならず、並列化しても対象データが干渉しない。IndexedDBごと保存・復元する案は、認証以外の業務データも含み得ることを評価する。
- 反証・注意: 共通Coreへすべて追加する提案ではない。実Payment、外部SaaS、分散backendを導入する必要もない。Playwrightの機能を使うこと自体をゴールにしない。
- Open questions / confidence / Verdict: **改善候補・中確信度**。全Lessonの網羅調査は未完了。API / auth / fixture / workerの挙動は [Playwright Authentication](https://playwright.dev/docs/auth)、[Fixtures](https://playwright.dev/docs/test-fixtures)、[Mock APIs](https://playwright.dev/docs/mock)、[Parallelism](https://playwright.dev/docs/test-parallel)を参照した。

### F07・中 — 仕様変更後のTest保守を、実行結果で学ぶ経路が未提供

- Location / Evidence: [P1-8](../curriculum/test-automation/part1/08_test-management-and-maintainability.md) の219〜238行、324〜349行は購入上限5→3を仮想変更として扱い、Productを変えずImpact Analysisを作る。実行可能な変更済み演習Branchは将来の選択肢である。
- 学習への影響: 影響分析は学べるが、古いTestが何を検知し、どのTestが緑のまま見逃し、変更後も何の保証を残すべきかを実測する機会が弱い。
- Suggested fix: 現行ハンズオンの後に、変更仕様と対応Productを対で用意した発展課題を追加する。受講者がCaseを追加・修正・統合・維持する理由を決め、その後で実行する。
- 達成判定: 新しい境界の違反を検出でき、別の既存Cart保証は残る。Testを単に全部新期待値へ置換する回答では達成しない。変更行数や共通化量そのものは評価指標にしない。
- 反証・注意: 現行C10は実在する保守問題と最小改善・再実行を要求する。保守教育が存在しないという指摘ではない。未変更Productに将来仕様の期待値を強制する提案でもない。
- Open questions / confidence / Verdict: **静的確認に基づく改善候補・高確信度**。

### F08・中 — Rubricを実際の提出物へ適用する評価の校正が必要

- Location / Evidence: [Competency Rubric](../curriculum/test-automation/02_competency-rubric.md) はC01〜C12、Level 0〜3、Minimum Evidenceを明示し、stock PASSとcompetencyを区別する。P1-4 / 5 / 6 / 8には自己確認とRecoveryもある。一方、今回確認した資料から、評価者・独学者が同じ提出物をどれだけ一致して評価できるかは分からない。
- 学習への影響: 「意味のあるAssertion」「十分なCoverage」「適切な最小共通化」を本人が過大・過小評価する余地が残る。これは正解コードとの差分評価へ戻す理由にはならない。
- Suggested fix: 同じCart仕様に対する3つの匿名化した提出例を用意する。①緑だが対象が曖昧なTest、②単純で妥当なTest、③別の妥当な抽象化を選ぶTest。まず自分で評価し、その後に根拠付きの校正例を見る。
- 達成判定: 同等な2つの設計を両方許容でき、Coverage不足・Isolation欠落を根拠付きで指摘できる。実学習者と複数評価者によるpilotで、判断が割れる項目を特定する。
- Open questions / confidence / Verdict: **改善候補・中確信度**。評価素材全体の探索と学習者実験は未完了。評価制度が存在しないというFindingではない。

## Native / AIの中間所見

この節は分担調査の静的結果を基にした候補です。実端末・Maestro・Agentic QAを今回実行しておらず、Coreの必須条件違反と断定しません。

| 領域 | 現状と評価 | 具体的な次の教材案 | 判定に残すEvidence |
| --- | --- | --- | --- |
| Native exercise | [starter](../../training/maestro/exercises/native-training-exercise.yaml) はbaseline再利用とHome確認が中心。C08は別途learner-authored diffを要求しており、stock成功だけで修了できるという意味ではない | P1-7でCart追加→アプリ停止→再起動→hydration完了→数量保持を1課題にする。[Formal persistence](../../maestro/native-restart-persistence.yaml) を回答後の比較材料に使う | 再起動前後の操作・状態・JUnit / screenshotと、Web reloadとの差の説明 |
| Native固有操作 | 実装とRunbookにはscroll、IME、Device状態の調査素材があるが、Trainingでそれを実践する量は限定的 | Native選択者向けに入力→keyboard表示→scroll→確定を扱い、要素不在と画面外・IME干渉を区別する小課題を追加 | UI hierarchy、画面、入力条件、最初の異常と回復手順 |
| Native failure | [failure-exercises](../../training/maestro/failure-exercises/README.md) に実行課題がなく、P2-6のFailure学習は実際の失敗機会に左右される | 正常APK上で意図的な状態待機・対象選択の誤りを1つずつ与え、ログの読む順序を比較する | Build / Install / Runtime / Assertionのどこまで成立したか、修正前後の証跡 |
| Native CI | 準備済みWorkflowの利用・Trigger / Gate / Artifact / Cost判断が中心。Common外への分離は妥当 | CIを利用して評価する能力と、Workflowを自作する能力を別に説明する。自作は必要な受講者の発展課題に限定 | 自作を評価する場合だけboundedなWorkflow diffとその実行結果 |
| AI / Agent | [Optional Agentic QA](../curriculum/test-automation/part1/09_specification-agentic-qa.md) と [QA_AGENT.md](../../QA_AGENT.md) には仕様・Evidence・実行境界の考え方がある。HostのScored capabilityと学習者のAI活用能力は別 | 同じCart課題で「人の分析→AI草案→人の批評→実行→AIのFailure仮説→人の再検証」を行う。Native scoring追加より先にCommon成果物を再利用する | prompt、AI案、採否と根拠、反証、修正版、再実行、残るCoverage gap |

Android Build + RuntimeとiOS Build-onlyを分け、Nativeをbranch / rejoinする [ADR-0022](../adr/0022-test-automation-curriculum-native-specialization.md) の方針は維持すべきです。Camera等の権限を教えるためだけに無関係なProduct機能を増やすことは推奨しません。現行Productに対象がない項目は「対象外と判断する能力」の練習にできます。

AIについても、Scored用の隔離・receipt・評価HarnessをCommonの前提へ増やす必要はありません。AIの文章やTest生成だけでは証拠にならず、仕様・実行・人の批評へ戻る課題を優先します。

## 現状の強み

1. **Test対象の題材が豊富。** 検索 / Filter / Cartだけでなく、Role、会員状態、価格・在庫・Version競合、Mock Payment再試行、注文配送、Review、管理画面を備える。単純CRUDへ寄せる必要はない。詳しい業務仕様・実装一致の監査は未完了。
2. **コードを書く前に分析する順序がある。** [Curriculum README](../curriculum/test-automation/README.md) はP1-2対象分析→P1-3設計・自動化選定→P1-4実装の順序を持つ。「仕様から即Playwrightだけ」の構成ではない。
3. **OracleとObservedの区別が明確。** Rubricは `docs/spec/` を期待動作の正本とし、既存UI・Testを正解へ昇格させない。BR / ACとEvidenceを対応させる設計がある。
4. **自動化の保守思想が良い。** P1-8はHelper / POM / Fixture / Flow / 現状維持を選択肢として扱い、POMの採用量を成績にしない。過剰共通化を推奨していない。
5. **保証境界と成果の区別がある。** Formal / Training、baseline / learner evidence、Common / Native、Android Runtime / iOS Build-onlyを区別する。これは教材を大きくせず段階化するための土台である。

現行のsemantic Locator、状態に対するAssertion、Test Isolation、単純なTestでは重複を許容する考え方は、[Playwrightの推奨事項](https://playwright.dev/docs/best-practices)とも整合する。悪いPracticeの例として記載された固定waitを、Repositoryが推奨していると誤読してはいけない。

## 学習順序の具体案

既存Lesson番号を大きく変更せず、前段の成果物を再利用する。

| 位置 | 残すもの / 加えるもの | 次で再利用する成果 |
| --- | --- | --- |
| P1-2 → P1-3 | 現行の対象分析・Risk・技法選定を維持。Spec全体の意味監査が終わるまでは全面改訂しない | Risk、Test Condition、選ばなかった条件と理由 |
| P1-4 | Role / Label、ActionとAssertion、最小構文を維持。対象を誤った可視性Assertionと、正しい商品の振る舞いAssertionを比較 | 自作のCart TestとLocator選択理由 |
| P1-5 | 利用できるScenario Resetを提供。正常追加・代表境界・数量変更を同じ初期状態契約で実装 | Reset可能な複数Test、Test Case ID |
| P1-6 | F04の3診断課題。固定wait対状態待機、単独対まとめ実行を観測 | 原因・反証・修正・再実行記録 |
| P1-8 | 先に体験した重複・状態依存をHelper / Fixture等で改善。採用しなかった抽象化も説明 | 改善前後のdiff、保証が保たれたEvidence |
| P1-9 | 未実施の既存Featureを1つ選び、同じ様式で設計→実装→失敗分析を行う転用課題 | Cartの手順を写すだけでない到達確認 |
| P2-4 → P2-5 | 準備済みCopy上でUnit / 品質チェック→自作Web Test→意図したFailure / Artifactの順に接続 | 自分の変更で赤→緑になるPRとEvidence |
| P2-7 → P2-8 | 実行時間、Retryで救われた回数、Failure工程を使ってGateと頻度を判断 | 数値とRiskを根拠にしたbounded CI設計 |
| 選択経路 | Native lifecycle、AI出力検証、local HTTP / 認証 / 並列化を必要に応じて追加 | 同じ仕様・Caseを別条件へ適用した比較結果 |

## 評価方法の改善案

正解コードとの差分やTest本数で合否を決めず、機械で確かめられることと人が判断することを分ける。

| 観点 | 機械で確認できる範囲 | 人のReview / 自己評価に残す範囲 |
| --- | --- | --- |
| Behavior correctness | 指定Scenarioで実行する、対象の故障変種をTestが検知する | Oracleが仕様に沿うか、誤った期待値を正解にしていないか |
| Coverage / Test Design | BR / AC / Case IDの参照整合、実行有無、未実行の識別 | 技法選定、代表値の妥当性、Riskと未検証領域の説明 |
| Locator | 一意性や実行成功、用意したUI構造差に対する動作 | 対象の意味、将来変更への耐性、Test IDを選ぶ理由 |
| Isolation / Stability | 単独・まとめ・順序・worker条件を変えた結果 | 状態の所有、再現条件、Retryを使う理由と残るRisk |
| Readability / Maintainability | 型検査、実行結果、変更対象の到達性 | Test目的の読み取りやすさ、共通化の責務、残す重複の理由 |
| Failure analysis | 対象run / Test / Artifactの対応、誤受理の防止 | 仮説と事実の分離、反証、最小修正の妥当性 |
| CI | 実際にlearner Testが走ったか、赤→緑、Artifactの保存 | Gateの選定理由、費用・時間・調査可能性の比較 |
| AI利用 | 提示されたCaseと実行証拠の対応 | 誤出力の発見、採否理由、過剰な断定・Coverage漏れへの批評 |

固定回数の再実行がすべて成功しても、Flakyが存在しない証明にはならない。学習では条件と観測回数を残し、根拠の範囲で安定性を説明する。[PlaywrightのRetries](https://playwright.dev/docs/test-retries)が区別するpassed / flaky / failedも、CI緑だけに潰さず読む対象とする。

## 追加・統合・削減の判断

- 追加価値が高い: 使用可能なReset、小さな原因別Failure課題、learner TestがCIを赤くする課題、異なる正答を認める提出例、変更仕様を対に持つ保守課題。
- Productは既存の価格・在庫・権限・再開・永続化をまず使い切る。決済サービス、Microservices、実配送、大量のCRUDは優先しない。
- Native / AI / deliveryは選択経路を維持する。全員にDevice、Scored Host、複雑な配布基盤を要求しない。
- Common / Native / Extension / Referenceの説明は、Lesson先頭の短い経路表へ集約できる。学習途中の同じ境界説明を減らし、必要な正本へリンクする。内容削減は意味の重複を確認してから行う。
- [P1-10 Legacy Alias](../curriculum/test-automation/part1/10_part1-capstone.md) は内容を重複管理しない簡潔な案内へ統合する候補。ただし互換リンクの必要性を未調査のため削除は推奨確定しない。
- Formal test / CI / Native runbookの複雑性は、比較教材として価値がある。学習者の最初の操作面から分離することで負荷を減らす。Run Artifactや過去の監査履歴は削除候補にしない。

## 改善Roadmap（提案・未承認）

工数・期間は未見積もり。以下の順序は依存関係と学習への影響に基づく。

| 順序 | 具体的な成果 | 対象 | 受入条件 |
| --- | --- | --- | --- |
| 1. 学習経路の接続 | Copy上の検証整合、配布時 / 学習中の契約分離、Training Reset、自作Web TestのCI接続 | F01〜F03 | fresh Copyでbaseline→Scenario別exercise→CIのlearner Testまで進む。意図したTest失敗でCIが赤くなる |
| 2. Failureから学ぶ | 原因別3課題、狙ったFailureだけを受理するchecker、attempt別Evidence | F04〜F05 | 別原因の失敗を誤受理せず、学習者がEvidenceから原因を分けられる |
| 3. 設計・保守・評価 | 同等な別設計を含む提出例、変更済み仕様 / Productの対、転用課題 | F07〜F08 | 古い保証を保ちながら変更の違反を検出し、採用・不採用の設計を説明できる |
| 4. 実務への応用 | 認証 / Context / Network / worker比較、Native lifecycle、AI批評課題 | F06、Native / AI候補 | 同じ仕様を条件の異なる実行環境へ適用し、保証の限界を説明できる |
| 5. 学習効果の実証 | プログラミング未経験者とテスト経験者のpilot、評価の校正 | Curriculum全体 | 環境での停止と概念理解での停止を区別し、滞留・誤答・到達結果から不要な手順を削る |

実行基盤に関わる候補は `harness-improvement` Skillに従って実装と分離する。分類は既存の [Failure Taxonomy](../reference/failure-taxonomy.md) とevaluation schemaの語彙を使う。

| candidate_id | target | failure_category | evidence / expected_impact | risk / recommended_change | strictness | status / owner_decision |
| --- | --- | --- | --- | --- | --- | --- |
| TA-H01 | Other: `scripts/validate-curriculum.ts`、`scripts/training/prepare-training-copy.ts` | `missing_validation` | F01、source validator PASSだけではCopy経路を検証できない | Formal分離を維持し、配布Copy上の利用経路を統合検証する | strict | proposed / not_reviewed |
| TA-H02 | Other: `scripts/training/workflow-contract.ts`、Training templates | `instruction_gap` | F02、7コマンドの拒否診断。教える操作と実行契約を整合する | 許可範囲の変更を伴うため、安全な具体コマンドだけを検討する | strict | proposed / not_reviewed |
| TA-H03 | Other: `scripts/training/run-expected-failure.ts` | `missing_validation` | F05、失敗理由を区別しない。狙った診断Evidenceだけを受理する | runner / Artifact契約の変更。既存Evidenceを失わない移行・rollbackが必要 | strict | proposed / not_reviewed |

source_runsはいずれも `20260907-015504-JST`。この監査では採用・実装・権限変更を行っていない。

## 16重点領域の監査状況

| 領域 | 現時点の到達点 | 残る確認 |
| --- | --- | --- |
| 1. Test対象Product | 機能・Scenario・Test StrategyからCRUD以外の題材を確認 | 全FeatureのBusiness Ruleと実装一致 |
| 2. Productの現実性 | local DB / Mockと実務への応用境界を整理 | 非同期・競合・Cross-user挙動の詳細追跡 |
| 3. Specification | Oracle方針、構造validator、Visual完了を確認 | 全BR / ACの意味・曖昧さ・情報量 |
| 4. Test Analysis / Design | 分析→設計→実装の順序とRubricを確認 | P1-1〜3・Workbook全体の詳細監査 |
| 5. Curriculum | Common / Native経路、段階構造を確認 | 全Lessonを通した網羅Review |
| 6. Difficulty | P1-4 / 5 / 6 / 8の接続不足を抽出 | 初学者実測、復習量、所要時間 |
| 7. Playwright | Training code / config、主要Lessonを照合 | 全Formal実装、実Runtime診断 |
| 8. Flaky | 原則と実行課題の差を確認 | 原因別演習の実測 |
| 9. Failure / Debug | Artifact / 分類 / checkerを確認 | 狙い以外のFailure誤受理の再現 |
| 10. CI / 運用 | Copy / Workflow / validator、対象SHAのWeb CIを確認 | 実Training Copy上のCI end-to-end |
| 11. Maintainability | P1-8の選択肢と仮想変更の境界を確認 | 実提出物・変更後Testによる評価 |
| 12. Anti-pattern | 固定waitは悪例として明示、starterとFormalを確認 | 全codeの網羅確認 |
| 13. Exercise | Web配布3 spec、Native starterと説明を確認 | 全Exerciseの解答可能性・代替解 |
| 14. Evaluation | Rubric / Minimum Evidence / 自己確認を確認 | 採点校正・到達実証 |
| 15. Web / Native | 分担による静的調査と保証範囲を確認 | Native実機、Training runtime |
| 16. AI / Agent | 分担によるOptional / Harness境界を確認 | learnerのAI批評成果物と実演習 |

## 最終18問への現時点の回答

| 問い | 暫定回答 |
| --- | --- |
| 1. 現在何を学べるか | 仕様・Risk・技法選定、基本Playwright、Failure分析の考え方、保守選択、Git / PR / bounded CI。Nativeは選択式 |
| 2. 強み | 豊富なProduct題材、Oracle分離、POM非強制、分析先行、明確な保証境界 |
| 3. 大きな不足 | 教材説明から実行assetへの接続、原因不明のFailureを診断する量、転用・評価の実証 |
| 4. Product改善 | まず既存Behaviorを演習化。必要なら住所検索等1つのlocal HTTP境界を発展用に追加 |
| 5. Specification改善 | 全文意味監査は未完了。現時点では全面改訂を勧めず、演習ごとの必要BR / AC・用語・状態への短い導線を検討 |
| 6. Curriculum改善 | 前段のCase / Code / Failureを次段へ持ち込む接続を実行で確認 |
| 7. Lesson順序 | P1-5でResetを利用し、P1-6で失敗を体験してからP1-8でFixtureを設計 |
| 8. Exercise改善 | 原因別課題、未知Featureへの転用、仕様変更済み課題、複数の妥当解 |
| 9. 実装教材改善 | Scenario APIの利用口、意味のあるAssertion、認証・Context・Network・workerの発展課題 |
| 10. Failure / Flaky改善 | 定数の失敗だけから、仮説を観測で分ける3課題へ。Retryで隠れたFailureを読む |
| 11. CI改善 | fresh Copyで動く検証、自作TestによるPR赤→緑、同一runのArtifact |
| 12. Web / Native改善 | 選択分岐を維持。Nativeはrestart / hydration / IME等、固有の価値を持つ課題へ |
| 13. AI改善 | 生成よりも人の批評・反証・実行Evidenceを評価するOptional演習 |
| 14. 評価改善 | 機械判定と人の判断を分離し、同じ提出物による評価校正を行う |
| 15. 不要・過剰 | CommonへのNative環境、Scored Host、full deliveryの強制。教材のためだけの大規模backend追加 |
| 16. 追加価値が高い | Reset / CI接続、原因別Failure、仕様変更後の保守、別解を許す評価例 |
| 17. 削除・統合候補 | 重複する経路説明・Legacy Aliasの本文。リンク互換性を確認するまで削除判断は保留 |
| 18. Roadmap | 接続修復→Failure実践→保守と評価→応用→学習者pilot。詳細は上表 |

## 実行コマンド・結果・限界

| Evidence command / 確認 | 結果 | 読み取れる範囲 |
| --- | --- | --- |
| `git status --short`、`git rev-parse HEAD`、`git ls-remote origin HEAD refs/heads/main` | 開始時clean、SHA一致 | 監査基準の特定 |
| `pnpm run validate:curriculum` | PASS: Required 22文書、Workbook 4ファイル、Training 2 Project | Source Repositoryの構造契約。学習成果や配布Copyの実行保証ではない |
| `pnpm run validate:spec-visuals:final` | PASS: Catalog 38、Product Screen 31、Capture 94/94、pending / blocked 0 | 構造・登録Visualの整合性。全仕様の意味品質や現時点の画面QAではない |
| `pnpm run typecheck:training` | PASS | ローカル環境でのTraining型検査 |
| メモリ上の `validateTrainingWorkflow()` 診断 | 現行template受理、教材コマンド7件の拒否を確認 | F02の条件付き不整合。active-only編集時のCI Failureを再現したものではない |
| `gh run view 34012777124 --json jobs` | 対象SHAのWeb CI success、Training baselineもsuccess | 既存Formal / baseline経路。受講者の自作Testの保証ではない |
| ローカルAutomation向け `expo export --platform web --output-dir <今回の一時出力>` | PASS | installed Expo群がmanifestより古いため、現行lockfileでのBuild成功として扱わない |
| `pnpm list expo expo-router expo-build-properties @playwright/test --depth 0` | installed: 57.0.17 / 57.0.17 / 57.0.15 / 1.62.0 | ローカル依存差を確認。依存変更はしていない |
| `gh run download 34012777124 --name web-dist-automation` | 成功。bundle中の対象SHAも確認 | 現行CIで作ったAutomation Artifactの取得 |
| 既存Training baseline / exerciseの診断起動 | **未実行**。PowerShellで複数reporter引数が `list json html` となり、CLIがmodule解決で停止 | Product / TestのFailureではない。Browser起動前。停止指示により修正再実行せず |

対象SHAの [Web CI run](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/34012777124) は成功している。一方、閲覧した [2026-08-30のCross Browser Smoke](https://github.com/ryu-yoshikawa-pro-vision/qa-training-store/actions/runs/33337670434) はFirefoxのbrowser launchで失敗し、ログに `CanCreateUserNamespace() ... EPERM` が出ていた。結果は4 failed / 4 passed。これは過去SHAの観測であり、現行HEADのFirefox不具合や根本原因を確定したものではない。この種の実ログを、Product FailureとEnvironment Failureを区別する教材へ再利用する価値がある。

新しいGitHub Actions実行、Native Build / Install / Maestro / Device操作、iOS Runtime、Agentic QA、完全なWeb回帰は実施していない。全Product品質ゲートPASSを今回の監査結果として主張しない。

診断スクリプト・ログ・取得したビルドはGit管理外の `.artifacts/repository-audit/20260907-015504-JST/` にある。fresh cloneでは再取得・再生成が必要なため、長期参照に必要な結論とコマンド結果は本レポートおよびRun REPORTへ要約した。

## 終了状態

保存文書の検証は、Markdownlint（383文書、issue 0）、今回のPlan / ReportのPrettier check、相対リンク存在確認（30件）、`git diff --check`、Run ArtifactのSanitizer Write / CheckがPASSした。これは文書成果物の検証であり、未実行のProduct品質ゲートを補うものではない。

ユーザー指示に従い、この中間レポートを保存して監査を終了する。Product、Curriculum、Training source、workflow、権限、依存、Git履歴の変更は行っていない。今回の成果物は監査Plan、当レポート、標準Run Artifactである。

当初のRepository-wide Auditを再開する場合に残るのは、Product / Spec全体の意味監査、未読LessonとWorkbookの通し確認、F01の配布Copy再現、Training runtime、Native / AI候補の反証、実学習者による評価である。これらを完了済みとして扱わない。
