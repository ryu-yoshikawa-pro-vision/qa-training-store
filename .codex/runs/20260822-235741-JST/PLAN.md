# Plan

## Objective

- PR #45のRemote Expo Doctor Evidenceにある「6件」という事実誤認を、実ログの7パッケージへ訂正する。

## Scope

- In:
  - `docs/PROJECT_CONTEXT.md`
  - `.codex/runs/20260822-222125-JST/evaluation.json`
  - `.codex/runs/20260822-222125-JST/REPORT.md`へのappend-only訂正追記
  - 今回修正のRun Artifact
- Out:
  - Workflow、validator、Contract Test、Maestro、package／lockfile
  - Expo dependency update
  - `docs/history/2026-08-22_230145_g1-cli-connection-repair.md`

## Assumptions

- 実CIログの正しいEvidenceは、`@expo/metro-runtime`、`expo`、`expo-build-properties`、`expo-constants`、`expo-dev-client`、`expo-linking`、`expo-router`の7件、および`7 packages out of date.`である。
- 既存REPORTの過去記録は履歴として保持し、末尾追記だけで訂正する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし
- 仮定してよい細部: 既存のG1 PASS結果と`result: partial`等の評価値は変更しない。
- 未回答の重要質問: なし

## Hypotheses

- H1: 現在のliving documentationとevaluation.jsonに6件の一覧が残っている。
- H2: Evidenceのみの訂正なので、既存Remote Native CIの再実行は不要である。

## Research Plan

- Round 1 Query: 対象3ファイルとhistory、既存Runを確認して誤記箇所と変更境界を確定する。
- Round 2 Query: JSON／Markdownの構文・format・diff・sanitizerを検証する。
- Exit Criteria:
  - 正しい7件一覧と`7 packages out of date.`が記録される
  - REPORT既存行が変更されず、訂正が末尾へ追記される
  - 実装コードと依存ファイルに差分がない
  - 指定品質ゲートがPASSする

## Approach

- 対象ファイルを最小差分で編集し、Remote CIは再実行せず、既存Actual APK／G1 PASS Evidenceを保持する。

## Definition of Done

- `PROJECT_CONTEXT.md`、対象evaluation、対象REPORTだけがEvidence訂正として変更される。
- Expo Doctor対象が7件（`expo`を含む）と実ログ表現に一致する。
- markdownlint、format、JSON構文、`git diff --check`、Run Artifact sanitizerがPASSする。

## Risks / Unknowns

- REPORTのappend-only契約を破るリスクがあるため、既存行は変更せず末尾追記とする。
- 新しいRun Artifactが標準手順上追加されるが、source scopeには含めず、sanitizer対象として保存する。

## Thinking Log

- 2026-08-22 JST: findingはEvidenceの個数・一覧の不整合のみ。G1 implementation／validation resultは変更対象外と確定した。
