# Agentic QAとScenario Shopの統合

## 目的と責任分担

この文書は、ポータブルな[`exploratory-qa` Skill](../../.agents/skills/exploratory-qa/SKILL.md)に対するScenario Shop固有のアーティファクト構成、具体的なスキーマの関連付け、バリデータと事前準備処理の対応関係、および採点統合の仕様を定義します。

- ポータブルなモード選択、チャーター（Charter）、カバレッジ（Coverage）、バジェット（Budget）、停止条件（Stop）、エビデンス（Evidence）、検出事項（Finding）、ファイナライズ（finalization）の定義や意味付けは、パッケージローカルのリファレンスで規定します。
- `QA_AGENT.md` は、リポジトリにおける実行責任とマシンコントラクト（Machine Contract）の境界を管理します。
- `scripts/agentic-qa/**` は、決定論的な事前準備、検証、隔離環境での検証、アーティファクトの整合性確認、評価（evaluation）、およびスコアリング（scoring）を担当します。Coding Agentの起動（launch）、ラッピング、オーケストレーション、リトライ、プロセス管理などは行いません。
- 正式な製品仕様（Normative Product Specification）の正本は `docs/spec/` です。

## リポジトリのアーティファクト構成

```text
docs/spec/                         正式な仕様書および補助文書
training/agentic-qa/challenges/   受講者向けに安全化されたチャレンジ課題とランブック
training/agentic-qa/instructor/   模範解答（Answer Key）とパッチ（講師専用）
training/agentic-qa/skills/        ハッシュ検証済みの採点用スキルスナップショット
training/agentic-qa/tool-profiles/ 採点用ツールプロファイル
.codex/runs/<run_id>/              永続化対象のチャーター、検出事項（Findings）、評価結果
.artifacts/                        生のエビデンス（raw evidence）および使い捨てランタイムデータ
```

NormalモードおよびGray-boxモードでは、`.codex/runs/<run_id>/qa-charter.json`、候補版（candidate）および確定版（final）の `qa-findings.json`、ならびに同一実行（Run）のワーキングツリースナップショットを使用します。Black-box入力では、隔離されたアーティファクトチェーンのチャレンジディレクトリ、受講者向け安全バンドル（learner-safe Bundle）、ランブック、ハッシュ検証済みの `training/agentic-qa/skills/scored-v1.md` スナップショット、標準ランナー入力（Canonical Runner Input）、およびソースコード非含有の準備済みテスト対象（Source-free Prepared Target）を使用します。

生のスクリーンショット、トレース、ADBログ、MCPログなどの生データは `.artifacts/` 配下に保存します。永続化する実行アーティファクト（Run Artifact）には、リポジトリ相対パスによる概要情報のみを含めます。

## マシンコントラクトと検証の対応関係

- JSONおよびZodスキーマ定義: `scripts/agentic-qa/contracts.ts`
- ファイル間および実行アーティファクトの検証: `scripts/agentic-qa/validate-contracts.ts`
- 仕様参照の構文チェックとオーナー解決: `scripts/agentic-qa/spec-refs.ts`
- カバレッジの整合性検証: `scripts/agentic-qa/coverage.ts`
- 受講者向け安全バンドルの生成: `scripts/agentic-qa/build-learner-bundle.ts`
- 正規化JSON（Canonical JSON）とアーティファクト同一性（identity）の管理: `canonical-json.ts`、`canonical-artifact-manifest.ts`
- ワーキングツリースナップショットとソース差分の比較: `working-tree-snapshot.ts`
- ランタイムとリソースの境界検証: `resource-boundary-probe.ts`、`isolation.ts`
- ホストエビデンスのゲート判定: `host-capability-gate.ts`

すべてのJSONファイルは `schema_version: 1` を保持します。NormalおよびGray-boxモードの `spec_refs[]` には、`BR-<AREA>-NNN`、`AC-<AREA>-NNN`、または `docs/spec/<normative-file>.md#<slug-heading>` の形式を指定できます。無効な参照が存在する場合やファイル間検証でエラーが発生した場合は、事前検証の段階で実行失敗（pre-execution failure）として扱われます。

