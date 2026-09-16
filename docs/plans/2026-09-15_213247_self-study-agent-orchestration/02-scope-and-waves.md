# 詳細2：影響範囲・ウェーブ依存関係・変更対象

[← インデックスへ戻る](../2026-09-15_213247_self-study-agent-orchestration.md)

> このファイルだけがウェーブ依存関係の正本である。詳細1はレッスン／引き渡し、詳細3は記録／CI、詳細4は検証方法を定義するが、ウェーブ順序を再定義しない。

## 4. 影響範囲

### 4.1 変更候補

変更候補は、下記ウェーブの厳密な変更対象にさらに限定する。

- カリキュラム: docs/curriculum/test-automation のREADME、設計、17件の正本レッスン本文。
- ワークブックの境界: training/workbook/README.mdのみ。4つの正本CSVは提供サンプル／テンプレートとして保護する。
- Training: 既存の開始用コード、意図的失敗／診断フィクスチャ、受講者向け修了確認、必要最小限の実行記録出力、Trainingワークフローのテンプレート。
- 第2部（Part 2）: 第2部本文、Git／GitHub基礎学習でのTraining Copyまたは学習者自身のForkの利用、C12／Training CIでのTraining Copyへの引き渡し配置手順、Trainingワークフローの説明。
- エージェント運用: AGENTS.md、既存Harness／Planテンプレート／verifyの文書・静的契約。既存エージェント設定値は継承する。
- テスト不足調査: 既存の仕様（Spec）／テスト／ACの読み取り専用の棚卸し。製品統合テスト（Product Integration Test）の追加はこの計画の主要経路に含めない。

### 4.2 確認のみ

次は実装前に読むが、下記ウェーブの変更対象にない限り変更しない。

