# 詳細2：影響範囲・ウェーブ依存関係・変更対象

[← インデックスへ戻る](../2026-09-15_213247_self-study-agent-orchestration.md)

> このファイルだけがウェーブ依存関係の正本である。詳細1はレッスン／引き渡し、詳細3は記録／CI、詳細4は検証方法を定義するが、ウェーブ順序を再定義しない。

## 4. 影響範囲

### 4.1 変更候補

変更候補は、下記ウェーブの厳密な変更対象にさらに限定する。

- カリキュラム: docs/curriculum/test-automation のREADME、設計、17件の正本レッスン本文。
- ワークブックの境界: training/workbook/README.mdのみ。4つの正本CSVは提供サンプル／テンプレートとして保護する。
- Training: 既存の開始用コード、意図的失敗／診断フィクスチャ、受講者向け修了確認、必要最小限の実行記録出力、Trainingワークフローのテンプレート。
- 第2部（Part 2）: 第2部本文、教材用コピー（Training Copy）への引き渡し配置手順、Trainingワークフローの説明。
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
- エージェントの権限、サンドボックス、wrapper、model、thread、max_threads、max_depthを変更しない。
- Git操作・外部メタデータ変更は今回の計画修正では行わない。

## 5. 変更方針

### 5.0 ウェーブ依存関係の唯一の正本

次のグラフ以外に、ウェーブの順序や必須依存を別ファイルで定義しない。

    W0: 最新main / SSOT / 保護パス / 担当者ゲート
      ├─ カリキュラム系統: L1 → L2 → L3
      ├─ 修了確認系統: 必要なレッスン契約（L1とL2の縦断契約）確定後 → T1 → T2
      ├─ エージェント系統: G1 → G2 → G3
      └─ C1: AC／既存テストの読み取り専用の不足調査（W0後、主経路から独立）

    G3: G2完了、かつ対象実装ウェーブ（L3／T2）完了後のエージェントのライフサイクル／ソース完全性検証
      V1: L3／T2（選択した系統）の完了 + G3 → 講師向け資料なしの受講者一巡確認・品質ゲート・引き渡しの最終判定

依存関係の読み方を固定する。

- L1はG1／G2を待たずに開始できる。L2もG1／G2をカリキュラム開始の前提にしない。
- T1はL3全体やC1の製品テスト追加を待たず、L1とL2で受講者成果・ケース引き渡しの必要契約が確定し、W0で記録方式が決まった時点で開始できる。
- T2はT1の記録契約と、教材用コピー（Training Copy）への安全な配置方式が確定してから開始する。
- C1はT1／T2の必須依存ではない。製品統合テスト（Product Integration Test）を追加する場合は、この計画と別の承認済みタスクに分離する。
- G1／G2はカリキュラム／修了確認の学習開始を妨げない。G3はG1 → G2のエージェント系統が完了し、対象実装ウェーブ（L3／T2）が完了した後に行う。C1はG3／V1の必須前提にしない。V1が最終判定を行う。
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
2. Plan再監査時点の観測値は origin/main = 084835559ba284c6fb6c5122bdb19140a57d64c6（2026-09-16のExpo推奨依存同期）である。ただし実装時はこの値を再利用せず再取得する。
3. 現在のmainとの差分を確認し、Expo依存のようにカリキュラム／Training／エージェント契約へ影響しない変更は「確認済み・関連影響なし」と記録する。
4. 既存評価基準、17レッスン、ワークブックの見出し／サンプル、Trainingコマンド、Playwright設定／レポーター（Reporter）、Trainingワークフロー、コピー検証、エージェント契約を読み取り専用で突合する。
5. 引き渡し一式のパス、記録、配置、GitHub Actions後処理の実装方式を、未解決のまま次ウェーブへ渡さない。
6. 現在のブランチ、HEAD、main／origin/main、追跡設定、リモート、存在する場合のPRのhead／base、開始前の変更ファイル一覧を記録する。今回の計画差分とorigin/mainとの差分を分け、fetchが必要な場合はGit安全性リファレンスに従った手順と結果を記録する。

開始条件: なし。終了条件は、基準SHA、保護パス、既存コマンド、既存ワークフローの実測、担当者判断がRunへ記録され、今回のウェーブで変更しない範囲が明示されること。

停止条件: mainを取得できない、既存差分と今回の作業を分離できない、仕様／評価基準の意味変更が必要、または安全なパス／記録／コピー境界を定義できない場合。

### 5.3 G1 — エージェントの振り分け設計の確認

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

### 5.4 G2 — エージェントの振り分けをリポジトリ文書へ接続

**担当者**: 親エージェント。**依存関係**: G1の設計確認。ただしカリキュラム系統の開始条件ではない。

**厳密な変更対象**:

- AGENTS.md
- docs/reference/codex-implementation-harness.md
- .codex/templates/PLAN.md
- scripts/verify と scripts/verify.ps1（安定した静的契約の検証が必要な場合だけ）
- 上記を検証する既存Contract / verifyの不足箇所（必要な範囲だけ）