## Normal / Gray-boxモードの具体的な関連付け

対象の実行（Run）では、既存のZodコントラクトに従って `.codex/runs/<run_id>/qa-charter.json` を生成または検証します。ここでは `spec_refs[]`、ミッション、想定リスク、ロール、シード値、プラットフォーム、ビューポートまたはデバイス、必須カバレッジ、許可された操作コントロール、探索バジェット（`exploration_budget`）、および停止条件を関連付けます。

ランタイムとの最初のインタラクションを行う前に、事前スナップショット（BEFORE Snapshot）を取得します。

```text
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --phase before
```

ランタイムでのQA完了後に候補版の `qa-findings.json`（candidate）を作成し、事後スナップショット（AFTER Snapshot）を取得した上で、同一の実行およびモード（Run / Mode）で両スナップショットを比較します。

```text
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --phase after
pnpm exec tsx scripts/agentic-qa/working-tree-snapshot.ts --run-dir .codex/runs/<run_id> --mode normal --before .codex/runs/<run_id>/working-tree-snapshot-normal-before.json --after .codex/runs/<run_id>/working-tree-snapshot-normal-after.json
```

比較結果の `passed` が true であり、かつ `additional_source_diff_count` が 0 の場合にのみ、検出事項（Findings）を確定します。NormalおよびGray-boxモードの出力では `charter_id` と `working_tree_snapshot` を設定し、Challenge、Benchmark Revision、Runtime Variant、Runner Profile はそれぞれ null とします。

## Black-boxモードの準備対応

`prepare-challenge.ts` は、マシンコントラクト、チャレンジ課題、保護対象パッチ（protected Patch）、受講者向け仕様バンドル（learner-safe specification Bundle）、使い捨てソース（disposable source）、ベースラインおよびパッチ適用後のサニティチェック、決定論的リセット、ソース非含有の準備済みテスト対象（Source-free Prepared Target）、正規アーティファクトマニフェスト（Canonical Artifact Manifest）、ランナー入力、隔離ルート（isolated root）、ツールプロファイル、禁止プローブ（Forbidden Probe）、およびホストハンドオフを順次検証します。このスクリプト内ではエージェントセッションの開始は行いません。

保護対象パッチ（protected Patch）は講師（Instructor）専用です。使い捨ての複製環境に対して `git apply --check` を実施した後に `git apply` で適用し、アプリケーションブランチへのコミットや、ランナーから参照可能な入力（Runner-visible input）へのコピーは一切行いません。

事前準備の実行順序はコントラクトテストによって厳密に固定されています。

```text
machine_contract_challenge_spec_validation
→ protected_patch_validation
→ learner_safe_specification_bundle_benchmark_identity
→ disposable_source_dependency_preparation
→ baseline_build_pre_patch_sanity
→ patch_apply
→ patched_build_post_patch_sanity
→ scored_initial_state_deterministic_reset_sanity
→ source_free_prepared_target_copy_hash_validation
→ learner_safe_runner_input_skill_runbook_output_contract_freeze
→ isolated_runner_root_from_frozen_input
→ repository_forbidden_boundary_preflight
→ disposable_source_cleanup
→ host_trusted_runtime_capability_handoff
```

ホスト機能証明（Host Capability Receipt）の欠落、未証明の必須エビデンス（required evidence）、信頼済みURL（trusted URL）の不足、前提条件の失敗、パッチ検証（Patch check）の失敗、パッチ適用後の不具合再現性（post-patch reproduction）の欠落のいずれかが発生した場合は、公式採点実行（Official Scored Run）を開始しません。その際は状態を `BLOCKED / DEFERRED / NOT EXECUTED` として記録し、リポジトリ側の決定論的な準備が完了していない状態のまま公式採点実行へと昇格させることはありません。

## ランナー、エバリュエーター、および同一性（Identity）の対応関係