- src/**、docs/spec/**、正式な回帰テスト、既存の本番ワークフロー。
- training/workbook/01_target-risk.csv〜04_execution-improvement.csv。
- training/playwright/baseline/**、training/playwright/support/reset-scenario.ts、既存のNative実行環境（runner）。
- scripts/training/prepare-training-copy.ts、validate-training-copy.ts、workflow-contract.ts。
- .codex/config.toml、.codex/agents/*.toml、Hook／収集処理（collector）／ラッパー（wrapper）の設定値。
- 既存Runディレクトリ、coverage/**、Gitメタデータ、機密情報／権限（Secret／Permission）。

### 4.3 保護対象と不変条件

- 製品（Product）の振る舞い、規範仕様、既存評価基準のCommon／Native境界、正式な回帰テストを変更しない。
- 正本ワークブックへTARGET-CART-101、RISK-CART-101、TC-CART-101などの完成行を追加しない。
- 受講者の完成Playwright spec、完成した失敗回答、架空証跡をリポジトリの提供資材として配布しない。
- Trainingワークフローは本番／正式ワークフローと分離し、既存の最小権限、機密情報なし、`contents: read`を維持する。
- Part 2のGit／GitHub基礎学習ではTraining CopyまたはForkを利用できる。C12を含むTraining CIとPart 2最終修了の正式経路はTraining Copyとし、Fork上のRun／Check／ArtifactをTraining Copyの成功証跡へ読み替えない。Organization／repository管理者権限、Secrets管理、branch protection変更、GitHub App設定、workflow権限設定変更は要求しない。
- エージェントの権限、サンドボックス、wrapper、model、thread、max_threads、max_depthを変更しない。
- 今回の計画修正ではmergeや実装を行わない。許可されたPlan／Run差分のcommit／pushと、既存PR #157の最新head・必須CI確認は完了処理として行う。

## 5. 変更方針

### 5.0 ウェーブ依存関係の唯一の正本

次のグラフ以外に、ウェーブの順序や必須依存を別ファイルで定義しない。

ここでの`AG1`／`AG2`／`AG3`は本計画のAgent運用ウェーブの名前空間である。既存HookのGit安全ポリシー`G1`／`G2`／`G3`とは異なるため、Hookの識別子をAgent lifecycleの検証済み証拠として流用しない。

    W0: 最新main / SSOT / 保護パス / 担当者ゲート
      ├─ カリキュラム系統: L1 → L2 → L3
      ├─ 修了確認系統: 必要なレッスン契約（L1とL2の縦断契約）確定後 → T1 → T2
      ├─ カリキュラム／Trainingの受入系統: L3 + T2 → V1
      ├─ エージェント系統: AG1 → AG2 → AG3（カリキュラム系統から独立）
      └─ C1: AC／既存テストの読み取り専用の不足調査（W0後、主経路から独立）

    AG3: AG1 → AG2完了後のエージェントのライフサイクル／ソース完全性検証
      V1: L3 + T2 → 講師向け資料なしの受講者一巡確認・品質ゲート・引き渡しの最終判定

依存関係の読み方を固定する。

- L1はAG1／AG2を待たずに開始できる。L2もAG1／AG2をカリキュラム開始の前提にしない。
- T1はL3全体やC1の製品テスト追加を待たず、L1とL2で受講者成果・ケース引き渡しの必要契約が確定し、W0で既存Runner／Reporter／実行結果を使う記録方式との矛盾がないことを確認できた時点で開始できる。
- T2はT1の記録契約と、教材用コピー（Training Copy）への安全な配置方式が確定してから開始する。
- C1はT1／T2の必須依存ではない。製品統合テスト（Product Integration Test）を追加する場合は、この計画と別の承認済みタスクに分離する。
- AG1／AG2はカリキュラム／修了確認の学習開始を妨げない。AG3はAG1 → AG2のエージェント系統だけを依存先とし、L3／T2／V1の必須前提にしない。V1はL3 + T2だけでカリキュラム／Trainingの受入判定を行い、AG3の結果はAgent運用の判定として別に報告する。既存HookのG1／G2／G3とは別の名前空間・責務である。C1はAG3／V1の必須前提にしない。
- 未解決の重要事項、FAIL、BLOCKED、結果なしの部分結果をPASSへ変換して次の依存先へ渡さない。

### 5.1 ウェーブ共通契約

各ウェーブの開始時に親エージェントは、担当者、厳密な参照対象、厳密な変更対象、禁止パス、開始条件、期待出力、終了条件、証跡、ロールバック境界、停止条件を進行中のRunへ記録する。

- Workerを使う場合は、変更可能なパスをプロンプト（prompt）に列挙し、完了後に親エージェントが開始前後の実差分とソース契約を確認する。
- 読み取り専用エージェントのchanged_filesは自己申告を正本にせず、collector／Git diffで確認する。
- Workerの並列書き込みは、作業領域の分離と変更帰属を実証できるまで行わず、原則直列とする。
- 各ウェーブの実装完了は、文章が存在することではなく、終了条件の証跡があることとする。

共通ロールバック:

- 文書ウェーブは対象本文だけを戻し、仕様／評価基準／製品の意味を戻すための変更を混ぜない。
- Training／自動確認は既存コマンド・検証処理を残し、新しい必須判定で誤検出した場合は原因を修正するまでPASS条件を強化しない。
- ワークフローはテンプレートと生成された教材用コピー（Training Copy）の関係を壊さず、本番ワークフローを変更しない。
- エージェント文書は文書だけを戻し、設定値変更は別L3タスクとロールバック計画に分離する。

### 5.2 W0 — 最新main・SSOT・保護境界の再確認

**担当者**: 親エージェント。**変更対象**: 進行中のRunのPLAN.md、TASKS.md、REPORT.mdへの記録だけ。リポジトリのソースは確認のみ。

実施内容:

1. git fetch相当の読み取り専用確認で現在のmainのSHAを取得し、実装時点のSHAを基準としてRunへ記録する。
2. 今回の再監査で観測したPR #157は、base `main` / `b9087bd93df12a26e7a28a6bd3fe0aebc77acf3d`、head `feat/self-study-curriculum-test-coverage` / `6f8f004c6409acc8423609ab252eeeab3cf8f506`である。この観測値を実装時の基準として固定せず、W0で再取得する。
3. 最新baseの`.codex/config.toml`、`.codex/hooks/*`、`AGENTS.md`、Harness／Safety文書、`scripts/verify`／`scripts/verify.ps1`、関連Contract Testを再確認する。Hook、compact後のSessionStart指示再注入、文章品質ゲート、Hook契約入口等、既に解決済みの変更を「今回のAG2で再実装する」と解釈しない。
4. 既存評価基準、17レッスン、ワークブックの見出し／サンプル、Trainingコマンド、Playwright設定／レポーター（Reporter）、Trainingワークフロー、コピー検証、エージェント契約を読み取り専用で突合する。
5. 引き渡し一式のパス、記録、配置、GitHub Actions後処理の実装方式を、未解決のまま次ウェーブへ渡さない。
6. 現在のブランチ、HEAD、main／origin/main、追跡設定、リモート、存在する場合のPRのhead／base、開始前の変更ファイル一覧を記録する。今回の計画差分とorigin/mainとの差分を分け、fetchが必要な場合はGit安全性リファレンスに従った手順と結果を記録する。
7. 詳細5の確定済みW0契約に従い、Execution Receiptは既存Runner／Reporter／実行結果から自動生成できること、Part 2のTraining Copyは既存の`training:copy:prepare`／`training-copy-source.json`／`training:copy:validate`で正式な40文字SHAを確定できること、GitHub ActionsのRun／Check／Artifactは受講者がブラウザーで確認した参照を通常権限で記録できることを、最新実装と突合する。Git／GitHub基礎学習でForkを使えることは既に確定しているため、C12の代替経路として再判断しない。Owner回答済みの契約は再質問せず、具体的な実装上の衝突がある場合だけ詳細5の停止条件へ戻す。

開始条件: なし。終了条件は、基準SHA、保護パス、既存コマンド、既存ワークフローの実測、Owner回答済み契約とW0確認結果がRunへ記録され、今回のウェーブで変更しない範囲が明示されること。

停止条件: mainを取得できない、既存差分と今回の作業を分離できない、仕様／評価基準の意味変更が必要、または安全なパス／記録／コピー境界を定義できない場合。

### 5.3 AG1 — エージェントの振り分け設計の確認

**担当者**: 親エージェント。**変更対象**: なし。既存エージェント定義・設定は確認のみ。

起動判断はファイル数で決めない。

- 原則として委譲なし: 1ファイルの明確な誤字、局所的で依存のない変更、親エージェントだけで検証可能な軽微な確認。
- 委譲候補: 独立した不確実性が複数ある、仕様・実装・テストの責務が不明、失敗原因の切り分けが必要、重複しない観点を並列確認できる場合。
- 起動しない場合も、親エージェントは理由と対象範囲をRunへ記録する。

| 状態 | 推奨役割 | 分担 |
| --- | --- | --- |
| カリキュラム／文書の複数資料の整合 | code_researcher + implementation_researcher | SSOT、文章、実装影響を分離 |
| テスト／CI／coverage／失敗 | test_investigator + code_researcher | テスト契約、実行経路、最初の失敗を分離 |
| 実装前に複数領域を設計 | code_researcher + test_investigator + implementation_researcher | 重複しない要件／テスト／実装影響 |
| 対象範囲を限定した実装 | implementation_worker 1体 | 親エージェントが確定した厳密な変更対象だけ |
| 指定検証の実行 | quality_gate_runner | 親エージェントがコマンド群を指定し、子エージェントは検証だけ |

運用規則:

- 同時に動かす子エージェントは通常2〜3体とし、親エージェントを残す。max_threadsを増やさない。
- 同じ問いを再投入せず、対象範囲、役割、期待出力を分ける。
- 子エージェントは追加エージェントを起動しない。quality_gate_runnerは修正しない。
- 親エージェントはspawn後も重複しない作業を続ける。
- 調査エージェントは、指定範囲の結果を返すまで自然終了させる。wait_agentのjoinタイムアウトだけを理由に中断／終了（close）しない。
- テスト／ビルド／lint等を実行する子エージェントは、自分のコマンド単位のタイムアウト、プロセスツリー停止、コマンド、終了コード（exit code）、経過時間、タイムアウト理由を管理して返す。親のjoinタイムアウトと混同しない。
- 親エージェントは困っている子エージェントに助言し、解消しない独立観点だけを別範囲の追加エージェントへ派遣する。枠が満杯なら既存調査を打ち切らず、空き後に派遣する。
- 終了（close）は自然終了、明示中止、Run終了、安全異常、記録済みの停止条件の場合だけ行い、同じエージェントを二重に終了（close）しない。

### 5.4 AG2 — エージェントの振り分けをリポジトリ文書へ接続

**担当者**: 親エージェント。**依存関係**: AG1の設計確認。ただしカリキュラム系統の開始条件ではない。

**厳密な変更対象**: なし。最新baseで既存のAGENTS／Harness／Hook／verify契約を読み取り専用で監査し、今回のPlanの接続先と矛盾しないことを確認する。これらのファイルや関連Contract TestをAG2の実装write setへ戻さない。

**変更対象外**: .codex/config.toml、.codex/agents/*.toml、権限／サンドボックス／ラッパー（wrapper）／モデル（model）／スレッド（thread）設定、製品／仕様。

記載内容:

- 委譲を決める条件は独立した不確実性、責務不明、失敗の切り分け、重複しない並列化であり、ファイル数ではない。
- 作業パッケージの参照対象／変更対象／禁止対象、期待出力、join／コマンドのタイムアウト／watchdog／終了（close）、親エージェントの助言・追加派遣・最終判断を記録する。
- 進行中のRunを再利用し、機械管理されるrun.json／Hook JSONL／changed_filesを手編集しない。
- 親エージェントは要件・対象範囲・検証・失敗解釈・修了判定を保持し、子エージェントは対象範囲外の変更や再帰的な委譲をしない。最新baseとの不一致が見つかった場合は、既存の承認範囲で勝手に修正せず、別の承認済みタスクへ分離する。

開始条件: W0で既存エージェント契約を確認し、AG1の判断表と矛盾しないこと。終了条件: 文書と静的検証が既存の権限／サンドボックス／ラッパー（wrapper）境界を壊さず、軽微なタスクの委譲なしも表現すること。

停止条件: L2承認が必要なワークフロー構造変更、既存Harnessとの矛盾、エージェント設定値の変更が必要になった場合。設定変更はこの計画から分離する。

### 5.5 L1 — レッスン共通契約・ワークブック境界

**担当者**: 親エージェント + カリキュラム担当者。

**厳密な変更対象**:

- docs/curriculum/test-automation/00_learning-design.md
- docs/curriculum/test-automation/README.md
- training/workbook/README.md

4つの正本CSVは変更対象外である。

記載内容:

- 17レッスンの目的／入力／実施内容／観測／出力／自己確認／完了条件／フィードバック／復旧方法／引き渡しの共通枠。
- P1-3の複数ケース、TC-CART-101の代表縦断、P1-4の提供サンプル、P1-5のケース引き渡し。
- 作業場所自由と引き渡し／CI境界固定の違い。
- 提供サンプル、学習者作成成果物、検証用フィクスチャの区別。
- 既存CSVの列、ID、空欄条件と、役割／アカウント／初期データ／リセット／操作を既存の`precondition`／`test_condition`／SSOT参照で追跡する方法。
- 引き渡し一式とパス安全の入口（詳細1を正本として参照）。

開始条件: W0のSSOT／ワークブックの見出し／評価基準境界が確認済みであること。
終了条件: 正本CSVに学習者完成行を追加せず、17レッスン本文へ展開可能な共通契約とケース引き渡しが読めること。

停止条件: スキーマ列追加が必要、評価基準の意味変更が必要、編集場所自由と評価受付を両立できない場合。

### 5.6 L2 — P1-2〜P1-6の縦断パイロット

**担当者**: 親エージェント + カリキュラム担当者。L1のケース契約後に開始する。AG1／AG2は必須前提ではない。

**厳密な変更対象**:

- docs/curriculum/test-automation/part1/02_scenario-shop-analysis.md
- docs/curriculum/test-automation/part1/03_test-design-and-automation-selection.md
- docs/curriculum/test-automation/part1/04_playwright-foundations.md
- docs/curriculum/test-automation/part1/05_playwright-e2e-practice.md
- docs/curriculum/test-automation/part1/06_execution-and-failure-analysis.md
- training/playwright/exercises/training-exercise-starter.spec.ts（提供開始用コードの指示だけ。完成答案を入れない）
- training/playwright/failure-exercises/expected-failure.spec.ts（意図的な失敗教材）
- training/playwright/diagnostic-exercises/diagnostic-cart.spec.ts（診断教材）

変更対象外:

- training/workbook/*.csv
- learner-cart.spec.tsなどの完成した受講者コード
- 基準実装、正式なE2E、製品コード、仕様

実施内容:

1. P1-2で複数のリスク／条件の材料を作り、受講者自身のコピー／引き渡しにTARGET-CART-101／RISK-CART-101を記録する。
2. P1-3で複数のテストケース、設計技法、テストレイヤーを考え、そのうちTC-CART-101をP1-5／P1-6へ進む代表ケースとして選ぶ。別ケースで単体（Unit）／統合（Integration）／コンポーネント（Component）等の非UI E2Eレイヤーと理由を最低1件残す。件数を完了条件にしない。
3. P1-5開始時に、ケースID、リスク、BR／AC、前提条件、初期データ／リセット、役割／アカウント、操作、期待結果、レイヤー、ツールが、P1-3の同じワークブック行／SSOT参照から読めることを開始条件にする。
4. P1-5は、正常系、境界／異常系、明示的なSeed Scenario／Reset、状態変更、Desktop Web、受講者作成ExerciseのMobile Web実行、WorkbookのTest Caseと実行結果の対応を含む現在の練習範囲を、件数を固定せずに学習者が作成したコードへ変換する。明示的な初期データ／リセット、意味のある操作／要素特定／検証、実行記録／証跡も揃える。開始用コード／基準実装／別ケースの証跡は代用しない。TC-CART-101はこの範囲を追跡する代表ケースである。
5. P1-6は意図的な失敗教材、決定的な診断教材、学習者ケースの自然なFailureを分ける。学習者ケースでFailureが起きた場合は、初回記録 → 原因／分類 → 対応／改善 → 修正後の同一対象の再実行を記録する。最初からPASSした学習者ケースを意図的に壊すことは要求せず、その場合は診断教材をC09の標準経路にする。

開始条件: L1のケース／ワークブック／引き渡し契約と、必要な既存の初期データ／リセット入口が確認済みであること。
終了条件: 講師向け資料なしの受講者一巡確認でP1-2〜P1-6を実際に行い、ケース引き渡し、コード、リセット、検証、診断対象の初回／修正後の記録、証跡のすべてを次レッスンへ渡せること。診断対象は自然な学習者Failureまたは診断教材であり、学習者ケースの初回FAILそのものを必須にしない。
停止条件: 正本CSVへ答えを追加しないと教材が成立しない、P1-5開始時に同じケース値を再現できない、既存Training境界を壊す必要がある場合。

### 5.7 L3 — 全17レッスンへの展開

**担当者**: 親エージェント + カリキュラム担当者。L2の受講者一巡確認の結果を受けて開始する。

**厳密な変更対象**:

- P1-01、P1-07、P1-08、P1-09の4本文
- P2-01〜P2-08の8本文

P1-02〜P1-06の5本文、README、00_learning-designはこの一括変更で重複編集しない。

既存のtests/contracts/training-curriculum.test.tsは、17レッスンの共通契約、リンク、Workbook／Training資材の構造確認を必要最小限拡張する場合の対象とする。受講者の理解や自由記述の意味は機械採点しない。

実施内容:

- 17行監査表の各項目を本文へリンクする。
- P1-7／P2-6はNativeの選択、スキップ、復帰を示す。
- P1-8はP1-4〜P1-6で実際に観察した保守上の問題から改善を選ぶ。
- P1-9、P2-8は前段の成果物・証跡・記録を入力として受け取る。
- 第2部（Part 2）のP2-01〜P2-03のGit／GitHub基礎学習では、運営側が用意したTraining Copyまたは学習者自身のForkを利用できる。C12を含むP2-04〜P2-08のTraining CIとPart 2最終修了は、正式なsource SHAをHEADに固定したTraining Copyのみを正式経路とする。Fork上のRun／Check／ArtifactはC12／Part 2修了の証跡へ読み替えない。Training Copyが用意できない場合は、基礎学習まで継続し、C12／Training CI以降をBLOCKED／NOT_RUNとする。repository作成・管理やworkflow権限設定の準備を受講者へ必須にしない。
- 講師向け参考資料は必須経路にせず、環境・権限の補足に限定する。

開始条件: L2のP1-2〜P1-6が講師向け資料なしの受講者一巡確認でPASSし、17行の契約に未確認セルがないこと。
終了条件: Common、Nativeの選択／スキップ、第2部（Part 2）の各経路を講師向け資料なしで通読し、各レッスンの入力から引き渡しまで指示できること。17レッスンの共通契約を既存Contract Testまたはその必要最小限の拡張で構造確認し、意味理解はV1へ分ける。
停止条件: 本文が仕様／評価基準と矛盾する、入力を講師向け資料からしか取得できない、または経路境界を曖昧にする場合。

### 5.8 T1 — 受講者向け修了確認の契約

**担当者**: 親エージェント + Training担当者。**依存関係**: W0と、修了確認に必要なL1／L2のレッスン契約。L3、C1、AG1／AG2の完了は前提にしない。

**厳密な参照対象**:

- 詳細1のレッスン／ワークブック／引き渡し契約、詳細3の記録契約。
- training/workbook/README.md、既存Trainingコマンド、Playwright設定、開始用コード／基準実装／診断教材／意図的失敗教材の実装。
- scripts/training/prepare-training-copy.ts、scripts/training/validate-training-copy.ts、training/github-actions/training-ci.yml、関連契約テスト。

**厳密な変更対象**:

- package.json（正式コマンドのスクリプト入口（script entry）を1件追加）。
- scripts/training/check-completion.ts（新規の薄いローカルコマンド）。
- tests/contracts/training-completion.test.ts（引き渡し／修了確認契約の正常系／不正系テスト）。

**変更対象外**: 正本ワークブックCSV、学習者作成コード、製品／仕様／正式な回帰テスト、既存Playwright実行コマンド、Trainingワークフロー、エージェント設定。Trainingワークフローへの接続はT2の責務とする。

実装する正式コマンドは次で固定する。

    corepack pnpm run training:completion:check -- --mode <common|part2> --root <handoff-root>

T1は、詳細1の固定Handoff root、既存4 CSV、学習者コード、Execution Receipt、Evidence、self-checkを入力として受け取り、修了確認記録（Completion Receipt）を判定後に生成する。自分でPlaywrightを実行したり、修了確認記録を入力として自己参照したりしない。自己確認はパスと存在だけを確認し、理解の意味を機械的に採点しない。ケースとコードの対応には、実装時W0で確認した既存の`Test Case ID`、Workbookの`implementation_path`、テストタイトル（test title）、注釈／メタデータ（annotation／metadata）、Receiptの`case_id`や既存参照を使う。新しい対応表、付随／sidecar Manifest、採点用Manifest、独自Evidence URIは追加せず、既存情報で対応できない場合は新しい追跡基盤を作らず詳細5の停止条件へ戻す。特定のファイル名や検証構文は強制しない。

**開始条件**: W0の現行実測、Owner回答済みの3決定、L1／L2のケース／引き渡し値、正式コマンド、修了確認記録スキーマ、既存実行情報とのケース対応がRunへ記録され、具体的な契約衝突がないこと。

**終了条件**: ローカルで上記コマンドが実行でき、PASS／INCOMPLETE／FAIL／BLOCKED／NOT_RUNを区別し、次のような機械的に安定した条件を判定できること。固定Handoff rootのパス安全、既存4 CSV、Workbookスキーマ、Case ID、既存情報からのCaseと学習者コードとReceiptの追跡、学習者コードの存在と既知の開始用コード境界、明示的なReset契約、Assertionの存在、`expect(true)`等の既知の無意味パターン、実在するExecution Receipt、実際の実行とexit code／result、Evidenceの存在、NOT_RUNでないことを確認する。既存commandが提供開始用コードを含むsuite全体を実行する場合でも、既存情報から対応付けた学習者コードの個別実行結果がなければ、開始用コードやsuite全体のPASSだけでPASSにしない。Part 2で記録されたGitHub Run ID／Check／Artifactは、参照の形式、ローカルに存在する記録、Receiptとの対応までを確認するが、GitHub上の実在性、最終success、Checkの結論、Artifactの現在の存在や別RunでないことをAPIなしに独立証明したとは扱わない。任意のPlaywrightコードと自然言語の`expected_result`から、業務上のAssertionの十分性、期待結果との意味的一致、最適なLocator、設計理由、Risk／Layerの判断、修正理由の技術的妥当性を完全には判定しない。これらはWorkbook、自己確認、各Lessonの最低回答基準、V1で確認する。Completion Receipt自身なしで判定でき、正常系／不正系の契約テストが自動確認による理解の過大評価を防ぐこと。

**ロールバック**: package.jsonのスクリプト（script）、check-completion.ts、専用契約テストだけを戻す。既存Trainingコマンド、正本ワークブック、既存Runの記録は上書きしない。Native／iOSの選択課程は既存Native契約で扱い、この新しい受講者向け修了確認の`mode`へ混ぜない。

### 5.9 T2 — 実行記録・教材用コピー（Training Copy）への配置・CI接続

**担当者**: 親エージェント + Training／CI担当者。**依存関係**: T1の契約、W0のPlaywright出力・ワークフロー・コピー検証の実測。C1、AG1／AG2、L3の完了は前提にしない。

**厳密な参照対象**:

- T1の修了確認コマンド／スキーマ、詳細1・3の引き渡し／記録／CIデータフロー。
- playwright.training.config.ts、package.jsonのtraining:webコマンド、training/playwright/**、既存レポーター（Reporter）の出力。
- scripts/training/prepare-training-copy.ts、scripts/training/validate-training-copy.ts、scripts/validate-curriculum.ts、scripts/training/workflow-contract.ts、training/github-actions/training-ci.yml、既存CI契約テスト。

**厳密な変更対象**:

- package.json（既存の`training:web:exercise`／`training:web:mobile:exercise`を`validate:curriculum`の要求どおり直接Playwright実行のまま維持し、Receipt生成またはmaterializeの追加入口だけを必要最小限追加）。
- scripts/training/run-playwright-with-receipt.ts（既存の実行経路だけでは取得できない機械情報を既存Playwright実行へ結合する必要がW0で確認された場合だけの薄いadapter。独立した新しい実行ランナー（runner）にしない）。
- scripts/training/materialize-training-handoff.ts（検証済み一式を正式なsource SHAをHEADにした教材用コピー（Training Copy）へ配置する薄い処理）。
- tests/contracts/training-execution-receipt.test.ts（記録生成と実行事実の契約）。
- tests/contracts/training-copy-handoff.test.ts（配置、パス、安全境界、元ソースSHAの契約）。
- training/github-actions/training-ci.yml、scripts/training/workflow-contract.ts、およびその関連Contract Test（既存の直接実行入口を壊さず、Training WebのReceipt入口をworkflowへ接続する場合だけ最小差分）。

**変更対象外**: training/workbook/*.csv、製品／仕様／正式な回帰テスト、基準実装／失敗の意味変更、training-native-ci.yml、エージェント設定、追加GitHub Permission／Token。既存Trainingコマンドのテスト対象範囲、pull_request条件、`contents: read`、成果物アップロード順を維持する。

Execution Receiptは、Owner回答済みの方針どおり、可能な限り既存Runner／Reporter／実行結果から、実際の実行後に自動生成する。W0では、既存の`training:web:exercise`／`training:web:mobile:exercise`の対象範囲、Reporter出力、実行結果、既存のケース対応情報を突合する。現行commandが`training/playwright/exercises`全体を走らせる場合、提供開始用コード（`training-exercise-starter.spec.ts`）だけの成功、基準実装の成功、またはsuite全体の成功を学習者作成テストの実行証拠として扱わず、既存情報から対応付けた学習者コードのテスト結果を個別に確認できることを必須にする。既存の実行経路へ機械情報を結合する薄いadapterが必要な場合も、既存Playwrightを置き換えず、独立した新しいRunner、Receipt状態DB、手書きReceiptは追加しない。必要な情報が既存経路とその最小結合で成立しない場合はT2を停止し、具体的な不足と既存契約で解決できない理由を記録する。Part 2のTraining Copy実行では、`training:copy:prepare`が確定した正式な40文字SHAを記録し、Part 1／CommonのZIP等でSHAがない実行では架空値を作らず、`source_sha`を省略可能とする。修了確認コマンドをReceipt生成者にしない。

配置処理は、詳細3で定義した一式を、正式な完全SHAをHEADにした既存のTraining Copyの`training/playwright/exercises/learner`配下、`training/workbook`、`learner-handoff/evidence`、`learner-handoff/receipts`、`learner-handoff/self-check`へ配置し、既存の`training-copy-source.json`（source metadata）／既存スキーマ／既存情報によるケース追跡を検証する。新しい独立Manifest、対応表、Evidence URIを追加しない。作業場所は自由のまま、Training Copy内の評価境界だけを固定する。Git／GitHub基礎学習でForkを使った場合も、C12／Training CIへ進む前にTraining Copyへ移り、ForkをT2のC12成功経路へ含めない。`training:copy:prepare`が作る既知の差分（元のworkflowをarchiveしたもの、activeなTraining workflow、`training-copy-source.json`）と、materializeが作る学習者差分（4つのCSV、learner code、Evidence／Receipt／self-check）を分け、予期しないsource差分を別に検出する。

**開始条件**: T1の正常系／不正系契約、Owner回答済みのW0契約、既存Playwright出力／レポーター（Reporter）／ワークフローのアップロード順、対象が新規であること、Part 2のTraining Copy作成に使う40文字の小文字完全SHAを既存のGit repositoryから解決できること。Part 1／CommonのHandoffに元ソースSHAがあること、Part 1とPart 2のrevisionが一致することは開始条件にしない。

**終了条件**: `training:copy:prepare`直後に`training:copy:validate`を実行して、HEAD、`training-copy-source.json`、active workflowの許可リスト、templateとの一致を確認できること。その後、学習者成果をTraining Copyへmaterializeし、再度`training:copy:validate`を実行して同じHEAD／`training-copy-source.json`／workflow契約を確認できること。後者は学習者成果によるworking tree差分を理由に失敗させず、prepareの既知のprovisioning差分、materializeの学習者差分、予期しないsource差分を区別して記録する。Part 1とPart 2のrevisionが異なること自体はFAILにせず、materialize後にWorkbookの構造、Test Case ID、既存情報によるケース対応、現在のTraining Copy上で解決できるPlaywrightコード、必須Training command、Receipt／Evidence参照、必要な型確認／契約テスト、提供サンプルと学習者成果の分離を確認する。互換性問題が出た場合は、壊れた成果物、原因となる変更、既存形式での最小修正可否を確認し、自動変換frameworkを新設しない。学習者作成テストの実行から実在する実行記録が生成され、デスクトップWeb／必要範囲のモバイルWebの既存対象範囲を壊さず、training-ci.ymlが記録／レポート／トレース等を既存の最小権限で成果物（Artifact）へ含めること。GitHub上のRun／Check／Artifactの最終状態・実在性はローカル検証の証明範囲外であり、受講者がブラウザーで確認した参照と、ローカルに保存した参照の形式・対応を別に記録する。第2部（Part 2）の修了確認記録はワークフロー完了後にローカルで生成できること。ForkはこのT2終了条件およびC12成功経路に含めない。

**ロールバック**: ラッパー（wrapper）／配置コマンド、パッケージスクリプト（package script）、専用契約テスト、training-ci.ymlの記録接続だけを戻す。既存の教材用コピー（Training Copy）や学習者一式を自動削除・上書きしない。

### 5.10 C1 — AC／既存テストの読み取り専用の不足調査

**担当者**: 親エージェント + テスト担当者。W0後に独立して実施する。T1／T2の必須依存ではない。

**変更対象**: 製品／仕様／正式な回帰テスト／Trainingソースへの変更なし。AC対応表、最初の失敗、判断、実行（Run）の証跡だけを進行中のRunのREPORTへ記録する。

実施内容:

- 既存の仕様（Spec）、既存の統合テスト（Integration Test）、Trainingケース、カリキュラムで使うACを読み取り専用で突合する。
- Cartの在庫・購入上限・購入不可明細、Reviewの所有者・配達・公開状態などを、既存テストレイヤーで確認済み／別レイヤー／対象外理由へ分類する。
- コメント不足は、初期データ、Clock、リセット、明らかでない期待結果、仕様上の理由が必要な箇所だけを候補にする。
- coverageの数字だけで十分性を判定しない。
- 追加の製品統合テスト（Product Integration Test）が、カリキュラムの正しい期待結果を保証するために必要だと具体的に確認できた場合だけ、別の承認済みタスクへ分離する。C1からT1／T2へ直接追加しない。

終了条件: 未検証条件ごとに既存テスト、別レイヤー、対象外理由、または別タスクのいずれかが記録され、製品変更を今回の主経路へ持ち込まないこと。

### 5.11 AG3／V1への接続

**AG3担当者**: 親エージェント。**厳密な参照対象**: AG1／AG2のRun記録、変更対象の実差分、AGENTS.md、既存Harness／codex-task／collector／hook契約、AG3自身の検証結果。**厳密な変更対象**: なし。不正系フィクスチャの一時ログは分離ルートへ出し、進行中のRunには要約とリポジトリ相対の証跡参照だけを記録する。既存HookのGit安全ポリシーG3の契約テストを、AG3の検証済み証拠として流用しない。

AG3の開始条件はAG1 → AG2の終了条件が完了していること。L3／T2／V1の完了は前提にしない。終了条件は、エージェントのライフサイクル、対象範囲、読み取り専用、再帰的な委譲、子コマンドのタイムアウト、親のjoin、終了（close）、ソース完全性を詳細4の安全な実行（Run）検証で確認し、FAIL／BLOCKEDをPASSへ変換せずAgent運用の判定として記録すること。AG3でソースを意図的に変更する不正系ケースは、実際の作業ツリーではなく一時ディレクトリ、使い捨て作業ツリー、フィクスチャ、模擬Runで実施する。

**V1担当者**: 親エージェント + カリキュラム担当者。**厳密な変更対象**: 進行中のRunの一巡確認／検証証跡だけ。**開始条件**: カリキュラム系統のL3と修了確認／Training系統のT2が完了していること。AG3のPASSは必須依存にしない。**終了条件**: 詳細4の講師向け資料なしの受講者一巡確認を開発時の受入検証として通過し、Common／Native選択／第2部（Part 2）の選択境界、引き渡し、失敗時の停止条件を記録すること。リンクの存在やコマンドの記載だけではPASSにしない。AG3の結果は別途Agent運用の判定として最終報告する。
