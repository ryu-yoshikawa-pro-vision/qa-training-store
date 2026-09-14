# Plan

## Objective

- PR #146のHook trust運用不足を、現在のCodex Hooks公式仕様に整合する日本語文書として補完する。
- project `.codex/` trust、個々の非managed Hook定義trust、実runtime配送確認の境界を利用者が誤解しない状態にする。

## Scope

### In

- `docs/reference/codex-safety-harness.md`へHook trust運用の正本を追加する。
- `docs/reference/codex-implementation-harness.md`へ正本への短い参照を追加する。
- `.codex/runs/20260914-095503-JST/`の標準Run ArtifactをRepository規約に従って保存する。

### Out

- Hook source、launcher、`.codex/config.toml`、contract test、CI、wrapper、verify、production文章品質rule、`SessionStart`、Issue #135依存部分。
- 新しいtrust管理script、診断framework、大規模runbook、Hook runtime canary。
- PRのmerge／close、Issue #134のclose、branch削除、force push。

## Assumptions

- 対象branchとPR #146のheadはレビュー済み `6b8bfddf377423646608fb60cf62b3cae8ffb76b` のままである。
- Issue #135はOPENであり、compact後のroot `AGENTS.md`再注入は今回も実装しない。
- production文章品質ruleは既存の `{"version":1,"status":"not-configured","rules":[]}` を維持する。
- 公式仕様の確認日である2026-09-14時点の記載を採用し、ユーザー固有の絶対pathやtrust内部保存データは文書へ書かない。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。依頼された対象、内容、禁止範囲、完了条件が明確である。
- 仮定してよい細部: 既存文書の `Hook guard` 直後を正本節の位置とし、implementation harnessは詳細を複製せず参照だけにする。
- 未回答の重要質問: Windows実Codex runtime canaryの実行結果は未確認のまま維持する。今回canaryは実行しない。

## Hypotheses

- H1: 既存の `Hook guard` とwrapper説明の近くへ、project trustとHook定義trust、`/hooks`、`CODEX_HOME`、更新時再レビュー、runtime境界を一つの正本節として追加すれば、運用不足を補完できる。
- H2: 公式Hooks仕様の「project-local layer trust」「current hash」「untrusted hook skip」「`/hooks`」「one-off bypass」だけを根拠にすれば、独自のtrust管理や自動診断を追加せずに必要契約を説明できる。
- H3: 全体verifyのintegration並列実行は、文書差分と無関係な既存many-products testの10秒境界を環境負荷で超える可能性がある。testやtimeoutを変更せず、直列integrationで再現性を切り分ける。

## Research Plan

- Round 1 Query: branch、作業tree、PR／Issue／#135、CLI version、既存文書、直近Run、公式Hooks／environment variables仕様を確認する。
- Round 2 Query: 変更後の文書を公式仕様と照合し、既存文書contractとformat／Markdown／text／verifyへ接続する。
- Exit Criteria:
  - H1/H2を支持するRepositoryと公式仕様の根拠がある。
  - `codex-safety-harness.md`がtrust運用のSSOTで、implementation harnessが詳細を重複しない。
  - 禁止対象の差分がなく、指定品質ゲートと最新PR headの必須CIを確認する。

## Repair Loop Record

- `iteration_number`: 1
- `input_findings`: PR #146の全体レビューで指摘されたproject-local Hook trust運用文書不足。
- `classification`: `must_fix`（安全な実行前確認と非managed Hookのtrust境界に関する運用契約の欠落）。
- `repair_plan`: 公式仕様を根拠に、2つの既存referenceへ最小限の文書追加を行う。
- `allowed_files`: `docs/reference/codex-safety-harness.md`, `docs/reference/codex-implementation-harness.md`, `.codex/runs/20260914-095503-JST/**`
- `expected_changed_files`: 上記2文書と標準Run Artifactのみ。
- `validation_commands`: `corepack pnpm run format:check`, `corepack pnpm run lint:markdown`, `corepack pnpm run lint:text`, `git diff --check`, `corepack pnpm run verify`（Repository完了条件として実行）。
- `remaining_delta`: 公式仕様照合、ローカル検証、commit／push、PR本文更新、最新headのWeb CI／Mobile App CI確認。
- `decision`: `continue`

## Approach

1. 現在の公式仕様と既存文書の責務を照合する。
2. `codex-safety-harness.md`へ、指定された確認手順・更新時運用・トラブルシュート順・runtime境界を追加する。
3. `codex-implementation-harness.md`から正本へ辿れる参照だけを追加する。
4. 禁止対象を含む差分を確認し、Run Artifactをsanitizeしてから指定検証を実行する。
5. branch safetyを再確認してcommit／通常pushし、PR本文を更新する。
6. 最新PR headの必須CIを確認し、PRがOPENであることを再確認する。

## Definition of Done

- 2つの指定文書に必要なHook trust運用があり、詳細は正本へ集約されている。
- project trustとHook definition trust、contract PASSと実runtime配送確認を明確に区別している。
- `/hooks`のinteractive操作、同一 `CODEX_HOME`、Git更新後の再レビュー、Hook不動時の確認順序を記載している。
- `--dangerously-bypass-hook-trust`をwrapperや通常運用へ追加していない。
- #135、production rule、Windows runtime canaryの状態を変更していない。
- format／Markdown lint／text lint／diff check／必要なverifyがPASSする。
- commit／通常push、local／remote／PR head確認、PR本文更新、Web CI／Mobile App CI success確認が完了し、PR #146をOPENのまま維持する。

## Risks / Unknowns

- Codex Hooks仕様はCLI／公式文書の更新で変わり得るため、確認日と公式URLを記載する。
- 実Codex runtimeでのevent dispatchは文書・contract testだけでは証明できないため、Windows実Codex runtime canaryは未確認と明記する。
- 文書lintが既存の日本語・コード識別子表記へ制約を持つ可能性がある。失敗時は文書の意味を削らず最小修正する。

## Thinking Log

- 2026-09-14: 既存PR headと作業treeは一致しており、前回のHook実装変更はレビュー済みである。今回の追加指示は文書不足という明確な修復信号であり、Hook実装を再変更しないbounded repairとする。
- 2026-09-14: 公式Hooks仕様は、project-local Hookの読み込みにproject `.codex/` layer trustを要求し、non-managed Hookのcurrent hash trust、`/hooks`でのreview、未trust時skip、外部検証済みone-off automation向けbypassを明記している。これを文書の根拠とする。
- 2026-09-14: 一時Corepack shim経由の全体verifyは、先行工程を通過した後に`tests/integration/seeds.test.ts`のmany-products 10秒timeoutで停止した。対象testとsourceに差分はなく、直列integration全体は111/111 PASSしたため、文書scope内の修正対象とはせず、exact verifyは未PASSの環境残件として記録する。