**変更対象外**: .codex/config.toml、.codex/agents/*.toml、権限／サンドボックス／ラッパー（wrapper）／モデル（model）／スレッド（thread）設定、製品／仕様。

記載内容:

- 委譲を決める条件は独立した不確実性、責務不明、失敗の切り分け、重複しない並列化であり、ファイル数ではない。
- 作業パッケージの参照対象／変更対象／禁止対象、期待出力、join／コマンドのタイムアウト／watchdog／終了（close）、親エージェントの助言・追加派遣・最終判断を記録する。
- 進行中のRunを再利用し、機械管理されるrun.json／Hook JSONL／changed_filesを手編集しない。
- 親エージェントは要件・対象範囲・検証・失敗解釈・修了判定を保持し、子エージェントは対象範囲外の変更や再帰的な委譲をしない。

開始条件: W0で既存エージェント契約を確認し、G1の判断表と矛盾しないこと。終了条件: 文書と静的検証が既存の権限／サンドボックス／ラッパー（wrapper）境界を壊さず、軽微なタスクの委譲なしも表現すること。

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

**担当者**: 親エージェント + カリキュラム担当者。L1のケース契約後に開始する。G1／G2は必須前提ではない。

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
4. P1-5は学習者が作成したコードへケースを変換し、明示的な初期データ／リセット、意味のある操作／要素特定／検証、デスクトップWeb／必要範囲のモバイルWeb、実行記録／証跡を作る。開始用コード／基準実装／別ケースの証跡は代用しない。
5. P1-6は意図的な失敗教材と学習者自身の失敗を分け、初回失敗 → 原因／分類 → 対応／改善 → 修正後PASSを同じケースIDで記録する。

開始条件: L1のケース／ワークブック／引き渡し契約と、必要な既存の初期データ／リセット入口が確認済みであること。
終了条件: 講師向け資料なしの受講者一巡確認でP1-2〜P1-6を実際に行い、ケース引き渡し、コード、リセット、検証、初回／修正後の記録、証跡のすべてを次レッスンへ渡せること。
停止条件: 正本CSVへ答えを追加しないと教材が成立しない、P1-5開始時に同じケース値を再現できない、既存Training境界を壊す必要がある場合。

### 5.7 L3 — 全17レッスンへの展開

**担当者**: 親エージェント + カリキュラム担当者。L2の受講者一巡確認の結果を受けて開始する。

**厳密な変更対象**:

- P1-01、P1-07、P1-08、P1-09の4本文
- P2-01〜P2-08の8本文

P1-02〜P1-06の5本文、README、00_learning-designはこの一括変更で重複編集しない。

実施内容:

- 17行監査表の各項目を本文へリンクする。
- P1-7／P2-6はNativeの選択、スキップ、復帰を示す。
- P1-8はP1-4〜P1-6で実際に観察した保守上の問題から改善を選ぶ。
- P1-9、P2-8は前段の成果物・証跡・記録を入力として受け取る。
- 第2部（Part 2）はアカウント／コピー／ブランチ／PR／確認（Check）／成果物（Artifact）を受講者が自分で準備する。
- 講師向け参考資料は必須経路にせず、環境・権限の補足に限定する。

開始条件: L2のP1-2〜P1-6が講師向け資料なしの受講者一巡確認でPASSし、17行の契約に未確認セルがないこと。
終了条件: Common、Nativeの選択／スキップ、第2部（Part 2）の各経路を講師向け資料なしで通読し、各レッスンの入力から引き渡しまで指示できること。
停止条件: 本文が仕様／評価基準と矛盾する、入力を講師向け資料からしか取得できない、または経路境界を曖昧にする場合。

### 5.8 T1 — 受講者向け修了確認の契約

**担当者**: 親エージェント + Training担当者。**依存関係**: W0と、修了確認に必要なL1／L2のレッスン契約。L3、C1、G1／G2の完了は前提にしない。

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

    corepack pnpm run training:completion:check -- --mode <common|part2|native> --root <handoff-root>

T1は、詳細1のパス／スキーマ／ケース追跡情報を読み、実行記録（Execution Receipt）を実行済み入力として受け取り、修了確認記録（Completion Receipt）を判定後に生成する。自分でPlaywrightを実行したり、修了確認記録を入力として自己参照したりしない。自己確認はパスと存在だけを確認し、理解の意味を機械的に採点しない。ケースとコードの対応には、W0で選んだテストタイトル（test title）、注釈／メタデータ（annotation／metadata）、または付随マニフェストのいずれかを使い、選択方式を記録／引き渡しへ記録する。特定のファイル名や検証構文は強制しない。

**開始条件**: W0の現行実測、L1／L2のケース／引き渡し値、正式コマンド、修了確認記録スキーマ、ケース対応方式がRunへ記録されていること。

**終了条件**: ローカルで上記コマンドが実行でき、PASS／INCOMPLETE／FAIL／BLOCKED／NOT_RUNを区別し、実在する実行記録／証跡、自己確認の存在、ケース追跡情報、学習者作成コード、初期データ／リセット／意味のある検証の条件を判定できること。修了確認記録自身なしで判定でき、正常系／不正系の契約テストが自動確認による理解の過大評価を防ぐこと。

**ロールバック**: package.jsonのスクリプト（script）、check-completion.ts、専用契約テストだけを戻す。既存Trainingコマンド、正本ワークブック、既存Runの記録は上書きしない。

### 5.9 T2 — 実行記録・教材用コピー（Training Copy）への配置・CI接続

**担当者**: 親エージェント + Training／CI担当者。**依存関係**: T1の契約、W0のPlaywright出力・ワークフロー・コピー検証の実測。C1、G1／G2、L3の完了は前提にしない。

**厳密な参照対象**:

- T1の修了確認コマンド／スキーマ、詳細1・3の引き渡し／記録／CIデータフロー。
- playwright.training.config.ts、package.jsonのtraining:webコマンド、training/playwright/**、既存レポーター（Reporter）の出力。
- scripts/training/prepare-training-copy.ts、scripts/training/validate-training-copy.ts、training/github-actions/training-ci.yml、既存CI契約テスト。

**厳密な変更対象**:

- package.json（training:web:exercise／training:web:mobile:exerciseの実行入口、およびtraining:copy:materializeの実行入口を必要最小限更新）。
- scripts/training/run-playwright-with-receipt.ts（既存Playwrightを呼び出す薄いラッパー（wrapper）。大きな実行ランナー（runner）を作らない）。
- scripts/training/materialize-training-handoff.ts（検証済み一式を履歴がクリーンな教材用コピー（Training Copy）へ配置する薄い処理）。
- tests/contracts/training-execution-receipt.test.ts（記録生成と実行事実の契約）。
- tests/contracts/training-copy-handoff.test.ts（配置、パス、安全境界、元ソースSHAの契約）。
- training/github-actions/training-ci.yml（既存Trainingコマンドの記録／成果物（Artifact）接続を明示する最小差分）。

**変更対象外**: training/workbook/*.csv、製品／仕様／正式な回帰テスト、基準実装／失敗の意味変更、training-native-ci.yml、エージェント設定、追加GitHub Permission／Token。既存Trainingコマンドのテスト対象範囲、pull_request条件、`contents: read`、成果物アップロード順を維持する。

方式はW0で既存レポーター（Reporter）を再利用できるか確認したうえで、コマンド（command）、終了コード（exit_code）、実行コンテキストまで必要なため、既存Playwrightを呼び出す薄いラッパー（wrapper）を既定候補とする。ラッパーは実行前後の元ソースSHA、ケース対応、環境、成果物（Artifact）参照を記録し、失敗時も実際の終了コード（exit code）を保持する。修了確認コマンドをラッパーの代わりに記録生成者にしない。

配置処理は、詳細3で定義した一式を既存のtraining/playwright/exercises/learner配下、training/workbook、learner-handoff/evidence、learner-handoff/receipts、learner-handoff/self-checkへ配置し、元ソースSHA／マニフェスト／スキーマ／ケース追跡情報を検証する。作業場所は自由のまま、教材用コピー（Training Copy）内の評価境界だけを固定する。

**開始条件**: T1の正常系／不正系契約、W0のPlaywright出力／レポーター（Reporter）／ワークフローのアップロード順、対象が新規であること、元ソースSHAが解決できること。

**終了条件**: 学習者作成テストの実行から実在する実行記録が生成され、デスクトップWeb／必要範囲のモバイルWebの既存対象範囲を壊さず、配置後の履歴がクリーンなコピーをtraining:copy:validateで検証でき、training-ci.ymlが記録／レポート／トレース等を既存の最小権限で成果物（Artifact）へ含めること。第2部（Part 2）の修了確認記録はワークフロー完了後にローカルで生成できること。

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

### 5.11 G3／V1への接続

**G3担当者**: 親エージェント。**厳密な参照対象**: G1／G2のRun記録、変更対象の実差分、AGENTS.md、既存Harness／codex-task／collector／hook契約、実装ウェーブの検証結果。**厳密な変更対象**: なし。不正系フィクスチャの一時ログは分離ルートへ出し、進行中のRunには要約とリポジトリ相対の証跡参照だけを記録する。

G3の開始条件は、G1 → G2と、対象実装ウェーブ（L3／T2）の終了条件が完了していること。終了条件は、エージェントのライフサイクル、対象範囲、読み取り専用、再帰的な委譲、子コマンドのタイムアウト、親のjoin、終了（close）、ソース完全性を詳細4の安全な実行（Run）検証で確認し、FAIL／BLOCKEDをPASSへ変換せず記録すること。G3でソースを意図的に変更する不正系ケースは、実際の作業ツリーではなく一時ディレクトリ、使い捨て作業ツリー、フィクスチャ、模擬Runで実施する。

**V1担当者**: 親エージェント + カリキュラム担当者。**厳密な変更対象**: 進行中のRunの一巡確認／検証証跡だけ。**開始条件**: 対象系統のL3／T2とG3が完了していること。**終了条件**: 詳細4の講師向け資料なしの受講者一巡確認を通過し、Common／Native選択／第2部（Part 2）の選択境界、引き渡し、失敗時の停止条件を記録すること。リンクの存在やコマンドの記載だけではPASSにしない。
