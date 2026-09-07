# Plan

## Objective

- PR #126のレビュー指摘である`feature-plan` deterministic graderのfence opener境界によるrequired H2 false-passを、既存Planの仕様を変えずに修正する。
- 修正、Test Cへの境界ケース統合、指定Validation、commit、non-force push、PR本文の最小追記まで完了する。

## Scope

- In: `.agents/skills/feature-plan/scripts/validate-plan-output.ts`、`tests/contracts/skill-output-eval.test.ts`、必要なRun Artifact、PR #126の現在の状態欄。
- Out: 正本Planのsemantic変更、Product Code / Runtime、dependency / lockfile、workflow、`.codex/agents/**`、N/A Skill、exploratory-qa validator、generic Markdown parser。

## Assumptions

- 正本Plan Section 5のfence opener / closer / H2仕様を変更せず、実装を既存仕様へ合わせる。
- 前回のPR head `6f516e31a6d558856fb5df3a32320b4af2cef705`から作業を開始し、既存PRを更新する。

## Questions / Ambiguity

- 必ず質問する不透明点: なし。
- 仮定してよい細部: mixed marker文字はmarker列ではなくinfo stringの先頭として扱うregex分離方法。
- 未回答の重要質問: なし。

## Hypotheses

- H1: 現行の`[`~]{3,}`がmarker列をgreedyに取得するため、反対側markerで始まるinfo stringをmixed markerとして拒否し、fence内H2がfalse-passする。
- H2: `(`{3,}|~{3,})`相当へ限定すれば、marker列とinfo stringを分離し、既存closer仕様を維持したまま両境界ケースを防止できる。

## Research Plan

- Round 1 Query: 現行grader、Test C、正本Plan Section 5を確認し、修正前false-passを一時実行で再現する。
- Round 2 Query: regex最小修正を適用し、既存Test Cへbacktick / tildeのmixed-marker-starting-info-stringを統合して、既存境界保証を再検証する。
- Exit Criteria:
  - 主要仮説ごとに支持/反証の根拠がある
  - 未解決論点に次アクションがある

## Approach

- 修正前に一時`tsx -e`実行で両false-passを確認し、成果物へ残さない。
- `parseFenceMarker()`のmarker captureだけを同一markerのalternationへ変更し、既存strict TypeScript guardを維持する。
- 既存parameterized Test Cへinfo string先頭が反対側markerのケースを統合し、Test A〜G、typecheck、verify、whitespace、sanitizerを指定順で実行する。
- 標準フロー: `PLAN -> TASKS -> 実行 -> REPORT`

## Definition of Done

- backtick opener + `~` info string、tilde opener + backtick info stringを認識する。
- fence内required H2を存在扱いせず、既存closer / recovery / LF / CRLFケースを維持する。
- targeted test、typecheck、`pnpm run verify`、commit後`git diff --check main...HEAD`、sanitizerがPASSする。
- 許可範囲外の変更がなく、non-force push、PR本文更新、working tree cleanを確認する。

## Risks / Unknowns

- regex変更がcloserのsuffix判定や既存Test Cのmarker長判定へ影響するリスクがあるため、対象テストと全体gateで確認する。
- CI / hostの一過性失敗が再発した場合は、同じ条件を盲目的に反復せず、最初の異常とbaselineを切り分ける。

## Thinking Log

- 2026-09-07 21:15 JST: 対象branchとPR headを確認し、working treeはcleanだった。レビュー指摘は明確なcorrectness / contract failureで、allowed filesも明示されているため`must_fix`としてbounded repairを開始する。
- 2026-09-07 21:15 JST: 現行実装で` ```~text`および`~~~`text`を含む出力を一時評価し、いずれも`valid: true` / `missingHeadings: []`となるfalse-passを再現した。修正前挙動の確認はコマンド出力のみで、fixtureやdebug codeは保存しない。
