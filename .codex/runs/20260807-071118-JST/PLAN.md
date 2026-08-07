# Plan

## Objective

- 品質ゲートを実行し、発生した全エラーについて今回の変更との影響可能性を調査する。
- 影響可能性がある、または安全にローカル修正できるエラーは、元の作業範囲に関係なく修正して再検証する。
- 今後も「範囲外に見えるエラーを未調査のまま残さない」運用をAGENTS／Repair Loop文書へ記録する。

## Scope

### In

- `pnpm run verify` と、今回のNative変更に直接関係するContract／Native test typecheck。
- 品質ゲートで検出した型、テスト、Lint、Format、Build、静的検証のエラー調査と安全な最小修正。
- `AGENTS.md`、`docs/reference/repair-loop.md`、必要な`docs/PROJECT_CONTEXT.md`の運用文書更新。
- `.codex/runs/20260807-071118-JST/` のPlan／Tasks／Report／Manifest／Evaluation。

### Out

- GitHub Actionsの再実行、Push、Commit、MergeなどのGit／Remote操作。
- 削除、rename、cleanup、秘密情報や個人端末固有情報の追加。
- 原因が不明なままの無制限再試行、または大規模な無関係リファクタリング。

> 「元のPR範囲外」は修正理由にならない。ローカル品質ゲートのエラーは、影響可能性を確認し、安全な最小修正が可能なら本Runの対象に含める。

### Repair allowed files

- `src/presentation/components/confirm-dialog.tsx`
- `src/presentation/components/search-combobox.tsx`
- `src/presentation/pages/admin-product-pages.tsx`
- `src/presentation/pages/product-detail-page.tsx`
- `jest.config.cjs`
- `tests/setup.ts`
- `package.json`
- `pnpm-lock.yaml`
- `AGENTS.md`
- `docs/reference/repair-loop.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/history/2026-08-07_quality-gate-out-of-scope-policy.md`
- `.codex/runs/20260807-071118-JST/**`

テスト追加が根因検証に必要になった場合は、対象テストを特定してからallowed scopeへ明示的に追加する。上記以外のsource変更が必要になった場合は、勝手に拡張せず`needs_human`として停止する。

## Assumptions

- 現在の作業ツリーにはPR #9以前からの変更があるため、既存変更を巻き戻さず、今回の修正対象を個別に確認する。
- `pnpm run verify`は`package.json`の正式品質ゲートであり、途中で停止した場合は停止箇所だけでなく、可能な範囲の関連チェックも別途確認する。
- 物理Androidの主要Flowは直前RunでPASS済みで、今回の初期検証ではコード変更前の品質ゲートを優先する。Nativeソース／Flowを変更した場合のみandroid-native-local-validationの順序で再実機確認する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。ローカルで安全に進められる。
- 仮定してよい細部: 品質ゲートエラーを修正するための型注釈・テスト修正・文書更新はユーザーの明示依頼に含まれる。
- 未回答の重要質問: なし。Remote CIの再実行は別途権限が必要なため実施しない。

## Hypotheses

- H1: 既知の全体typecheck 6件のimplicit-anyが`pnpm run verify`の最初の停止要因である。
- H2: 型エラーを修正すると、後続のTest／Build／静的検証で追加のエラーが現れる可能性がある。追加エラーも同じ因果調査ルールで扱う。
- H3: 今回の運用ルールはAGENTSとRepair Loopの「既存／範囲外」扱いを補強することで、次回以降も再現できる。

## Research Plan

- Round 1 Query: 正式`verify`を実行し、各停止エラーを収集する。並行して既知エラーの原因、関連テスト、変更差分の影響範囲をread-only subagentで調査する。
- Round 2 Query: 修正後に`verify`を再実行し、残った失敗をカテゴリ化してbounded repairする。Native変更へ影響があればNative skillのDoctor／Test／Suite順序で再検証する。
- Exit Criteria:
  - 品質ゲートが成功する、または残った失敗について原因・影響評価・安全な次アクションが明記される。
  - 変更範囲が宣言したallowed scope内である。
  - 運用ルール、Run Artifact、評価、最終検証が整合している。

## Approach

1. Baseline品質ゲートを実行する。
2. Findingsを`must_fix`／`should_fix`／`defer`／`needs_human`へ分類し、各iterationのallowed filesを宣言する。
3. 影響可能性を調査して最小修正する。範囲外でも安全な修正対象なら扱う。
4. 対象テスト、正式`verify`、必要なNative検証を再実行する。
5. 運用ルールと実績を文書化し、Run ArtifactをSanitizeして終了判定する。

## Definition of Done

- 品質ゲートの全実行結果が記録されている。
- 検出エラーを修正済み、または原因・影響・未実行理由・次アクションが明記されている。
- 「範囲外に見えるエラーも影響可能性を調査し、修正可能なら対応する」規約が文書化されている。
- Format、Lint、Typecheck、Tests、Build／静的検証、必要なNative検証が最新差分に対して確認されている。
- Run ArtifactのPath Sanitization Write＋CheckがPASSしている。

## Risks / Unknowns

- 既存dirty変更との因果境界が曖昧になり得る。Baseline、差分、ファイル単位の変更履歴で切り分ける。
- 型注釈の追加が実行時挙動を変える可能性がある。型の定義元と関連テストを確認してから修正する。
- Native／Remote検証は環境・権限に依存する。未実行をPASS扱いせず、Run Artifactへ分離して記録する。

## Thinking Log

- 2026-08-07: ユーザーの依頼により、品質ゲートは「PR範囲内だけ」の確認ではなく、検出したエラーが変更の影響を受けている可能性を調査する入口として扱う。安全なローカル修正は範囲外でも対応し、修正不能なものだけ明示的に残す方針とした。
