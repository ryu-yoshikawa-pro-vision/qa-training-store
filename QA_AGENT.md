# Agentic QA運用規約

この文書は、Scenario ShopにおけるAgentic QAのリポジトリ固有の実行責任、機械契約（Machine Contract）、成果物（artifact）の紐付け、テストハーネス統合を定義します。ポータブルな実行モード（Mode）の選択、探索憲章（Charter）、カバレッジ（Coverage）、探索予算（Budget）、停止条件（Stop Condition）、証拠（Evidence）、指摘事項（Finding）、確定処理（finalization）の意味については、[`exploratory-qa` Skill](.agents/skills/exploratory-qa/SKILL.md) およびパッケージ内のローカル参照を正本とします。

製品の正式仕様（Normative Product Specification）は `docs/spec/`、機械契約の実装上の正本は `scripts/agentic-qa/contracts.ts` です。

## 実行責任

- 主担当QA実行者: Coding Agent + Exploratory QA Skill。
- ランタイムとの対話: Coding Agentランタイムが提供するPlaywright-MCP / Maestro-MCPまたは同等の機能（Capability）。
- 補助ハーネス（Supporting Harness）: `scripts/agentic-qa/**`。
- ハーネスの責務: 事前準備（Preparation）、検証（validation）、隔離性の確認（isolation verification）、成果物の完全性担保（artifact integrity）、評価（evaluation）、採点（scoring）。
- ハーネスはCoding Agentの起動（launch）、ラッピング（wrap）、オーケストレーション（orchestrate）、再試行（retry）、管理（manage）を行いません。

実行の流れは `Coding Agent + Skill → Runtime → qa-findings.json → Supporting Harness` です。QAの実行中は製品コード（Product Code）を変更せず、指摘事項（Finding）が確定した後にのみ修正ワークフロー（Repair workflow）へ明示的に切り替えます。

## リポジトリの実行モード契約

- Normalモード: 対象の実行回（Run）における `.codex/runs/<run_id>/qa-charter.json` を入力とし、ソース作業ツリー（Source Working Tree）は読み取り専用（Readonly）として扱います。証拠（Evidence）は `.codex/runs/<run_id>/` および `.artifacts/` へ保存します。
- Gray-box Scenario Shopマッピング: シナリオ（Scenario）およびシード（Seed）の許可リスト（allowlist）は、`src/seeds/metadata.ts` の `SCENARIO_METADATA` と型定義を正本として参照し、一覧をこの文書へ複製しません。実データの生成は `src/seeds/scenarios.ts`、リセットおよびテスト制御（Reset / Test Control）は `src/test-controls/` が具体的な実装です。機械契約の `allowed_runtime_controls` は `seed_reset`、`clock`、`payment_delay`、`deep_link`、`app_restart` を受け付け、DOM、アクセシビリティ（Accessibility）、コンソール（Console）、絞り込みログ（Narrow Log）などの観察証拠（Observation Evidence）は `evidenceTypeSchema` へバインドします。ランタイム機能（Runtime capability）は、本リポジトリのPlaywright-MCP / Maestro-MCPまたは同等の機能マッピングを使用します。
- Black-box Scoredモード: `training/agentic-qa/challenges/<challenge-id>/challenge.json`、受講者向け安全バンドル（learner-safe Bundle）、ランブック（Runbook）、ハッシュ検証済みの `training/agentic-qa/skills/scored-v1.md` スナップショット、カノニカルランナー入力（Canonical Runner Input）、ソース非含有の準備済み検証対象（Source-free Prepared Target）のみを、ランナーから参照可能な境界（Runner-visible boundary）へ渡します。新規のCoding Agentセッション（Fresh Coding Agent Session）、信頼されたセッション識別情報（trusted session identity）、ツールの完全隔離（Tool Isolation）、信頼された実際のツールスコープ（trusted Actual Tool Scope）が必要です。ランナーは `.agents/skills/**`、`QA_AGENT.md`、ソースコード、正解（Answer Key）、パッチ（Patch）、過去の実行成果物（prior run artifact）を読み取りません。

NormalモードおよびGray-boxモードの指摘成果物（finding artifact）は、`charter_id` と `working_tree_snapshot`（before / after / comparison）を保持し、`challenge_id`、`benchmark_revision`、`runtime_variant_id`、`runner_profile` は `null` となります。Black-box Scoredモードでは `charter_id` が `null` となり、課題（Challenge）、ベンチマークリビジョン（Benchmark Revision）、ランタイムバリアント（Runtime Variant）、ランナープロファイル（Runner Profile）を記録します。モード間で結果や測定指標（Metric）を混在させてはなりません。