- ランナーのライフサイクルと制約付き出力管理: `runner-input.ts`、`prepared-runtime-lifecycle.ts`、`runner-output-import.ts`
- 公式検証と信頼境界（Trust Boundary）の制御: `official-verification.ts`、`host-capability-gate.ts`、`resource-boundary-probe.ts`
- 独立した評価（evaluation）とスコアリング（scoring）: `evaluate.ts`
- ベンチマークリビジョンと同一性（Identity）管理: `benchmark-revision.ts`、`canonical-artifact-manifest.ts`

ランナー（Runner）とエバリュエーター（Evaluator）は完全に分離された別セッションとして実行されます。エバリュエーターはランナーの検出事項（Runner Findings）を凍結（freeze）し、模範解答（Answer Key）をエバリュエーター側のみで読み込んだ上で、`evaluation.json` を出力します。環境のブロック（`blocked_environment`）、隔離やツールスコープの障害（Isolation / Tool Scope failure）、ベンチマーク同一性の不一致（Benchmark Identity mismatch）が認められる場合は、`valid_for_scoring=false` を設定します。正解データ（Ground Truth）を変更する場合は、新たなベンチマークリビジョンを発行し、最初からのクリーンな再実行（Fresh Re-run）を行う必要があります。

`invalid_non_atomic`（非アトミックな無効値）、重複（Duplicate）、`TN` / `FP_non_defect` / `NE`、および予期せぬ有効な検出事項（Unexpected Valid Finding）は、それぞれ独立した評価分類（evaluation分類）として扱われます。`invalid_reasons[]` には定義済みの列挙型（enum）の値のみを格納し、重複を排除して辞書順でソートして記録します。`FP_non_defect`（欠陥以外の偽陽性）は適合率（Precision）の計算に1回のみ計上し、環境やテストハーネスのブロッカーが存在する場合は `valid_for_scoring=false` の判定を維持します。

クリーンにコミット済みの入力（Clean committed input）には `git:<40文字の小文字16進数>` を識別子として使用します。未コミットまたは変更が混在した入力には、Runtime VariantおよびRunner Profileを除外した正規ベンチマークマニフェスト入力（Canonical Benchmark Manifest Input）の `sha256:<64文字の小文字16進数>` を使用します。ベンチマーク同一性（Benchmark Identity）は `challenge_id + benchmark_revision + runtime_variant_id` の組み合わせで定義されます。なお、同一条件での比較を行うためには、準備済みテスト対象のハッシュ（Prepared Target hash）、ランナー入力のハッシュ（Runner Input hash）、およびランナープロファイル（Runner Profile）の一致も必須です。

メトリクスは、有効と判定された採点実行（Scored Run）にのみ適用されます。

```text
Recall = TP / (TP + FN)
Precision = TP / (TP + FP)
False Positive Rate = FP_non_defect / (FP_non_defect + TN)
Coverage = completed_required_coverage_items / required_coverage_items
```

計算時の分母が 0 となる場合の指標値は `null` とします。また、人間による判定（adjudication）や正解データ（Ground Truth）の更新を理由に、凍結済みの検出事項（Frozen Findings）を直接書き換えることは禁止されています。

静的サーバーにおける `Sec-Fetch-Dest` ヘッダーの検証は多層防御におけるブラウザUXの補助情報にすぎず、セキュリティ境界（Security Boundary）としては機能しません。セキュリティの正本としては、ホスト信頼のツール隔離（Host-trusted Tool Isolation）と、ランタイムリソースに対する実際のネガティブプローブ検証を基準とします。

## CIとリポジトリの参照関係

CIの `style-quality` ジョブでは、`pnpm run validate:spec` とリポジトリのコントラクトテストを実行します。最終検証コマンドである `pnpm run verify` には、ユニット、統合、リポジトリ、コンポーネント、コントラクト、ビルド、セキュリティのすべての品質ゲートが含まれます。仕様変更による影響概要は `scripts/spec/summarize-impact.ts` を用いて集計し、既存のCIステップサマリー（step summary）へ出力します。

補助リファレンスである [`run-artifacts.md`](run-artifacts.md) では、より広範な実行アーティファクト（Run Artifact）の構成を定義しています。探索的QAの振る舞いに関するポータブルな定義の正本は、引き続きパッケージローカルのワークフロー文書（package-local workflow）のみとなります。