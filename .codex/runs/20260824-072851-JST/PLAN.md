# Durable Report作成計画

## Objective

- 完了済みRepository全体調査Run `20260823-225103-JST` とCurriculum妥当性Review Run `20260824-063354-JST` の成果を、後続Agentが単独参照できる2件のdurable reportへ再構成する。
- Run Artifactは実行履歴・判断経緯として維持し、Reportは完成済みの調査・Review成果物として役割を分離する。

## Current understanding

- 2件の調査・Reviewは完了済みであり、再調査や新しいCurriculum判断は今回の目的ではない。
- `docs/reports/`への保存はユーザーが明示的に要求している。
- PR #53は`main`をbase、`research/curriculum-test-strategy-refactor-audit`をheadとしてOpenであり、現在のBranchへ追加すれば同PRへ反映される。
- 既存Reportは上書きせず、JST timestamp付きの新規2ファイルを作成する。

## Assumptions

- Report作成時刻は実際のJSTを使用し、2件は同一秒でなくてよい。
- Native Required/OptionalはCurriculum変更時にDecision A/Bを確定する未決事項とし、Optionalを既決事項へ昇格させない。
- 元Runでユーザー回答により解決したQ1〜Q7はRepository Audit ReportでResolved Assumptionsとして扱う。

## Non-goals

- Repository全体調査、Curriculum Review、Test Strategy Review、Refactoring Reviewの再実施。
- Product、Test、Curriculum、Specification、CI/Workflow、package/config/lockfile、既存Reportの変更。
- Findingの修正、Curriculum変更Plan、Product/Test refactoring。

## Impacted areas

- 新規 `docs/reports/*.md` 2件。
- 新規 `.codex/runs/20260824-072851-JST/` 標準Artifact 4件。
- 同一Branchへのcommit/pushとPR #53の更新。

## Files to inspect

- `.codex/runs/20260823-225103-JST/{PLAN,TASKS,REPORT,run.json}`
- `.codex/runs/20260824-063354-JST/{PLAN,TASKS,REPORT,run.json}`
- 前回Runが参照したCurriculum、Spec、Test、CI、Hotspot、ADR、Plan Evidence。
- `docs/reports/README.md`、Markdown lint/format contract、sanitizer。

## Change strategy

1. 既存Runの最終判断・Evidence・未解決事項を抽出し、再調査せずsource-of-recordを固定する。
2. Repository Audit Reportを指定8 sectionとTraceability/Hotspot inventoryへ再構成する。
3. Curriculum Validity Reviewを指定14 sectionへ再構成し、Native Decision A/Bを明示する。
4. file/line/symbol/spec/test/workflow referenceをcross-checkし、Report単独で理解できる状態にする。
5. Markdown lint、local absolute path scan、Run sanitizer、Git diff scopeを検証する。
6. 標準ArtifactとReportだけをcommit/pushし、PR #53を更新する。

## Validation plan

- RepositoryのMarkdown lint commandを確認して2 Reportと新Run Artifactへ実行する。
- `scripts/sanitize-codex-artifacts.ps1`を新RunへWrite/Checkする。
- `rg`でReport内のWindows absolute path、file scheme、ユーザーhome pathを検査する。
- `git diff --check`と`git status --short`でwhitespaceと変更Scopeを確認する。
- 依存関係が利用可能な場合だけRelevant Validationを実行し、未利用なら理由を記録する。
- commit/push後にPR #53のfiles/head SHA/statusを確認する。

## Risks

- Runの進捗ログをそのまま複製するとReport単独性を満たさないため、主張・Evidence・分類へ再構成する。
- 行番号がCurrent Branchでずれる可能性があるため、重要Referenceは元fileで再確認する。
- Technical Debt候補をFindingへ昇格させない。ClassificationをFACT/MISMATCH/GAP/DUPLICATION/COMPLEXITY/QUESTION/CANDIDATEで維持する。
- Reportが大きくなるため、表の可読性と主張の重複を自己Reviewする。

## Open questions

- Blocking questionなし。ユーザーが既存Evidenceと明示方針で最後まで進めるよう指示している。

## Follow-up notes

- 本作業は完成成果物の保存であり、3つの後続Review自体は実施しない。
- `docs/plans/`はユーザー指定Scope外のため追加せず、本Planを標準Run Artifactへ保存する。

## Definition of Done

- 指定名の新規Report 2件が存在し、単独で後続作業へ引き継げる。
- 指定section、重要Evidence、Hotspot、Traceability、Mismatch/Gap、Resolved Assumptionsが欠落しない。
- Native Optionalを既決事項として記載しない。
- ValidationとScope確認が完了し、同一Branchへcommit/pushされ、PR #53に反映される。

## Thinking Log

- 2026-08-24 07:28 JST: 複雑なdurable artifact作成のため`feature-plan` Skillを使用する。ユーザーの明示Scopeを優先し、計画は新Run内へ保存する。
- 2026-08-24 07:28 JST: 過去Runは変更せずProvenanceとして参照し、Reportへ完成成果を再構成する。
- 2026-08-24 07:54 JST: 2 Reportを全指定sectionへ再構成し、Native Decision A/B、C01〜C12、P1/P2全Lesson、Risk 16件、Hotspot、Traceability、Resolved Assumptionsをcross-checkした。変更Scopeは新Runと新Report 2件だけである。
- 2026-08-24 08:00 JST: Local documentation validationを全件PASSし、content commitを既存Branchへpushした。PR #53がOPENでReport 2件と新Runを含むことを確認し、PR本文をdurable reportの役割とCurrent validationへ更新した。