公式採点実行（Official Scored実行）に必要な新規セッション、信頼された識別情報、ツール隔離、実際のツールスコープを提供できない場合は `BLOCKED` とします。リポジトリ独自のランナー、LLMラッパー、セッションマネージャー、MCPオーケストレーションなどでこれを補完してはなりません。

静的サーバー（Static server）の `Sec-Fetch-Dest` は偽装可能なブラウザのUX情報に過ぎず、セキュリティ境界（Security Boundary）ではありません。正本となる基準は、ホストにより信頼されたツール隔離（Host-trusted Tool Isolation）と、実配信ランタイムに対するリソースネガティブプローブ（Resource Negative Probe）です。

## 機械契約

- JSONおよびZodスキーマ（schema）の正本は `scripts/agentic-qa/contracts.ts` です。
- 各JSONは `schema_version: 1` を保持し、バリデータ（validator）を通過しない入力は実行前の失敗（Failure）となります。
- `spec_refs[]` は `BR-<AREA>-NNN`、`AC-<AREA>-NNN`、または `docs/spec/<normative-file>.md#<slug-heading>` のみを許可します。
- 機能仕様書（Feature Specification）は、次の5節をこの順序で保持します。各節の見出しには英語表記、または括弧内に英語を含む指定の日本語表記を使用します。
  1. `Purpose / Scope` または `目的・対象範囲（Purpose / Scope）`
  2. `Business Rules` または `ビジネスルール（Business Rules）`
  3. `UI / Behavior Contract` または `UI・振る舞い規約（UI / Behavior Contract）`
  4. `Acceptance Criteria` または `受入基準（Acceptance Criteria）`
  5. `Executable Canonical Sources` または `実行可能カノニカルソース（Executable Canonical Sources）`
- `AC` は `Related BR:` または `関連ビジネスルール:` の行を1件のみ保持します。行内のBR IDはバッククォートで囲み、複数のIDがある場合は半角カンマと半角スペースで区切ります。有効なビジネスルール（Active BR）は、対応するACまたは明示的な `Acceptance: N/A` を保持する必要があります。
- NormalモードおよびGray-boxモードにおけるカバレッジの信頼できる唯一の情報源（Coverage SSOT）はCharterであり、Black-box ScoredモードのカバレッジSSOTは `challenge.json.required_coverage` です。ランナー（Runner）は `required_ids` やカバレッジ項目（Coverage Item）の追加・削除・並べ替えを行ってはなりません。
- 指摘事項（Finding）は、機械契約に従う単一かつ不可分の指摘（Atomic Finding）とします。期待動作（Expected）、実際の結果（Actual）、再現手順（Reproduction Steps）、判定基準（Oracle）、役割/シード（Role/Seed）、証拠（Evidence）、再現回数（Reproduction Count）、重要度（Severity）、確信度（Confidence）、既知の仕様乖離（Known Deviation）、提案する回帰テスト層（Suggested Regression Layer）を記録します。複数の問題をまとめた報告は `invalid_non_atomic` として無効化されます。
- 証拠（Evidence）は、`.artifacts/` 配下の生の成果物（raw artifact）を相対パスで参照します。未探索の領域を真陰性（TN: True Negative）としてはならず、観察証拠（Observation Evidence）のない非欠陥（Non-defect）は確定できません。カバレッジ未完了または観察証拠の不足は未実行（NE: Not Executed）として扱います。

## Normal / Gray-boxモードにおける成果物の紐付け

Charterは、`spec_refs`、Role、Seed、Platform、Viewport/Device、リスク（Risk）、ミッション（Mission）、必須カバレッジ（Required Coverage）、ランタイム制御（Runtime Controls）、探索予算（`exploration_budget`）、停止条件（Stop Condition）を定義・固定します。過去の実行回（Run）のCharterを暗黙的に再利用してはならず、現行の仕様、ユーザースコープ（User Scope）、Platform、Role、Seedを都度再検証します。

ランタイムとの最初の対話（Runtime interaction）を行う前に、`working-tree-snapshot.ts` を用いて事前スナップショット（BEFORE Snapshot）を取得し、QA完了後に事後スナップショット（AFTER Snapshot）を取得します。同一の実行回（Run）およびモード（Mode）で比較を行い、`passed: true` かつ `additional_source_diff_count: 0` であることを確認してから指摘事項（Findings）を確定（finalize）します。指摘事項確定後の事前スナップショット取得は許可されません。

## Black-box Scoredモード契約

事前準備（Preparation）処理ではCoding Agentを起動せず、課題検証（Challenge validation）、正解検証（Answer Key validation）、受講者向け安全バンドル（learner-safe Bundle）の作成、使い捨てソース（disposable source）、保護されたパッチ（protected patch）、ベースラインおよびパッチ適用の健全性確認（baseline / patched sanity）、カノニカル成果物マニフェスト（Canonical Artifact Manifest）、ソース非含有の準備済み検証対象（Source-free Prepared Target）、ランナー入力（Runner Input）、隔離ルート（isolated root）、ツールプロファイル（Tool Profile）、禁止プローブ検証（Forbidden Probe）、出力の取り込み（output import）、証拠マッピング（Evidence Mapping）、成果物の凍結（Freeze）、評価（Evaluation）を担当します。Agentセッションの生成、ツールルーティング、再試行、ライフサイクル管理はホスト環境（Host）が担当します。

ホスト機能受領証（Host Capability Receipt）が存在しない場合、必須の証明（required proof）が `proven` でない場合、またはソース非含有の準備済み検証対象を信頼されたURLとして新規セッション（Fresh Session）へ渡せない場合は、公式採点（Official Scored）を開始せず、`BLOCKED / DEFERRED / NOT EXECUTED` として記録します。未取得のホスト側証跡をリポジトリ側で `PASS` へと補完してはなりません。

課題パッチ（Challenge Patch）は、講師専用のUnified Diff（Instructor-only Unified Diff）です。アプリケーションブランチへ適用してコミットしたり、ランナールート（Runner Root）へコピーしたりしてはなりません。パッチ適用前（Pre-patch）の状態で欠陥（Defect）が既に存在する、パッチの適用確認（Patch check）に失敗する、またはパッチ適用後（Post-patch）に再現条件が成立しない場合は、採点実行（Scored Run）を開始しません。

ベンチマーク識別情報（Benchmark Identity）は、`challenge_id + benchmark_revision + runtime_variant_id` で構成されます。同条件での比較を行う際は、準備済み検証対象のハッシュ（Prepared Target hash）、カノニカルランナー入力のハッシュ（Canonical Runner Input hash）、ランナープロファイル（Runner Profile）を加えます。クリーンなコミット済み入力には `git:<40 lowercase hex>`、それ以外にはカノニカルベンチマークマニフェスト入力の `sha256:<64 lowercase hex>` を使用します。

評価器（Evaluator）は凍結された指摘事項（Frozen Finding）を書き換えることなく、独立した別セッションで評価結果（Evaluation）を生成します。`blocked_environment`、隔離性またはツールスコープの障害（Isolation / Tool Scope failure）、ベンチマーク識別情報の不一致（Benchmark Identity Mismatch）が発生した場合は、`valid_for_scoring=false` となります。正解データ（Ground Truth）の変更時には元の実行結果を再採点せず、新たなリビジョンを発行した上で新規の再実行（Fresh Re-run）を行います。測定指標（Metric）は有効な採点実行（valid Scored Run）にのみ適用し、分母が0の場合は `null` とします。

`invalid_non_atomic`、重複（Duplicate）、`TN` / `FP_non_defect` / `NE`、想定外の有効な指摘（Unexpected Valid Finding）を個別に分類し、`invalid_reasons[]` は列挙型（enum）・一意（unique）・辞書順で保存します。`FP_non_defect` は適合率（Precision）のFP（偽陽性）へ一度だけ加算し、環境やハーネス起因の障害（Environment / Harness blocker）は `valid_for_scoring=false` とします。

## リポジトリのハーネス対応表

- 契約検証・ファイル間整合性検証（Contract validation / cross-file validation）: `scripts/agentic-qa/validate-contracts.ts`。
- 受講者向け安全バンドル（Learner-safe Bundle）: `scripts/agentic-qa/build-learner-bundle.ts`。
- 課題の準備と隔離（Challenge preparation and isolation）: `scripts/agentic-qa/prepare-challenge.ts`、`resource-boundary-probe.ts`、`host-capability-gate.ts`。
- ランナー入力と準備済みライフサイクル（Runner input / prepared lifecycle）: `runner-input.ts`、`prepared-runtime-lifecycle.ts`。
- ランタイムスナップショット（Runtime snapshots）: `working-tree-snapshot.ts`。
- 指摘事項の取り込み・公式検証・評価（Findings import / Official verification / evaluation）: `runner-output-import.ts`、`official-verification.ts`、`evaluate.ts`。
- 凍結カノニカル成果物と識別情報（Frozen canonical artifacts and identity）: `canonical-json.ts`、`canonical-artifact-manifest.ts`、`benchmark-revision.ts`。

成果物の詳細な配置構成（artifact layout）、コマンドマッピング、CI統合、採点実装の詳細については、[`docs/reference/agentic-qa-workflow.md`](docs/reference/agentic-qa-workflow.md) を参照してください。ポータブルなワークフロー（Portable workflow）の正本はこの文書ではありません。
